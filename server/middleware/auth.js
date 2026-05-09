/**
 * 认证中间件
 */
const jwt = require('jsonwebtoken');
const db = require('../database/connection');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 验证 JWT Token
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '未授权，请先登录' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ error: '用户不存在或已被禁用' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token 无效或已过期' });
    }
};

// 可选认证 - 如果有 token 则解析，没有则继续
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(decoded.userId);
        if (user) {
            req.user = user;
        }
    } catch (error) {
        // Token 无效，忽略继续
    }
    
    next();
};

// 验证管理员权限
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: '请先登录' });
    }
    
    if (req.user.level !== 'admin') {
        return res.status(403).json({ error: '需要管理员权限' });
    }
    
    next();
};

// 生成 JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

module.exports = { authenticate, optionalAuth, requireAdmin, generateToken };
