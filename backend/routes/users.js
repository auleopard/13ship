/**
 * 用户路由
 */

const express = require('express');
const router = express.Router();

// 获取用户资料
router.get('/profile', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const userId = parseInt(authHeader.replace('Bearer ', ''));
        const { db } = require('../database');
        
        const user = db.prepare(`
            SELECT id, email, name, phone, avatar, level, balance, total_spent, 
                   language, currency, referral_code, created_at
            FROM users WHERE id = ?
        `).get(userId);
        
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }
        
        res.json({ user });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: '获取失败' });
    }
});

// 更新用户资料
router.put('/profile', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const userId = parseInt(authHeader.replace('Bearer ', ''));
        const { name, phone, language, currency } = req.body;
        const { db } = require('../database');
        
        db.prepare(`
            UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone),
            language = COALESCE(?, language), currency = COALESCE(?, currency),
            updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(name, phone, language, currency, userId);
        
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        const { password: _, ...userInfo } = user;
        
        res.json({ success: true, user: userInfo });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: '更新失败' });
    }
});

// 获取收货地址列表
router.get('/addresses', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const userId = parseInt(authHeader.replace('Bearer ', ''));
        const { db } = require('../database');
        
        const addresses = db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC').all(userId);
        res.json({ addresses });
    } catch (error) {
        console.error('Get addresses error:', error);
        res.status(500).json({ error: '获取失败' });
    }
});

// 添加收货地址
router.post('/addresses', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const userId = parseInt(authHeader.replace('Bearer ', ''));
        const { country, province, city, address, zip_code, recipient_name, phone, is_default } = req.body;
        const { db } = require('../database');
        
        // 如果设置为默认，先取消其他默认
        if (is_default) {
            db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(userId);
        }
        
        const result = db.prepare(`
            INSERT INTO addresses (user_id, country, province, city, address, zip_code, recipient_name, phone, is_default)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(userId, country, province, city, address, zip_code, recipient_name, phone, is_default ? 1 : 0);
        
        const newAddress = db.prepare('SELECT * FROM addresses WHERE id = ?').get(result.lastInsertRowid);
        res.json({ success: true, address: newAddress });
    } catch (error) {
        console.error('Add address error:', error);
        res.status(500).json({ error: '添加失败' });
    }
});

// 更新收货地址
router.put('/addresses/:id', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const userId = parseInt(authHeader.replace('Bearer ', ''));
        const addressId = parseInt(req.params.id);
        const { country, province, city, address, zip_code, recipient_name, phone, is_default } = req.body;
        const { db } = require('../database');
        
        // 验证地址属于当前用户
        const existing = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(addressId, userId);
        if (!existing) {
            return res.status(404).json({ error: '地址不存在' });
        }
        
        // 如果设置为默认，先取消其他默认
        if (is_default) {
            db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(userId);
        }
        
        db.prepare(`
            UPDATE addresses SET 
            country = COALESCE(?, country),
            province = COALESCE(?, province),
            city = COALESCE(?, city),
            address = COALESCE(?, address),
            zip_code = COALESCE(?, zip_code),
            recipient_name = COALESCE(?, recipient_name),
            phone = COALESCE(?, phone),
            is_default = COALESCE(?, is_default)
            WHERE id = ?
        `).run(country, province, city, address, zip_code, recipient_name, phone, is_default ? 1 : 0, addressId);
        
        const updated = db.prepare('SELECT * FROM addresses WHERE id = ?').get(addressId);
        res.json({ success: true, address: updated });
    } catch (error) {
        console.error('Update address error:', error);
        res.status(500).json({ error: '更新失败' });
    }
});

// 删除收货地址
router.delete('/addresses/:id', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const userId = parseInt(authHeader.replace('Bearer ', ''));
        const addressId = parseInt(req.params.id);
        const { db } = require('../database');
        
        const result = db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(addressId, userId);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: '地址不存在' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete address error:', error);
        res.status(500).json({ error: '删除失败' });
    }
});

// 获取通知列表
router.get('/notifications', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const userId = parseInt(authHeader.replace('Bearer ', ''));
        const { db } = require('../database');
        
        const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(userId);
        res.json({ notifications });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: '获取失败' });
    }
});

// 标记通知已读
router.put('/notifications/:id/read', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const userId = parseInt(authHeader.replace('Bearer ', ''));
        const notificationId = parseInt(req.params.id);
        const { db } = require('../database');
        
        db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(notificationId, userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: '操作失败' });
    }
});

module.exports = router;
