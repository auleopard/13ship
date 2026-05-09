/**
 * 购物车路由
 */
const express = require('express');
const db = require('../database/connection');
const { authenticate } = require('../middleware/auth');
const { validateAddToCart } = require('../middleware/validate');

const router = express.Router();

// GET /api/cart - 获取购物车列表
router.get('/', authenticate, (req, res) => {
    const items = db.prepare('SELECT * FROM cart_items WHERE user_id = ? ORDER BY created_at DESC')
        .all(req.user.id);
    
    const formattedItems = items.map(item => ({
        id: item.id,
        sourceSite: item.source_site,
        sourceUrl: item.source_url,
        title: item.title,
        imageUrl: item.image_url,
        shopName: item.shop_name,
        price: item.price,
        quantity: item.quantity,
        specs: item.specs ? JSON.parse(item.specs) : null,
        notes: item.notes,
        addedAt: item.created_at
    }));
    
    // 计算总计
    const subtotal = formattedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const serviceFee = Math.round(subtotal * 0.08 * 100) / 100;
    
    res.json({
        items: formattedItems,
        summary: {
            itemCount: formattedItems.length,
            totalQuantity: formattedItems.reduce((sum, item) => sum + item.quantity, 0),
            subtotal,
            serviceFee,
            estimatedTotal: subtotal + serviceFee
        }
    });
});

// POST /api/cart - 添加商品到购物车
router.post('/', authenticate, validateAddToCart, (req, res) => {
    const { source_site, source_url, title, image_url, shop_name, price, quantity, specs, notes } = req.body;
    
    // 检查是否已存在相同商品
    const existing = db.prepare(
        'SELECT * FROM cart_items WHERE user_id = ? AND source_url = ?'
    ).get(req.user.id, source_url);
    
    if (existing) {
        // 更新数量
        db.prepare('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?')
            .run(quantity || 1, existing.id);
        
        const updated = db.prepare('SELECT * FROM cart_items WHERE id = ?').get(existing.id);
        return res.json({
            message: '商品数量已增加',
            item: formatCartItem(updated)
        });
    }
    
    // 添加新商品
    const result = db.prepare(`
        INSERT INTO cart_items (user_id, source_site, source_url, title, image_url, shop_name, price, quantity, specs, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        req.user.id, source_site, source_url, title, image_url, shop_name, price, quantity || 1, 
        specs ? JSON.stringify(specs) : null, notes
    );
    
    const item = db.prepare('SELECT * FROM cart_items WHERE id = ?').get(result.lastInsertRowid);
    
    res.status(201).json({
        message: '已加入购物车',
        item: formatCartItem(item)
    });
});

// PUT /api/cart/:id - 更新购物车商品
router.put('/:id', authenticate, (req, res) => {
    const { quantity, specs, notes } = req.body;
    
    const item = db.prepare('SELECT * FROM cart_items WHERE id = ? AND user_id = ?')
        .get(req.params.id, req.user.id);
    
    if (!item) {
        return res.status(404).json({ error: '商品不存在' });
    }
    
    if (quantity !== undefined) {
        if (quantity < 1) {
            // 数量小于1，删除商品
            db.prepare('DELETE FROM cart_items WHERE id = ?').run(item.id);
            return res.json({ message: '商品已从购物车移除' });
        }
    }
    
    db.prepare(`
        UPDATE cart_items SET 
            quantity = COALESCE(?, quantity),
            specs = COALESCE(?, specs),
            notes = COALESCE(?, notes),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(
        quantity, 
        specs ? JSON.stringify(specs) : null, 
        notes,
        item.id
    );
    
    const updated = db.prepare('SELECT * FROM cart_items WHERE id = ?').get(item.id);
    
    res.json({
        message: '更新成功',
        item: formatCartItem(updated)
    });
});

// DELETE /api/cart/:id - 删除购物车商品
router.delete('/:id', authenticate, (req, res) => {
    const item = db.prepare('SELECT * FROM cart_items WHERE id = ? AND user_id = ?')
        .get(req.params.id, req.user.id);
    
    if (!item) {
        return res.status(404).json({ error: '商品不存在' });
    }
    
    db.prepare('DELETE FROM cart_items WHERE id = ?').run(item.id);
    
    res.json({ message: '已从购物车移除' });
});

// DELETE /api/cart - 清空购物车
router.delete('/', authenticate, (req, res) => {
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
    res.json({ message: '购物车已清空' });
});

// POST /api/cart/clear-after-checkout - 结算后清空（内部调用）
router.post('/checkout', authenticate, (req, res) => {
    const { item_ids } = req.body;
    
    if (item_ids && item_ids.length > 0) {
        const placeholders = item_ids.map(() => '?').join(',');
        db.prepare(`DELETE FROM cart_items WHERE id IN (${placeholders}) AND user_id = ?`)
            .run(...item_ids, req.user.id);
    } else {
        db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
    }
    
    res.json({ message: '结算完成' });
});

function formatCartItem(item) {
    return {
        id: item.id,
        sourceSite: item.source_site,
        sourceUrl: item.source_url,
        title: item.title,
        imageUrl: item.image_url,
        shopName: item.shop_name,
        price: item.price,
        quantity: item.quantity,
        specs: item.specs ? JSON.parse(item.specs) : null,
        notes: item.notes,
        addedAt: item.created_at
    };
}

module.exports = router;
