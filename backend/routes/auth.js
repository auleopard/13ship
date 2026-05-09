/**
 * 认证路由
 */

const express = require('express');
const router = express.Router();
const { db, hashPassword, generateReferralCode } = require('../database');

// 注册
router.post('/register', (req, res) => {
    try {
        const { email, password, name, referral_code } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: '邮箱和密码不能为空' });
        }

        // 检查邮箱是否已存在
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(400).json({ error: '该邮箱已注册' });
        }

        // 获取推荐人
        let referredBy = null;
        if (referral_code) {
            const referrer = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(referral_code);
            if (referrer) {
                referredBy = referrer.id;
            }
        }

        // 创建用户
        const userReferralCode = generateReferralCode();
        const hashedPassword = hashPassword(password);
        
        const result = db.prepare(`
            INSERT INTO users (email, password, name, referral_code, referred_by)
            VALUES (?, ?, ?, ?, ?)
        `).run(email, hashedPassword, name || '', userReferralCode, referredBy);

        const user = db.prepare('SELECT id, email, name, level, balance, language, currency, referral_code FROM users WHERE id = ?').get(result.lastInsertRowid);

        // 创建购物车
        db.prepare('INSERT INTO carts (user_id) VALUES (?)').run(user.id);

        // 发送欢迎通知
        db.prepare(`
            INSERT INTO notifications (user_id, type, title, content)
            VALUES (?, 'system', '欢迎注册', '感谢您注册13Ship，祝您购物愉快！')
        `).run(user.id);

        res.json({ success: true, user });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: '注册失败' });
    }
});

// 登录
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: '邮箱和密码不能为空' });
        }

        const hashedPassword = hashPassword(password);
        const user = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, hashedPassword);

        if (!user) {
            return res.status(401).json({ error: '邮箱或密码错误' });
        }

        // 返回用户信息（不包含密码）
        const { password: _, ...userInfo } = user;

        // 更新最后登录
        db.prepare('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

        res.json({ success: true, user: userInfo });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: '登录失败' });
    }
});

// 登出
router.post('/logout', (req, res) => {
    res.json({ success: true });
});

// 获取当前用户
router.get('/me', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: '未登录' });
        }

        const token = authHeader.replace('Bearer ', '');
        const user = db.prepare(`
            SELECT id, email, name, phone, avatar, level, balance, total_spent, 
                   language, currency, referral_code, created_at
            FROM users WHERE id = ?
        `).get(parseInt(token));

        if (!user) {
            return res.status(401).json({ error: '用户不存在' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: '获取用户信息失败' });
    }
});

module.exports = router;
