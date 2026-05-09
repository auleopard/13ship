/**
 * 管理员订单路由
 */
const express = require('express');
const db = require('../../database/connection');
const { authenticate, requireAdmin } = require('../../middleware/auth');

const router = express.Router();

// 所有路由需要管理员权限
router.use(authenticate, requireAdmin);

// GET /api/admin/orders - 获取所有订单
router.get('/', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const search = req.query.search;
    
    let whereClause = '1=1';
    const params = [];
    
    if (status) {
        whereClause += ' AND o.status = ?';
        params.push(status);
    }
    
    if (search) {
        whereClause += ' AND (o.order_no LIKE ? OR u.email LIKE ? OR o.recipient_name LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
    }
    
    const total = db.prepare(`
        SELECT COUNT(*) as count FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE ${whereClause}
    `).get(...params).count;
    
    const orders = db.prepare(`
        SELECT o.*, u.email as user_email, u.name as user_name
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE ${whereClause}
        ORDER BY o.created_at DESC
        LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    
    const ordersWithItems = orders.map(order => {
        const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
        return {
            ...formatOrder(order),
            userEmail: order.user_email,
            userName: order.user_name,
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

// GET /api/admin/orders/:id - 获取订单详情
router.get('/:id', (req, res) => {
    const order = db.prepare(`
        SELECT o.*, u.email as user_email, u.name as user_name, u.phone as user_phone
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
    `).get(req.params.id);
    
    if (!order) {
        return res.status(404).json({ error: '订单不存在' });
    }
    
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    const shipment = db.prepare('SELECT * FROM shipments WHERE order_id = ?').get(order.id);
    const payments = db.prepare('SELECT * FROM payments WHERE order_id = ?').all(order.id);
    
    res.json({
        order: {
            ...formatOrder(order),
            userEmail: order.user_email,
            userName: order.user_name,
            userPhone: order.user_phone,
            items: items.map(formatOrderItem),
            shipment: shipment ? formatShipment(shipment) : null,
            payments: payments.map(formatPayment)
        }
    });
});

// PUT /api/admin/orders/:id/status - 更新订单状态
router.put('/:id/status', (req, res) => {
    const { status, admin_notes } = req.body;
    
    const validStatuses = ['pending', 'confirmed', 'purchasing', 'in_warehouse', 'shipping', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: '无效的订单状态' });
    }
    
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
        return res.status(404).json({ error: '订单不存在' });
    }
    
    const now = new Date().toISOString();
    let updateFields = 'status = ?, updated_at = ?';
    const params = [status, now];
    
    if (status === 'paid' || (status === 'confirmed' && order.status === 'pending')) {
        updateFields += ', paid_at = ?';
        params.push(now);
    } else if (status === 'shipping') {
        updateFields += ', shipped_at = ?';
        params.push(now);
    } else if (status === 'delivered') {
        updateFields += ', delivered_at = ?';
        params.push(now);
    }
    
    if (admin_notes !== undefined) {
        updateFields += ', admin_notes = ?';
        params.push(admin_notes);
    }
    
    db.prepare(`UPDATE orders SET ${updateFields} WHERE id = ?`).run(...params, req.params.id);
    
    res.json({ message: '订单状态已更新' });
});

// POST /api/admin/orders/:id/shipment - 添加物流信息
router.post('/:id/shipment', (req, res) => {
    const { tracking_no, carrier, estimated_delivery } = req.body;
    
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
        return res.status(404).json({ error: '订单不存在' });
    }
    
    // 检查是否已有物流记录
    const existing = db.prepare('SELECT * FROM shipments WHERE order_id = ?').get(req.params.id);
    
    if (existing) {
        db.prepare(`
            UPDATE shipments SET 
                tracking_no = COALESCE(?, tracking_no),
                carrier = COALESCE(?, carrier),
                estimated_delivery = COALESCE(?, estimated_delivery),
                updated_at = CURRENT_TIMESTAMP
            WHERE order_id = ?
        `).run(tracking_no, carrier, estimated_delivery, req.params.id);
    } else {
        db.prepare(`
            INSERT INTO shipments (order_id, tracking_no, carrier, estimated_delivery, status)
            VALUES (?, ?, ?, ?, 'in_transit')
        `).run(req.params.id, tracking_no, carrier, estimated_delivery);
        
        // 更新订单状态
        db.prepare("UPDATE orders SET status = 'shipping' WHERE id = ?").run(req.params.id);
    }
    
    res.json({ message: '物流信息已添加' });
});

// GET /api/admin/orders/stats - 获取订单统计
router.get('/stats/summary', (req, res) => {
    const stats = {
        total: db.prepare('SELECT COUNT(*) as count FROM orders').get().count,
        pending: db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").get().count,
        confirmed: db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'confirmed'").get().count,
        shipping: db.prepare("SELECT COUNT(*) as count FROM orders WHERE status IN ('purchasing', 'in_warehouse', 'shipping')").get().count,
        completed: db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'delivered'").get().count,
        cancelled: db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'cancelled'").get().count,
        totalRevenue: db.prepare("SELECT COALESCE(SUM(total), 0) as sum FROM orders WHERE status != 'cancelled'").get().sum,
        todayOrders: db.prepare("SELECT COUNT(*) as count FROM orders WHERE date(created_at) = date('now')").get().count,
        todayRevenue: db.prepare("SELECT COALESCE(SUM(total), 0) as sum FROM orders WHERE date(created_at) = date('now')").get().sum
    };
    
    res.json({ stats });
});

// 格式化函数
function formatOrder(order) {
    return {
        id: order.id,
        orderNo: order.order_no,
        status: order.status,
        subtotal: order.subtotal,
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
            address: order.recipient_address
        },
        notes: order.notes,
        adminNotes: order.admin_notes,
        paidAt: order.paid_at,
        shippedAt: order.shipped_at,
        deliveredAt: order.delivered_at,
        createdAt: order.created_at,
        updatedAt: order.updated_at
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
        updatedAt: shipment.updated_at
    };
}

function formatPayment(payment) {
    return {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        transactionId: payment.transaction_id,
        status: payment.status,
        paidAt: payment.paid_at,
        createdAt: payment.created_at
    };
}

module.exports = router;
