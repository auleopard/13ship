/**
 * 认证路由
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/connection');
const { generateToken, authenticate } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validate');

const router = express.Router();

// POST /api/auth/register - 用户注册
router.post('/register', validateRegister, (req, res) => {
    const { email, password, name, referral_code } = req.body;
    
    // 检查邮箱是否已存在
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
        return res.status(400).json({ error: '该邮箱已注册' });
    }
    
    // 加密密码
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    // 生成唯一推荐码
    const userReferralCode = generateReferralCode();
    
    // 如果有推荐码，验证并记录
    let referredBy = null;
    if (referral_code) {
        const referrer = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(referral_code);
        if (referrer) {
            referredBy = referrer.id;
        }
    }
    
    // 创建用户
    const result = db.prepare(`
        INSERT INTO users (email, password, name, referral_code, referral_by)
        VALUES (?, ?, ?, ?, ?)
    `).run(email, hashedPassword, name || email.split('@')[0], userReferralCode, referredBy);
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    
    // 生成 token
    const token = generateToken(user.id);
    
    res.status(201).json({
        message: '注册成功',
        token,
        user: formatUser(user)
    });
});

// POST /api/auth/login - 用户登录
router.post('/login', validateLogin, (req, res) => {
    const { email, password } = req.body;
    
    // 查找用户
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email);
    if (!user) {
        return res.status(401).json({ error: '邮箱或密码错误' });
    }
    
    // 验证密码
    if (!bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: '邮箱或密码错误' });
    }
    
    // 更新最后登录时间
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(new Date().toISOString(), user.id);
    
    // 生成 token
    const token = generateToken(user.id);
    
    res.json({
        message: '登录成功',
        token,
        user: formatUser(user)
    });
});

// GET /api/auth/me - 获取当前用户信息
router.get('/me', authenticate, (req, res) => {
    res.json({ user: formatUser(req.user) });
});

// PUT /api/auth/profile - 更新个人资料
router.put('/profile', authenticate, (req, res) => {
    const { name, phone, language, currency } = req.body;
    
    db.prepare(`
        UPDATE users SET 
            name = COALESCE(?, name),
            phone = COALESCE(?, phone),
            language = COALESCE(?, language),
            currency = COALESCE(?, currency),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(name, phone, language, currency, req.user.id);
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    
    res.json({
        message: '资料更新成功',
        user: formatUser(user)
    });
});

// PUT /api/auth/password - 修改密码
router.put('/password', authenticate, (req, res) => {
    const { oldPassword, newPassword } = req.body;
    
    // 验证旧密码
    if (!bcrypt.compareSync(oldPassword, req.user.password)) {
        return res.status(400).json({ error: '原密码错误' });
    }
    
    // 加密新密码
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    
    db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(hashedPassword, req.user.id);
    
    res.json({ message: '密码修改成功' });
});

// 生成推荐码
function generateReferralCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// 格式化用户数据
function formatUser(user) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatar: user.avatar,
        level: user.level,
        balance: user.balance,
        totalSpent: user.total_spent,
        referralCode: user.referral_code,
        language: user.language,
        currency: user.currency,
        createdAt: user.created_at
    };
}

module.exports = router;
