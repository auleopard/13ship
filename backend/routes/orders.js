/**
 * 订单路由
 */

const express = require('express');
const router = express.Router();
const { db, generateOrderNo } = require('../database');

// 获取订单列表
router.get('/', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const userId = parseInt(authHeader.replace('Bearer ', ''));
        const { status, page = 1, limit = 20 } = req.query;
        
        let whereClause = 'WHERE user_id = ?';
        const params = [userId];
        
        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }
        
        const offset = (page - 1) * limit;
        
        const orders = db.prepare(`
            SELECT * FROM orders ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `).all(...params, parseInt(limit), parseInt(offset));
        
        const total = db.prepare(`SELECT COUNT(*) as count FROM orders ${whereClause}`).get(...params).count;
        
        // 获取每个订单的商品
        for (const order of orders) {
            order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
            order.address = db.prepare('SELECT * FROM addresses WHERE id = ?').get(order.address_id);
        }
        
        res.json({
            orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: '获取失败' });
    }
});

// 获取订单详情
router.get('/:id', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const userId = parseInt(authHeader.replace('Bearer ', ''));
        const orderId = parseInt(req.params.id);
        
        const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, userId);
        
        if (!order) {
            return res.status(404).json({ error: '订单不存在' });
        }
        
        order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
        order.address = db.prepare('SELECT * FROM addresses WHERE id = ?').get(order.address_id);
        
        res.json({ order });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: '获取失败' });
    }
});

// 创建订单
router.post('/', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const userId = parseInt(authHeader.replace('Bearer ', ''));
        const { type, address_id, items, shipping_fee, service_fee, discount, notes } = req.body;
        const { db } = require('../database');
        
        if (!type || !items || items.length === 0) {
            return res.status(400).json({ error: '订单类型和商品不能为空' });
        }
        
        // 计算小计
        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const total = subtotal + (shipping_fee || 0) + (service_fee || 0) - (discount || 0);
        
        // 获取用户默认币种
        const user = db.prepare('SELECT currency FROM users WHERE id = ?').get(userId);
        
        // 生成订单号
        const orderNo = generateOrderNo(type);
        
        // 创建订单
        const result = db.prepare(`
            INSERT INTO orders (order_no, user_id, address_id, type, subtotal, shipping_fee, service_fee, discount, total, currency, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            orderNo,
            userId,
            address_id || null,
            type,
            subtotal,
            shipping_fee || 0,
            service_fee || 0,
            discount || 0,
            total,
            user?.currency || 'USD',
            notes || ''
        );
        
        const orderId = result.lastInsertRowid;
        
        // 添加订单商品
        const itemStmt = db.prepare(`
            INSERT INTO order_items (order_id, source_url, source_site, title, price, quantity, specs, image_url, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const item of items) {
            itemStmt.run(
                orderId,
                item.source_url || '',
                item.source_site || 'other',
                item.title,
                item.price,
                item.quantity,
                item.specs || '',
                item.image_url || '',
                item.notes || ''
            );
        }
        
        // 发送通知
        db.prepare(`
            INSERT INTO notifications (user_id, type, title, content)
            VALUES (?, 'order', '订单已创建', ?)
        `).run(userId, `您的订单 ${orderNo} 已创建成功！`);
        
        // 获取完整订单
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
        if (address_id) {
            order.address = db.prepare('SELECT * FROM addresses WHERE id = ?').get(address_id);
        }
        
        res.json({ success: true, order });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: '创建订单失败' });
    }
});

// 从购物车创建订单
router.post('/from-cart', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const userId = parseInt(authHeader.replace('Bearer ', ''));
        const { address_id, shipping_fee, service_fee, discount, notes } = req.body;
        const { db } = require('../database');
        
        // 获取购物车商品
        const cart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);
        if (!cart) {
            return res.status(400).json({ error: '购物车为空' });
        }
        
        const items = db.prepare('SELECT * FROM cart_items WHERE cart_id = ?').all(cart.id);
        if (items.length === 0) {
            return res.status(400).json({ error: '购物车为空' });
        }
        
        // 计算金额
        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const total = subtotal + (shipping_fee || 0) + (service_fee || 0) - (discount || 0);
        
        // 生成订单号
        const orderNo = generateOrderNo('link');
        
        // 创建订单
        const result = db.prepare(`
            INSERT INTO orders (order_no, user_id, address_id, type, subtotal, shipping_fee, service_fee, discount, total, currency, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            orderNo,
            userId,
            address_id || null,
            'link',
            subtotal,
            shipping_fee || 0,
            service_fee || 0,
            discount || 0,
            total,
            'USD',
            notes || ''
        );
        
        const orderId = result.lastInsertRowid;
        
        // 添加订单商品
        const itemStmt = db.prepare(`
            INSERT INTO order_items (order_id, source_url, source_site, title, price, quantity, specs, image_url, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const item of items) {
            itemStmt.run(
                orderId,
                item.source_url,
                item.source_site,
                item.title,
                item.price,
                item.quantity,
                item.specs,
                item.image_url,
                item.notes
            );
        }
        
        // 清空购物车
        db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cart.id);
        
        // 发送通知
        db.prepare(`
            INSERT INTO notifications (user_id, type, title, content)
            VALUES (?, 'order', '订单已创建', ?)
        `).run(userId, `您的订单 ${orderNo} 已创建成功！`);
        
        // 获取完整订单
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
        
        res.json({ success: true, order });
    } catch (error) {
        console.error('Create order from cart error:', error);
        res.status(500).json({ error: '创建订单失败' });
    }
});

// 取消订单
router.post('/:id/cancel', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const userId = parseInt(authHeader.replace('Bearer ', ''));
        const orderId = parseInt(req.params.id);
        
        const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, userId);
        
        if (!order) {
            return res.status(404).json({ error: '订单不存在' });
        }
        
        if (!['pending', 'confirmed'].includes(order.status)) {
            return res.status(400).json({ error: '该订单无法取消' });
        }
        
        db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('cancelled', orderId);
        
        // 发送通知
        db.prepare(`
            INSERT INTO notifications (user_id, type, title, content)
            VALUES (?, 'order', '订单已取消', ?)
        `).run(userId, `您的订单 ${order.order_no} 已取消。`);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({ error: '取消失败' });
    }
});

module.exports = router;
