/**
 * 购物车路由
 */

const express = require('express');
const router = express.Router();

// 获取购物车
router.get('/', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const userId = parseInt(authHeader.replace('Bearer ', ''));
        const { db } = require('../database');
        
        // 获取或创建购物车
        let cart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);
        if (!cart) {
            db.prepare('INSERT INTO carts (user_id) VALUES (?)').run(userId);
            cart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);
        }
        
        // 获取购物车商品
        const items = db.prepare('SELECT * FROM cart_items WHERE cart_id = ?').all(cart.id);
        
        // 计算合计
        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        
        res.json({
            cart: {
                ...cart,
                items,
                subtotal,
                item_count: items.reduce((sum, item) => sum + item.quantity, 0)
            }
        });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ error: '获取购物车失败' });
    }
});

// 添加商品到购物车
router.post('/items', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const userId = parseInt(authHeader.replace('Bearer ', ''));
        const { source_url, source_site, title, price, quantity, specs, image_url, notes } = req.body;
        const { db } = require('../database');
        
        if (!price) {
            return res.status(400).json({ error: '价格不能为空' });
        }
        
        // 获取或创建购物车
        let cart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);
        if (!cart) {
            db.prepare('INSERT INTO carts (user_id) VALUES (?)').run(userId);
            cart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);
        }
        
        // 检查是否已存在相同商品
        if (source_url) {
            const existing = db.prepare('SELECT * FROM cart_items WHERE cart_id = ? AND source_url = ?').get(cart.id, source_url);
            if (existing) {
                // 更新数量
                db.prepare('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?').run(quantity || 1, existing.id);
                const updated = db.prepare('SELECT * FROM cart_items WHERE id = ?').get(existing.id);
                return res.json({ success: true, item: updated, updated: true });
            }
        }
        
        // 添加新商品
        const result = db.prepare(`
            INSERT INTO cart_items (cart_id, source_url, source_site, title, price, quantity, specs, image_url, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            cart.id,
            source_url || '',
            source_site || 'other',
            title || '未命名商品',
            price,
            quantity || 1,
            specs || '',
            image_url || '',
            notes || ''
        );
        
        const newItem = db.prepare('SELECT * FROM cart_items WHERE id = ?').get(result.lastInsertRowid);
        res.json({ success: true, item: newItem });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ error: '添加失败' });
    }
});

// 更新购物车商品数量
router.put('/items/:id', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const userId = parseInt(authHeader.replace('Bearer ', ''));
        const itemId = parseInt(req.params.id);
        const { quantity } = req.body;
        const { db } = require('../database');
        
        // 验证商品属于当前用户
        const item = db.prepare(`
            SELECT ci.* FROM cart_items ci
            JOIN carts c ON ci.cart_id = c.id
            WHERE ci.id = ? AND c.user_id = ?
        `).get(itemId, userId);
        
        if (!item) {
            return res.status(404).json({ error: '商品不存在' });
        }
        
        if (quantity <= 0) {
            db.prepare('DELETE FROM cart_items WHERE id = ?').run(itemId);
            return res.json({ success: true, deleted: true });
        }
        
        db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(quantity, itemId);
        const updated = db.prepare('SELECT * FROM cart_items WHERE id = ?').get(itemId);
        
        res.json({ success: true, item: updated });
    } catch (error) {
        console.error('Update cart item error:', error);
        res.status(500).json({ error: '更新失败' });
    }
});

// 删除购物车商品
router.delete('/items/:id', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const userId = parseInt(authHeader.replace('Bearer ', ''));
        const itemId = parseInt(req.params.id);
        const { db } = require('../database');
        
        // 验证商品属于当前用户
        const item = db.prepare(`
            SELECT ci.id FROM cart_items ci
            JOIN carts c ON ci.cart_id = c.id
            WHERE ci.id = ? AND c.user_id = ?
        `).get(itemId, userId);
        
        if (!item) {
            return res.status(404).json({ error: '商品不存在' });
        }
        
        db.prepare('DELETE FROM cart_items WHERE id = ?').run(itemId);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete cart item error:', error);
        res.status(500).json({ error: '删除失败' });
    }
});

// 清空购物车
router.delete('/clear', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const userId = parseInt(authHeader.replace('Bearer ', ''));
        const { db } = require('../database');
        
        const cart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);
        if (cart) {
            db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cart.id);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({ error: '清空失败' });
    }
});

module.exports = router;
