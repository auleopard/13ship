/**
 * 数据库连接模块
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 确保 data 目录存在
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dataDir, '13ship.db');
const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

// 启用 WAL 模式提升并发性能
db.pragma('journal_mode = WAL');

// 设置超时时间
db.pragma('busy_timeout = 5000');

module.exports = db;
