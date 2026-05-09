/**
 * 收货地址路由
 */
const express = require('express');
const db = require('../database/connection');
const { authenticate } = require('../middleware/auth');
const { validateAddress } = require('../middleware/validate');

const router = express.Router();

// GET /api/addresses - 获取收货地址列表
router.get('/', authenticate, (req, res) => {
    const addresses = db.prepare(
        'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC'
    ).all(req.user.id);
    
    res.json({
        addresses: addresses.map(formatAddress)
    });
});

// GET /api/addresses/:id - 获取单个地址
router.get('/:id', authenticate, (req, res) => {
    const address = db.prepare(
        'SELECT * FROM addresses WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);
    
    if (!address) {
        return res.status(404).json({ error: '地址不存在' });
    }
    
    res.json({ address: formatAddress(address) });
});

// POST /api/addresses - 添加收货地址
router.post('/', authenticate, validateAddress, (req, res) => {
    const { name, phone, country, city, address, postal_code, is_default } = req.body;
    
    // 如果设置为默认地址，先取消其他默认
    if (is_default) {
        db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?')
            .run(req.user.id);
    }
    
    const result = db.prepare(`
        INSERT INTO addresses (user_id, name, phone, country, city, address, postal_code, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, name, phone, country, city, address, postal_code, is_default ? 1 : 0);
    
    const addressObj = db.prepare('SELECT * FROM addresses WHERE id = ?').get(result.lastInsertRowid);
    
    res.status(201).json({
        message: '地址添加成功',
        address: formatAddress(addressObj)
    });
});

// PUT /api/addresses/:id - 更新收货地址
router.put('/:id', authenticate, validateAddress, (req, res) => {
    const { name, phone, country, city, address, postal_code, is_default } = req.body;
    
    const existing = db.prepare(
        'SELECT * FROM addresses WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);
    
    if (!existing) {
        return res.status(404).json({ error: '地址不存在' });
    }
    
    // 如果设置为默认地址，先取消其他默认
    if (is_default) {
        db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?')
            .run(req.user.id);
    }
    
    db.prepare(`
        UPDATE addresses SET 
            name = ?, phone = ?, country = ?, city = ?, address = ?, 
            postal_code = ?, is_default = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(name, phone, country, city, address, postal_code, is_default ? 1 : 0, req.params.id);
    
    const updated = db.prepare('SELECT * FROM addresses WHERE id = ?').get(req.params.id);
    
    res.json({
        message: '地址更新成功',
        address: formatAddress(updated)
    });
});

// DELETE /api/addresses/:id - 删除收货地址
router.delete('/:id', authenticate, (req, res) => {
    const address = db.prepare(
        'SELECT * FROM addresses WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);
    
    if (!address) {
        return res.status(404).json({ error: '地址不存在' });
    }
    
    db.prepare('DELETE FROM addresses WHERE id = ?').run(req.params.id);
    
    // 如果删除的是默认地址，指定一个新的默认地址
    if (address.is_default) {
        const firstAddress = db.prepare(
            'SELECT id FROM addresses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
        ).get(req.user.id);
        
        if (firstAddress) {
            db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(firstAddress.id);
        }
    }
    
    res.json({ message: '地址已删除' });
});

// PUT /api/addresses/:id/default - 设为默认地址
router.put('/:id/default', authenticate, (req, res) => {
    const address = db.prepare(
        'SELECT * FROM addresses WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);
    
    if (!address) {
        return res.status(404).json({ error: '地址不存在' });
    }
    
    // 取消其他默认
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?')
        .run(req.user.id);
    
    // 设置新的默认地址
    db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(req.params.id);
    
    res.json({ message: '已设为默认地址' });
});

function formatAddress(addr) {
    return {
        id: addr.id,
        name: addr.name,
        phone: addr.phone,
        country: addr.country,
        city: addr.city,
        address: addr.address,
        postalCode: addr.postal_code,
        isDefault: !!addr.is_default,
        createdAt: addr.created_at
    };
}

module.exports = router;
