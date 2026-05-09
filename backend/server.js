/**
 * 13Ship 后端API服务
 * Express.js + SQLite
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// 初始化数据库
const { initDatabase, db } = require('./database');

// 引入路由
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const shippingRoutes = require('./routes/shipping');
const productRoutes = require('./routes/products');
const articleRoutes = require('./routes/articles');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 确保上传目录存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/products', productRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/admin', adminRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 前端静态文件（用于部署）
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// SPA路由支持
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/admin')) {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
    }
});

// 错误处理
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 启动服务器
async function start() {
    try {
        await initDatabase();
        console.log('✅ 数据库初始化完成');
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 13Ship API服务已启动: http://localhost:${PORT}`);
            console.log(`📦 数据库: SQLite`);
            console.log(`🕐 启动时间: ${new Date().toISOString()}`);
        });
    } catch (error) {
        console.error('❌ 启动失败:', error);
        process.exit(1);
    }
}

start();
