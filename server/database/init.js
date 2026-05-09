/**
 * 13Ship 数据库初始化脚本
 * 运行: npm run db:init
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// 确保 data 目录存在
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dataDir, '13ship.db');
const db = new Database(dbPath);

// 启用外键
db.pragma('foreign_keys = ON');

console.log('🚀 开始初始化数据库...');
console.log(`📁 数据库路径: ${dbPath}`);

// ==================== 创建表结构 ====================

// 1. 用户表
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        phone TEXT,
        avatar TEXT,
        level TEXT DEFAULT 'normal' CHECK(level IN ('normal', 'vip', 'svip')),
        balance REAL DEFAULT 0,
        total_spent REAL DEFAULT 0,
        referral_code TEXT UNIQUE,
        referral_by TEXT,
        language TEXT DEFAULT 'zh-CN',
        currency TEXT DEFAULT 'CNY',
        is_active INTEGER DEFAULT 1,
        last_login_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);

// 2. 收货地址表
db.exec(`
    CREATE TABLE IF NOT EXISTS addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        country TEXT NOT NULL,
        city TEXT NOT NULL,
        address TEXT NOT NULL,
        postal_code TEXT,
        is_default INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
`);

// 3. 商品来源表
db.exec(`
    CREATE TABLE IF NOT EXISTS source_sites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        logo TEXT,
        url_pattern TEXT,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);

// 4. 运费规则表
db.exec(`
    CREATE TABLE IF NOT EXISTS shipping_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        country TEXT NOT NULL,
        country_code TEXT,
        first_weight REAL DEFAULT 1,
        first_price REAL NOT NULL,
        continue_weight REAL DEFAULT 1,
        continue_price REAL NOT NULL,
        estimated_days TEXT,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);

// 5. 服务费规则表
db.exec(`
    CREATE TABLE IF NOT EXISTS service_fees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        level TEXT UNIQUE NOT NULL CHECK(level IN ('basic', 'standard', 'vip')),
        rate REAL NOT NULL,
        description TEXT,
        benefits TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);

// 6. 订单主表
db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_no TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN (
            'pending', 'confirmed', 'purchasing', 'in_warehouse', 
            'shipping', 'delivered', 'cancelled', 'refunded'
        )),
        subtotal REAL NOT NULL,
        service_fee_rate REAL DEFAULT 0.08,
        service_fee REAL NOT NULL,
        shipping_fee REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        total REAL NOT NULL,
        currency TEXT DEFAULT 'CNY',
        recipient_name TEXT,
        recipient_phone TEXT,
        recipient_country TEXT,
        recipient_city TEXT,
        recipient_address TEXT,
        recipient_postal TEXT,
        notes TEXT,
        admin_notes TEXT,
        paid_at TEXT,
        shipped_at TEXT,
        delivered_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
`);

// 7. 订单商品表
db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        source_site TEXT NOT NULL,
        source_url TEXT NOT NULL,
        title TEXT NOT NULL,
        image_url TEXT,
        shop_name TEXT,
        price REAL NOT NULL,
        quantity INTEGER DEFAULT 1,
        specs TEXT,
        notes TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'purchased', 'in_stock', 'shipped')),
        purchased_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
`);

// 8. 物流跟踪表
db.exec(`
    CREATE TABLE IF NOT EXISTS shipments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        tracking_no TEXT,
        carrier TEXT,
        status TEXT DEFAULT 'pending',
        current_location TEXT,
        estimated_delivery TEXT,
        details TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
`);

// 9. 支付记录表
db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'CNY',
        method TEXT,
        transaction_id TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'failed', 'refunded')),
        paid_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
`);

// 10. 购物车表
db.exec(`
    CREATE TABLE IF NOT EXISTS cart_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        source_site TEXT NOT NULL,
        source_url TEXT NOT NULL,
        title TEXT NOT NULL,
        image_url TEXT,
        shop_name TEXT,
        price REAL NOT NULL,
        quantity INTEGER DEFAULT 1,
        specs TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
`);

// 11. 文章/帮助中心表
db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        title_en TEXT,
        content TEXT NOT NULL,
        category TEXT DEFAULT 'guide' CHECK(category IN ('guide', 'shipping', 'payment', 'service', 'faq')),
        language TEXT DEFAULT 'zh-CN',
        sort_order INTEGER DEFAULT 0,
        is_published INTEGER DEFAULT 1,
        view_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);

// 12. 系统设置表
db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        type TEXT DEFAULT 'string',
        description TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);

// ==================== 创建索引 ====================

const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_users_referral ON users(referral_code)',
    'CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
    'CREATE INDEX IF NOT EXISTS idx_orders_no ON orders(order_no)',
    'CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)',
    'CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(order_id)',
    'CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category)',
    'CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id)',
];

indexes.forEach(sql => db.exec(sql));

console.log('✅ 表结构创建完成');

// ==================== 初始化数据 ====================

console.log('\n📝 开始初始化数据...');

// 初始化管理员账户
const adminEmail = process.env.ADMIN_EMAIL || 'admin@13ship.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
const hashedPassword = bcrypt.hashSync(adminPassword, 10);

const insertAdmin = db.prepare(`
    INSERT OR IGNORE INTO users (email, password, name, level, is_active)
    VALUES (?, ?, '管理员', 'admin', 1)
`);
insertAdmin.run(adminEmail, hashedPassword);
console.log(`✅ 管理员账户: ${adminEmail} / ${adminPassword}`);

// 初始化商品来源
const sites = [
    ['淘宝', 'taobao', '🛒', 'taobao.com'],
    ['天猫', 'tmall', '🏬', 'tmall.com'],
    ['京东', 'jd', '📱', 'jd.com'],
    ['1688', '1688', '🏭', '1688.com'],
    ['拼多多', 'pdd', '🛍️', 'yangkeduo.com'],
];
const insertSite = db.prepare(`
    INSERT OR IGNORE INTO source_sites (name, code, logo, url_pattern, sort_order)
    VALUES (?, ?, ?, ?, ?)
`);
sites.forEach((s, i) => insertSite.run(s[0], s[1], s[2], s[3], i));
console.log('✅ 商品来源平台');

// 初始化运费规则
const shippingRules = [
    ['香港', 'HK', 1, 15, 1, 8, '5-10'],
    ['澳门', 'MO', 1, 18, 1, 10, '7-14'],
    ['台湾', 'TW', 1, 25, 1, 12, '10-20'],
    ['日本', 'JP', 1, 35, 1, 18, '7-14'],
    ['韩国', 'KR', 1, 30, 1, 15, '5-12'],
    ['新加坡', 'SG', 1, 40, 1, 20, '8-15'],
    ['美国', 'US', 1, 55, 1, 28, '15-35'],
    ['加拿大', 'CA', 1, 55, 1, 28, '18-40'],
    ['澳大利亚', 'AU', 1, 60, 1, 30, '15-30'],
    ['英国', 'GB', 1, 65, 1, 32, '15-30'],
    ['德国', 'DE', 1, 65, 1, 32, '15-30'],
    ['法国', 'FR', 1, 65, 1, 32, '15-30'],
    ['其他地区', 'OTHER', 1, 85, 1, 42, '25-50'],
];
const insertShipping = db.prepare(`
    INSERT OR IGNORE INTO shipping_rules (country, country_code, first_weight, first_price, continue_weight, continue_price, estimated_days, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
shippingRules.forEach((r, i) => insertShipping.run(...r, i));
console.log('✅ 运费规则');

// 初始化服务费规则
const serviceFees = [
    ['基础服务', 'basic', 0.05, '基础代购服务，适合偶尔海淘的用户', '链接解析|商品采购|客服咨询'],
    ['标准服务', 'standard', 0.08, '最受欢迎的选择，适合经常海淘的用户', '基础服务全包含|免费仓储30天|拆包验货|合箱打包'],
    ['VIP服务', 'vip', 0.12, '专属定制服务，适合高需求用户', '标准服务全包含|免费仓储60天|优先处理|专属客服'],
];
const insertFee = db.prepare(`
    INSERT OR IGNORE INTO service_fees (name, level, rate, description, benefits)
    VALUES (?, ?, ?, ?, ?)
`);
serviceFees.forEach(f => insertFee.run(...f));
console.log('✅ 服务费规则');

// 初始化系统设置
const settings = [
    ['site_name', '13Ship 反向海淘平台', 'string', '网站名称'],
    ['site_description', '您的专业反向海淘转运平台', 'string', '网站描述'],
    ['contact_email', 'support@13ship.com', 'string', '联系邮箱'],
    ['contact_phone', '+1 234 567 890', 'string', '联系电话'],
    ['min_order_amount', '0', 'number', '最小订单金额'],
    ['free_shipping_threshold', '500', 'number', '免运费门槛'],
    ['currency_default', 'CNY', 'string', '默认货币'],
];
const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, type, description)
    VALUES (?, ?, ?, ?)
`);
settings.forEach(s => insertSetting.run(...s));
console.log('✅ 系统设置');

// 初始化帮助文章
const articles = [
    ['如何注册账号？', 'How to register?', '点击页面右上角的"注册"按钮，填写邮箱和密码即可完成注册。', 'guide'],
    ['支持哪些支付方式？', 'Payment methods', '我们支持 PayPal、信用卡、银行转账等多种支付方式。', 'payment'],
    ['如何追踪订单？', 'Track your order', '登录后进入"我的订单"，点击订单可查看详细物流信息。', 'shipping'],
    ['运费如何计算？', 'Shipping fees', '运费根据商品重量、体积和目的地国家计算，下单前可查看预估运费。', 'shipping'],
    ['配送需要多长时间？', 'Delivery time', '一般情况下，15-30个工作日送达，具体时间取决于目的地和物流方式。', 'shipping'],
    ['可以运送到哪些国家？', 'Shipping countries', '我们支持全球50多个国家和地区的配送服务，包括香港、澳门、台湾、日本、韩国、东南亚、欧美等地区。', 'shipping'],
    ['支持哪些货币结算？', 'Supported currencies', '支持人民币、美元、欧元、英镑、日元等多种货币结算。', 'payment'],
    ['商品破损怎么办？', 'Damaged items', '请在收货后24小时内联系我们，提供照片证据，我们会协助处理退换货事宜。', 'service'],
    ['如何联系客服？', 'Contact us', '可通过在线客服、邮件或电话联系我们，工作时间9:00-21:00。', 'service'],
];
const insertArticle = db.prepare(`
    INSERT OR IGNORE INTO articles (title, title_en, content, category, sort_order)
    VALUES (?, ?, ?, ?, ?)
`);
articles.forEach((a, i) => insertArticle.run(a[0], a[1], a[2], a[3], i));
console.log('✅ 帮助文章');

console.log('\n🎉 数据库初始化完成！');
console.log('\n📌 后续操作:');
console.log('1. 运行 npm run dev 启动开发服务器');
console.log('2. 访问 http://localhost:3000/api 检查 API');
console.log('3. 访问 http://localhost:3000/admin 进入管理后台');

db.close();
