/**
 * 13Ship 数据库配置
 * SQLite 实现
 */

const sqlite3 = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '..', 'data', '13ship.db');
const dbDir = path.dirname(dbPath);

// 确保目录存在
const fs = require('fs');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

// 启用外键
db.pragma('foreign_keys = ON');

/**
 * 初始化数据库表
 */
async function initDatabase() {
    console.log('📊 初始化数据库...');
    
    // 1. 用户表
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(100),
            phone VARCHAR(50),
            avatar VARCHAR(500),
            level VARCHAR(20) DEFAULT 'normal',
            balance DECIMAL(10,2) DEFAULT 0,
            total_spent DECIMAL(10,2) DEFAULT 0,
            referral_code VARCHAR(20) UNIQUE,
            referred_by INTEGER,
            language VARCHAR(10) DEFAULT 'zh-CN',
            currency VARCHAR(10) DEFAULT 'USD',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (referred_by) REFERENCES users(id)
        )
    `);

    // 2. 收货地址表
    db.exec(`
        CREATE TABLE IF NOT EXISTS addresses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            country VARCHAR(100) NOT NULL,
            province VARCHAR(100),
            city VARCHAR(100),
            address TEXT NOT NULL,
            zip_code VARCHAR(20),
            recipient_name VARCHAR(100),
            phone VARCHAR(50),
            is_default INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // 3. 购物车表
    db.exec(`
        CREATE TABLE IF NOT EXISTS carts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // 4. 购物车商品表
    db.exec(`
        CREATE TABLE IF NOT EXISTS cart_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cart_id INTEGER NOT NULL,
            source_url VARCHAR(500),
            source_site VARCHAR(20),
            title VARCHAR(500),
            price DECIMAL(10,2) NOT NULL,
            quantity INTEGER DEFAULT 1,
            specs TEXT,
            image_url VARCHAR(500),
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE
        )
    `);

    // 5. 订单主表
    db.exec(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_no VARCHAR(50) UNIQUE NOT NULL,
            user_id INTEGER NOT NULL,
            address_id INTEGER,
            type VARCHAR(20) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            subtotal DECIMAL(10,2) DEFAULT 0,
            shipping_fee DECIMAL(10,2) DEFAULT 0,
            service_fee DECIMAL(10,2) DEFAULT 0,
            discount DECIMAL(10,2) DEFAULT 0,
            total DECIMAL(10,2) DEFAULT 0,
            currency VARCHAR(10) DEFAULT 'USD',
            notes TEXT,
            tracking_no VARCHAR(100),
            paid_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (address_id) REFERENCES addresses(id)
        )
    `);

    // 6. 订单商品明细表
    db.exec(`
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            source_url VARCHAR(500),
            source_site VARCHAR(20),
            title VARCHAR(500) NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            quantity INTEGER DEFAULT 1,
            specs TEXT,
            image_url VARCHAR(500),
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )
    `);

    // 7. 运费规则表
    db.exec(`
        CREATE TABLE IF NOT EXISTS shipping_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            country VARCHAR(100) NOT NULL,
            zone INTEGER DEFAULT 1,
            first_weight DECIMAL(10,2) DEFAULT 1,
            first_price DECIMAL(10,2) DEFAULT 10,
            continue_weight DECIMAL(10,2) DEFAULT 0.5,
            continue_price DECIMAL(10,2) DEFAULT 5,
            volume_rate DECIMAL(10,4) DEFAULT 6000,
            min_days INTEGER DEFAULT 15,
            max_days INTEGER DEFAULT 30,
            enabled INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 8. 文章/帮助文档表
    db.exec(`
        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category VARCHAR(20) NOT NULL,
            title VARCHAR(255) NOT NULL,
            content TEXT,
            language VARCHAR(10) DEFAULT 'zh-CN',
            sort INTEGER DEFAULT 0,
            published INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 9. 币种汇率表
    db.exec(`
        CREATE TABLE IF NOT EXISTS currencies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code VARCHAR(10) UNIQUE NOT NULL,
            name VARCHAR(50) NOT NULL,
            symbol VARCHAR(10) NOT NULL,
            rate DECIMAL(10,4) DEFAULT 1,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 10. 佣金记录表
    db.exec(`
        CREATE TABLE IF NOT EXISTS commissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            order_id INTEGER,
            amount DECIMAL(10,2) DEFAULT 0,
            level INTEGER DEFAULT 1,
            status VARCHAR(20) DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (order_id) REFERENCES orders(id)
        )
    `);

    // 11. 通知消息表
    db.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type VARCHAR(20) DEFAULT 'system',
            title VARCHAR(255) NOT NULL,
            content TEXT,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // 12. 操作日志表
    db.exec(`
        CREATE TABLE IF NOT EXISTS admin_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id INTEGER,
            action VARCHAR(100) NOT NULL,
            target_type VARCHAR(50),
            target_id INTEGER,
            details TEXT,
            ip_address VARCHAR(50),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 创建索引
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE INDEX IF NOT EXISTS idx_orders_no ON orders(order_no);
        CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
        CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);
        CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
    `);

    // 初始化数据
    await seedData();
    
    console.log('✅ 数据库表创建完成');
}

/**
 * 种子数据
 */
async function seedData() {
    // 检查是否已有数据
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (userCount.count > 0) {
        console.log('📦 数据已存在，跳过初始化');
        return;
    }

    console.log('🌱 初始化种子数据...');

    // 1. 创建管理员账号
    const adminPassword = hashPassword('admin123');
    const adminReferralCode = generateReferralCode();
    db.prepare(`
        INSERT INTO users (email, password, name, level, referral_code)
        VALUES (?, ?, ?, ?, ?)
    `).run('admin@13ship.com', adminPassword, '管理员', 'admin', adminReferralCode);

    // 2. 创建测试用户
    const testPassword = hashPassword('test123');
    const testReferralCode = generateReferralCode();
    db.prepare(`
        INSERT INTO users (email, password, name, language, currency, referral_code)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run('test@13ship.com', testPassword, '测试用户', 'zh-CN', 'USD', testReferralCode);

    // 3. 初始化币种汇率 (基于CNY)
    const currencies = [
        ['CNY', '人民币', '¥', 1],
        ['USD', '美元', '$', 7.24],
        ['EUR', '欧元', '€', 7.85],
        ['GBP', '英镑', '£', 9.15],
        ['JPY', '日元', '¥', 0.048],
        ['KRW', '韩元', '₩', 0.0054],
        ['AUD', '澳大利亚元', 'A$', 4.75],
        ['CAD', '加元', 'C$', 5.35],
        ['RUB', '卢布', '₽', 0.079],
        ['HKD', '港币', 'HK$', 0.93],
    ];
    
    const currencyStmt = db.prepare(`
        INSERT INTO currencies (code, name, symbol, rate) VALUES (?, ?, ?, ?)
    `);
    
    for (const [code, name, symbol, rate] of currencies) {
        currencyStmt.run(code, name, symbol, rate);
    }

    // 4. 初始化运费规则
    const shippingRules = [
        ['香港', 1, 1, 15, 0.5, 8, 6000, 5, 10],
        ['澳门', 1, 1, 18, 0.5, 10, 6000, 7, 14],
        ['台湾', 1, 1, 25, 0.5, 12, 6000, 10, 20],
        ['日本', 2, 1, 35, 0.5, 18, 6000, 7, 14],
        ['韩国', 2, 1, 30, 0.5, 15, 6000, 5, 12],
        ['新加坡', 2, 1, 40, 0.5, 20, 6000, 8, 15],
        ['美国', 3, 1, 55, 0.5, 28, 6000, 15, 35],
        ['加拿大', 3, 1, 55, 0.5, 28, 6000, 18, 40],
        ['澳大利亚', 3, 1, 60, 0.5, 30, 6000, 15, 30],
        ['英国', 4, 1, 65, 0.5, 32, 6000, 15, 30],
        ['法国', 4, 1, 65, 0.5, 32, 6000, 15, 30],
        ['德国', 4, 1, 65, 0.5, 32, 6000, 15, 30],
        ['俄罗斯', 5, 1, 70, 0.5, 35, 6000, 20, 40],
        ['巴西', 5, 1, 80, 0.5, 40, 6000, 25, 45],
        ['其他', 5, 1, 85, 0.5, 42, 6000, 25, 50],
    ];
    
    const shippingStmt = db.prepare(`
        INSERT INTO shipping_rules (country, zone, first_weight, first_price, continue_weight, continue_price, volume_rate, min_days, max_days)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const rule of shippingRules) {
        shippingStmt.run(...rule);
    }

    // 5. 初始化帮助文档
    const articles = [
        {
            category: 'guide',
            title: '新手指南 - 如何开始海淘',
            content: '<h2>欢迎使用13Ship</h2><p>13Ship是您的专业反向海淘平台...</p>',
            sort: 1
        },
        {
            category: 'guide',
            title: '如何贴链接下单',
            content: '<h2>贴链接下单教程</h2><p>只需三步，轻松完成下单...</p>',
            sort: 2
        },
        {
            category: 'guide',
            title: '转运服务说明',
            content: '<h2>转运服务</h2><p>我们提供专业的仓储和转运服务...</p>',
            sort: 3
        },
        {
            category: 'faq',
            title: '常见问题FAQ',
            content: '<h2>常见问题</h2><p><b>Q: 发货需要多长时间？</b><br>A: 通常需要7-15个工作日...</p>',
            sort: 1
        },
        {
            category: 'faq',
            title: '如何计算运费',
            content: '<h2>运费计算</h2><p>运费根据重量、体积和目的地计算...</p>',
            sort: 2
        },
        {
            category: 'faq',
            title: '关税说明',
            content: '<h2>关税说明</h2><p>不同国家/地区的海关政策不同...</p>',
            sort: 3
        },
        {
            category: 'policy',
            title: '服务条款',
            content: '<h2>服务条款</h2><p>使用13Ship服务即表示您同意以下条款...</p>',
            sort: 1
        },
        {
            category: 'policy',
            title: '隐私政策',
            content: '<h2>隐私政策</h2><p>我们承诺保护您的个人隐私...</p>',
            sort: 2
        },
        {
            category: 'notice',
            title: '运费调整通知',
            content: '<h2>重要通知</h2><p>由于航班调整，部分地区运费有所变动...</p>',
            sort: 1
        },
    ];
    
    const articleStmt = db.prepare(`
        INSERT INTO articles (category, title, content, sort) VALUES (?, ?, ?, ?)
    `);
    
    for (const article of articles) {
        articleStmt.run(article.category, article.title, article.content, article.sort);
    }

    console.log('✅ 种子数据初始化完成');
}

/**
 * 生成邀请码
 */
function generateReferralCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

/**
 * 密码哈希
 */
function hashPassword(password) {
    return crypto.createHash('sha256').update(password + '13ship_salt').digest('hex');
}

/**
 * 生成订单号
 */
function generateOrderNo(type) {
    const prefix = {
        'link': 'LNK',
        'custom': 'CUS',
        'transport': 'TRN',
        'large': 'LGE'
    };
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix[type] || 'ORD'}${dateStr}${random}`;
}

module.exports = {
    db,
    initDatabase,
    hashPassword,
    generateReferralCode,
    generateOrderNo
};
