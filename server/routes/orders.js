/**
 * 订单路由
 */
const express = require('express');
const db = require('../database/connection');
const { authenticate } = require('../middleware/auth');
const { validateCreateOrder } = require('../middleware/validate');

const router = express.Router();

// 生成订单号
function generateOrderNo() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD${dateStr}${random}`;
}

// GET /api/orders - 获取用户订单列表
router.get('/', authenticate, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status;
    
    let whereClause = 'WHERE user_id = ?';
    const params = [req.user.id];
    
    if (status) {
        whereClause += ' AND status = ?';
        params.push(status);
    }
    
    const total = db.prepare(`SELECT COUNT(*) as count FROM orders ${whereClause}`).get(...params).count;
    
    const orders = db.prepare(`
        SELECT * FROM orders 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    
    // 获取每个订单的商品
    const ordersWithItems = orders.map(order => {
        const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
        return {
            ...formatOrder(order),
            items: items.map(formatOrderItem)
        };
    });
    
    res.json({
        orders: ordersWithItems,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    });
});

// GET /api/orders/:id - 获取订单详情
router.get('/:id', authenticate, (req, res) => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
        .get(req.params.id, req.user.id);
    
    if (!order) {
        return res.status(404).json({ error: '订单不存在' });
    }
    
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    const shipment = db.prepare('SELECT * FROM shipments WHERE order_id = ?').get(order.id);
    
    res.json({
        order: {
            ...formatOrder(order),
            items: items.map(formatOrderItem),
            shipment: shipment ? formatShipment(shipment) : null
        }
    });
});

// POST /api/orders - 创建订单
router.post('/', authenticate, validateCreateOrder, (req, res) => {
    const { items, recipient_name, recipient_phone, recipient_country, recipient_city, recipient_address, recipient_postal, notes, currency } = req.body;
    
    // 计算订单金额
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const serviceFeeRate = req.user.level === 'svip' ? 0.05 : req.user.level === 'vip' ? 0.08 : 0.08;
    const serviceFee = Math.round(subtotal * serviceFeeRate * 100) / 100;
    
    // 获取运费
    const shippingRule = db.prepare('SELECT * FROM shipping_rules WHERE country = ? AND is_active = 1')
        .get(recipient_country);
    const shippingFee = shippingRule ? shippingRule.first_price : 50;
    
    const total = subtotal + serviceFee + shippingFee;
    
    // 创建订单
    const orderNo = generateOrderNo();
    const orderResult = db.prepare(`
        INSERT INTO orders (
            order_no, user_id, subtotal, service_fee_rate, service_fee, 
            shipping_fee, total, currency, recipient_name, recipient_phone,
            recipient_country, recipient_city, recipient_address, recipient_postal,
            notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
        orderNo, req.user.id, subtotal, serviceFeeRate, serviceFee,
        shippingFee, total, currency || 'CNY', recipient_name, recipient_phone,
        recipient_country, recipient_city, recipient_address, recipient_postal,
        notes
    );
    
    const orderId = orderResult.lastInsertRowid;
    
    // 添加订单商品
    const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, source_site, source_url, title, image_url, shop_name, price, quantity, specs, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    items.forEach(item => {
        insertItem.run(
            orderId, item.source_site, item.source_url, item.title,
            item.image_url, item.shop_name, item.price, item.quantity || 1,
            item.specs, item.notes
        );
    });
    
    // 更新用户累计消费
    db.prepare('UPDATE users SET total_spent = total_spent + ? WHERE id = ?')
        .run(total, req.user.id);
    
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
    
    res.status(201).json({
        message: '订单创建成功',
        order: {
            ...formatOrder(order),
            items: orderItems.map(formatOrderItem)
        }
    });
});

// PUT /api/orders/:id/cancel - 取消订单
router.put('/:id/cancel', authenticate, (req, res) => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
        .get(req.params.id, req.user.id);
    
    if (!order) {
        return res.status(404).json({ error: '订单不存在' });
    }
    
    // 只有待处理的订单可以取消
    if (order.status !== 'pending') {
        return res.status(400).json({ error: '该订单无法取消' });
    }
    
    db.prepare("UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(order.id);
    
    // 如果已支付，需要退款处理
    const payment = db.prepare("SELECT * FROM payments WHERE order_id = ? AND status = 'paid'").get(order.id);
    if (payment) {
        db.prepare("UPDATE payments SET status = 'refunded' WHERE id = ?").run(payment.id);
    }
    
    res.json({ message: '订单已取消' });
});

// GET /api/orders/:id/track - 追踪物流
router.get('/:id/track', authenticate, (req, res) => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
        .get(req.params.id, req.user.id);
    
    if (!order) {
        return res.status(404).json({ error: '订单不存在' });
    }
    
    const shipment = db.prepare('SELECT * FROM shipments WHERE order_id = ?').get(order.id);
    
    if (!shipment) {
        return res.json({ tracking: null, message: '暂无物流信息' });
    }
    
    res.json({
        tracking: formatShipment(shipment)
    });
});

// ==================== 格式化函数 ====================

function formatOrder(order) {
    return {
        id: order.id,
        orderNo: order.order_no,
        status: order.status,
        subtotal: order.subtotal,
        serviceFeeRate: order.service_fee_rate,
        serviceFee: order.service_fee,
        shippingFee: order.shipping_fee,
        discount: order.discount,
        total: order.total,
        currency: order.currency,
        recipient: {
            name: order.recipient_name,
            phone: order.recipient_phone,
            country: order.recipient_country,
            city: order.recipient_city,
            address: order.recipient_address,
            postal: order.recipient_postal
        },
        notes: order.notes,
        adminNotes: order.admin_notes,
        paidAt: order.paid_at,
        shippedAt: order.shipped_at,
        deliveredAt: order.delivered_at,
        createdAt: order.created_at
    };
}

function formatOrderItem(item) {
    return {
        id: item.id,
        sourceSite: item.source_site,
        sourceUrl: item.source_url,
        title: item.title,
        imageUrl: item.image_url,
        shopName: item.shop_name,
        price: item.price,
        quantity: item.quantity,
        specs: item.specs ? JSON.parse(item.specs) : null,
        notes: item.notes,
        status: item.status
    };
}

function formatShipment(shipment) {
    return {
        id: shipment.id,
        trackingNo: shipment.tracking_no,
        carrier: shipment.carrier,
        status: shipment.status,
        currentLocation: shipment.current_location,
        estimatedDelivery: shipment.estimated_delivery,
        details: shipment.details ? JSON.parse(shipment.details) : [],
        updatedAt: shipment.updated_at
    };
}

module.exports = router;
