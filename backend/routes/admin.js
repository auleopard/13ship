/**
 * 后台管理路由
 */

const express = require('express');
const router = express.Router();
const { db, hashPassword } = require('../database');

// 管理员中间件
function adminAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: '未登录' });
    }
    
    const userId = parseInt(authHeader.replace('Bearer ', ''));
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    
    if (!user || user.level !== 'admin') {
        return res.status(403).json({ error: '无权限访问' });
    }
    
    req.admin = user;
    next();
}

// 应用中间件到所有路由
router.use(adminAuth);

// ==================== 仪表盘 ====================

router.get('/dashboard', (req, res) => {
    try {
        // 今日数据
        const today = new Date().toISOString().slice(0, 10);
        
        const todayOrders = db.prepare(`
            SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as amount 
            FROM orders WHERE DATE(created_at) = ?
        `).get(today);
        
        const todayUsers = db.prepare(`
            SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = ? AND level != 'admin'
        `).get(today);
        
        // 总数据
        const totalOrders = db.prepare(`
            SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as amount 
            FROM orders WHERE status != 'cancelled'
        `).get();
        
        const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE level != ?').get('admin');
        
        // 待处理
        const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").get();
        const pendingPayments = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'confirmed'").get();
        
        // 订单状态分布
        const orderStats = db.prepare(`
            SELECT status, COUNT(*) as count, COALESCE(SUM(total), 0) as amount
            FROM orders GROUP BY status
        `).all();
        
        // 近7天订单趋势
        const recentOrders = db.prepare(`
            SELECT DATE(created_at) as date, COUNT(*) as count, COALESCE(SUM(total), 0) as amount
            FROM orders 
            WHERE created_at >= datetime('now', '-7 days')
            GROUP BY DATE(created_at)
            ORDER BY date
        `).all();
        
        // 近7天用户注册
        const recentUsers = db.prepare(`
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM users 
            WHERE level != 'admin' AND created_at >= datetime('now', '-7 days')
            GROUP BY DATE(created_at)
            ORDER BY date
        `).all();
        
        // 最近订单
        const latestOrders = db.prepare(`
            SELECT o.*, u.name as user_name, u.email as user_email
            FROM orders o
            JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
            LIMIT 10
        `).all();
        
        res.json({
            today: {
                orders: todayOrders.count,
                orderAmount: todayOrders.amount,
                users: todayUsers.count
            },
            total: {
                orders: totalOrders.count,
                orderAmount: totalOrders.amount,
                users: totalUsers.count
            },
            pending: {
                orders: pendingOrders.count,
                payments: pendingPayments.count
            },
            orderStats,
            recentOrders,
            recentUsers,
            latestOrders
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: '获取失败' });
    }
});

// ==================== 用户管理 ====================

router.get('/users', (req, res) => {
    try {
        const { page = 1, limit = 20, search, level } = req.query;
        const offset = (page - 1) * limit;
        
        let whereClause = "WHERE level != 'admin'";
        const params = [];
        
        if (search) {
            whereClause += ' AND (email LIKE ? OR name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        if (level) {
            whereClause += ' AND level = ?';
            params.push(level);
        }
        
        const users = db.prepare(`
            SELECT id, email, name, phone, level, balance, total_spent, created_at
            FROM users ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `).all(...params, parseInt(limit), parseInt(offset));
        
        const total = db.prepare(`SELECT COUNT(*) as count FROM users ${whereClause}`).get(...params).count;
        
        res.json({
            users,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: '获取失败' });
    }
});

// 更新用户
router.put('/users/:id', (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { level, balance } = req.body;
        
        if (level) {
            db.prepare('UPDATE users SET level = ? WHERE id = ?').run(level, userId);
        }
        
        if (balance !== undefined) {
            db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(balance, userId);
        }
        
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        const { password: _, ...userInfo } = user;
        
        res.json({ success: true, user: userInfo });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: '更新失败' });
    }
});

// ==================== 订单管理 ====================

router.get('/orders', (req, res) => {
    try {
        const { page = 1, limit = 20, status, type, search } = req.query;
        const offset = (page - 1) * limit;
        
        let whereClause = '1=1';
        const params = [];
        
        if (status) {
            whereClause += ' AND o.status = ?';
            params.push(status);
        }
        
        if (type) {
            whereClause += ' AND o.type = ?';
            params.push(type);
        }
        
        if (search) {
            whereClause += ' AND (o.order_no LIKE ? OR u.email LIKE ? OR u.name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        const orders = db.prepare(`
            SELECT o.*, u.name as user_name, u.email as user_email
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE ${whereClause}
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `).all(...params, parseInt(limit), parseInt(offset));
        
        // 获取订单商品
        for (const order of orders) {
            order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
        }
        
        const total = db.prepare(`
            SELECT COUNT(*) as count FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE ${whereClause}
        `).get(...params).count;
        
        res.json({
            orders,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: '获取失败' });
    }
});

// 更新订单状态
router.put('/orders/:id', (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const { status, tracking_no, notes } = req.body;
        
        if (status) {
            db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, orderId);
            
            // 发送通知
            const order = db.prepare('SELECT order_no, user_id FROM orders WHERE id = ?').get(orderId);
            if (order) {
                const statusText = {
                    pending: '待确认',
                    confirmed: '已确认',
                    purchasing: '采购中',
                    in_warehouse: '已到仓库',
                    shipping: '运输中',
                    delivered: '已送达',
                    cancelled: '已取消'
                };
                
                db.prepare(`
                    INSERT INTO notifications (user_id, type, title, content)
                    VALUES (?, 'order', '订单状态更新', ?)
                `).run(order.user_id, `订单 ${order.order_no} 状态已更新为：${statusText[status] || status}`);
            }
        }
        
        if (tracking_no) {
            db.prepare('UPDATE orders SET tracking_no = ? WHERE id = ?').run(tracking_no, orderId);
        }
        
        if (notes) {
            db.prepare('UPDATE orders SET notes = ? WHERE id = ?').run(notes, orderId);
        }
        
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
        
        res.json({ success: true, order });
    } catch (error) {
        console.error('Update order error:', error);
        res.status(500).json({ error: '更新失败' });
    }
});

// 获取订单详情
router.get('/orders/:id', (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        if (!order) {
            return res.status(404).json({ error: '订单不存在' });
        }
        
        order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
        order.address = db.prepare('SELECT * FROM addresses WHERE id = ?').get(order.address_id);
        order.user = db.prepare('SELECT id, email, name, phone FROM users WHERE id = ?').get(order.user_id);
        
        res.json({ order });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: '获取失败' });
    }
});

// ==================== 运费规则 ====================

router.get('/shipping-rules', (req, res) => {
    try {
        const rules = db.prepare('SELECT * FROM shipping_rules ORDER BY zone, country').all();
        res.json({ rules });
    } catch (error) {
        console.error('Get shipping rules error:', error);
        res.status(500).json({ error: '获取失败' });
    }
});

router.put('/shipping-rules/:id', (req, res) => {
    try {
        const ruleId = parseInt(req.params.id);
        const { country, zone, first_weight, first_price, continue_weight, continue_price, volume_rate, min_days, max_days, enabled } = req.body;
        
        db.prepare(`
            UPDATE shipping_rules SET
            country = COALESCE(?, country),
            zone = COALESCE(?, zone),
            first_weight = COALESCE(?, first_weight),
            first_price = COALESCE(?, first_price),
            continue_weight = COALESCE(?, continue_weight),
            continue_price = COALESCE(?, continue_price),
            volume_rate = COALESCE(?, volume_rate),
            min_days = COALESCE(?, min_days),
            max_days = COALESCE(?, max_days),
            enabled = COALESCE(?, enabled)
            WHERE id = ?
        `).run(country, zone, first_weight, first_price, continue_weight, continue_price, volume_rate, min_days, max_days, enabled, ruleId);
        
        const rule = db.prepare('SELECT * FROM shipping_rules WHERE id = ?').get(ruleId);
        res.json({ success: true, rule });
    } catch (error) {
        console.error('Update shipping rule error:', error);
        res.status(500).json({ error: '更新失败' });
    }
});

// ==================== 文章管理 ====================

router.get('/articles', (req, res) => {
    try {
        const { category, language } = req.query;
        
        let whereClause = '1=1';
        const params = [];
        
        if (category) {
            whereClause += ' AND category = ?';
            params.push(category);
        }
        
        if (language) {
            whereClause += ' AND language = ?';
            params.push(language);
        }
        
        const articles = db.prepare(`
            SELECT * FROM articles WHERE ${whereClause} ORDER BY sort, id
        `).all(...params);
        
        res.json({ articles });
    } catch (error) {
        console.error('Get articles error:', error);
        res.status(500).json({ error: '获取失败' });
    }
});

router.post('/articles', (req, res) => {
    try {
        const { category, title, content, language, sort, published } = req.body;
        
        const result = db.prepare(`
            INSERT INTO articles (category, title, content, language, sort, published)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(category, title, content, language || 'zh-CN', sort || 0, published !== false ? 1 : 0);
        
        const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(result.lastInsertRowid);
        res.json({ success: true, article });
    } catch (error) {
        console.error('Create article error:', error);
        res.status(500).json({ error: '创建失败' });
    }
});

router.put('/articles/:id', (req, res) => {
    try {
        const articleId = parseInt(req.params.id);
        const { category, title, content, language, sort, published } = req.body;
        
        db.prepare(`
            UPDATE articles SET
            category = COALESCE(?, category),
            title = COALESCE(?, title),
            content = COALESCE(?, content),
            language = COALESCE(?, language),
            sort = COALESCE(?, sort),
            published = COALESCE(?, published),
            updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(category, title, content, language, sort, published, articleId);
        
        const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(articleId);
        res.json({ success: true, article });
    } catch (error) {
        console.error('Update article error:', error);
        res.status(500).json({ error: '更新失败' });
    }
});

router.delete('/articles/:id', (req, res) => {
    try {
        const articleId = parseInt(req.params.id);
        db.prepare('DELETE FROM articles WHERE id = ?').run(articleId);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete article error:', error);
        res.status(500).json({ error: '删除失败' });
    }
});

// ==================== 币种管理 ====================

router.get('/currencies', (req, res) => {
    try {
        const currencies = db.prepare('SELECT * FROM currencies ORDER BY rate').all();
        res.json({ currencies });
    } catch (error) {
        console.error('Get currencies error:', error);
        res.status(500).json({ error: '获取失败' });
    }
});

router.put('/currencies/:code', (req, res) => {
    try {
        const { code } = req.params;
        const { rate } = req.body;
        
        db.prepare('UPDATE currencies SET rate = ?, updated_at = CURRENT_TIMESTAMP WHERE code = ?').run(rate, code);
        
        const currency = db.prepare('SELECT * FROM currencies WHERE code = ?').get(code);
        res.json({ success: true, currency });
    } catch (error) {
        console.error('Update currency error:', error);
        res.status(500).json({ error: '更新失败' });
    }
});

// ==================== 佣金管理 ====================

router.get('/commissions', (req, res) => {
    try {
        const commissions = db.prepare(`
            SELECT c.*, u.name as user_name, u.email as user_email, o.order_no
            FROM commissions c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN orders o ON c.order_id = o.id
            ORDER BY c.created_at DESC
        `).all();
        
        res.json({ commissions });
    } catch (error) {
        console.error('Get commissions error:', error);
        res.status(500).json({ error: '获取失败' });
    }
});

module.exports = router;
