/**
 * 管理员用户路由
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../../database/connection');
const { authenticate, requireAdmin } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticate, requireAdmin);

// GET /api/admin/users - 获取用户列表
router.get('/', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const search = req.query.search;
    const level = req.query.level;

    let whereClause = '1=1';
    const params = [];

    if (search) {
        whereClause += ' AND (email LIKE ? OR name LIKE ?)';
        const pattern = `%${search}%`;
        params.push(pattern, pattern);
    }

    if (level) {
        whereClause += ' AND level = ?';
        params.push(level);
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM users WHERE ${whereClause}`).get(...params).count;

    const users = db.prepare(`
        SELECT id, email, name, phone, level, balance, total_spent, is_active, last_login_at, created_at
        FROM users WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json({
        users: users.map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
            phone: u.phone,
            level: u.level,
            balance: u.balance,
            totalSpent: u.total_spent,
            isActive: !!u.is_active,
            lastLoginAt: u.last_login_at,
            createdAt: u.created_at
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
});

// GET /api/admin/users/:id - 获取用户详情
router.get('/:id', (req, res) => {
    const user = db.prepare(`
        SELECT id, email, name, phone, level, balance, total_spent, referral_code, language, currency, is_active, last_login_at, created_at
        FROM users WHERE id = ?
    `).get(req.params.id);

    if (!user) {
        return res.status(404).json({ error: '用户不存在' });
    }

    // 获取用户地址
    const addresses = db.prepare('SELECT * FROM addresses WHERE user_id = ?').all(user.id);

    // 获取用户订单统计
    const orderStats = db.prepare(`
        SELECT status, COUNT(*) as count, COALESCE(SUM(total), 0) as total
        FROM orders WHERE user_id = ?
        GROUP BY status
    `).all(user.id);

    res.json({
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            level: user.level,
            balance: user.balance,
            totalSpent: user.total_spent,
            referralCode: user.referral_code,
            language: user.language,
            currency: user.currency,
            isActive: !!user.is_active,
            lastLoginAt: user.last_login_at,
            createdAt: user.created_at
        },
        addresses: addresses.map(a => ({
            id: a.id,
            name: a.name,
            phone: a.phone,
            country: a.country,
            city: a.city,
            address: a.address,
            postalCode: a.postal_code,
            isDefault: !!a.is_default
        })),
        orderStats: orderStats.reduce((acc, s) => {
            acc[s.status] = { count: s.count, total: s.total };
            return acc;
        }, {})
    });
});

// PUT /api/admin/users/:id - 更新用户
router.put('/:id', (req, res) => {
    const { name, phone, level, balance, is_active } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
        return res.status(404).json({ error: '用户不存在' });
    }

    db.prepare(`
        UPDATE users SET
            name = COALESCE(?, name),
            phone = COALESCE(?, phone),
            level = COALESCE(?, level),
            balance = COALESCE(?, balance),
            is_active = COALESCE(?, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(name, phone, level, balance, is_active !== undefined ? (is_active ? 1 : 0) : null, req.params.id);

    res.json({ message: '用户已更新' });
});

// DELETE /api/admin/users/:id - 删除用户
router.delete('/:id', (req, res) => {
    if (parseInt(req.params.id) === req.user.id) {
        return res.status(400).json({ error: '不能删除自己' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
        return res.status(404).json({ error: '用户不存在' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ message: '用户已删除' });
});

// GET /api/admin/users/stats - 用户统计
router.get('/stats/overview', (req, res) => {
    const stats = {
        total: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
        active: db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get().count,
        vip: db.prepare("SELECT COUNT(*) as count FROM users WHERE level IN ('vip', 'svip')").get().count,
        newToday: db.prepare("SELECT COUNT(*) as count FROM users WHERE date(created_at) = date('now')").get().count,
        totalSpent: db.prepare('SELECT COALESCE(SUM(total_spent), 0) as sum FROM users').get().sum
    };

    res.json({ stats });
});

module.exports = router;
