/**
 * 13Ship 反向海淘平台 - 主服务器
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// 导入路由
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const cartRoutes = require('./routes/cart');
const addressRoutes = require('./routes/addresses');
const productRoutes = require('./routes/products');
const shippingRoutes = require('./routes/shipping');
const adminOrderRoutes = require('./routes/admin/orders');
const adminUserRoutes = require('./routes/admin/users');

const app = express();
const PORT = process.env.PORT || 3000;

// 确保数据目录存在
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 初始化数据库（如果不存在）
const dbPath = path.join(dataDir, '13ship.db');
if (!fs.existsSync(dbPath)) {
    console.log('📦 首次启动，初始化数据库...');
    require('./database/init');
}

// ==================== 中间件 ====================

// CORS
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    credentials: true
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${new Date().toISOString()} ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });
    next();
});

// ==================== API 路由 ====================

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: '13Ship API',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// 公开 API
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/shipping', shippingRoutes);

// 需要认证的 API
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/addresses', addressRoutes);

// 管理员 API
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin/users', adminUserRoutes);

// 管理员其他路由
app.get('/api/admin/settings', require('./middleware/auth').authenticate, require('./middleware/auth').requireAdmin, (req, res) => {
    const db = require('./database/connection');
    const settings = db.prepare('SELECT * FROM settings').all();
    res.json({ settings: settings.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {}) });
});

app.put('/api/admin/settings', require('./middleware/auth').authenticate, require('./middleware/auth').requireAdmin, (req, res) => {
    const db = require('./database/connection');
    const updates = req.body;
    
    Object.entries(updates).forEach(([key, value]) => {
        db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)')
            .run(key, String(value));
    });
    
    res.json({ message: '设置已更新' });
});

// ==================== 静态文件 ====================

// 前端构建目录
const clientDist = path.join(__dirname, '../dist');
if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    
    // SPA 路由支持
    app.get('*', (req, res) => {
        res.sendFile(path.join(clientDist, 'index.html'));
    });
}

// ==================== 错误处理 ====================

app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ 
        error: '服务器内部错误',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ==================== 启动服务器 ====================

app.listen(PORT, () => {
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║                                                   ║');
    console.log('║   🚢 13Ship 反向海淘平台 API 服务器                ║');
    console.log('║                                                   ║');
    console.log(`║   📍 http://localhost:${PORT}                        ║`);
    console.log('║   📍 http://127.0.0.1:' + PORT + '                        ║');
    console.log('║                                                   ║');
    console.log('║   API 端点:                                       ║');
    console.log('║   - GET  /api/health    健康检查                  ║');
    console.log('║   - POST /api/auth/*    认证相关                  ║');
    console.log('║   - GET  /api/products/* 商品解析                 ║');
    console.log('║   - GET  /api/shipping/* 运费相关                 ║');
    console.log('║                                                   ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('');
});

module.exports = app;
