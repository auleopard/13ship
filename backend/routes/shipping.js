/**
 * 运费路由
 */

const express = require('express');
const router = express.Router();
const { db } = require('../database');

// 获取运费规则列表
router.get('/rules', (req, res) => {
    try {
        const { country } = req.query;
        
        let rules = db.prepare('SELECT * FROM shipping_rules WHERE enabled = 1 ORDER BY zone, country').all();
        
        if (country) {
            rules = rules.filter(r => r.country.toLowerCase().includes(country.toLowerCase()));
        }
        
        res.json({ rules });
    } catch (error) {
        console.error('Get shipping rules error:', error);
        res.status(500).json({ error: '获取失败' });
    }
});

// 计算运费
router.post('/calculate', (req, res) => {
    try {
        const { country, weight = 1, volume = null, items = [] } = req.body;
        
        if (!country) {
            return res.status(400).json({ error: '请选择目的地国家' });
        }
        
        // 查找对应国家的规则
        let rule = db.prepare('SELECT * FROM shipping_rules WHERE country LIKE ? AND enabled = 1').get(`%${country}%`);
        
        // 如果没找到精确匹配，尝试模糊匹配
        if (!rule) {
            // 按区域匹配
            const zoneRules = db.prepare(`
                SELECT * FROM shipping_rules WHERE enabled = 1 GROUP BY zone ORDER BY id LIMIT 1
            `).get();
            rule = zoneRules;
        }
        
        if (!rule) {
            return res.status(404).json({ error: '该地区暂不支持配送' });
        }
        
        // 计算总重量
        let totalWeight = parseFloat(weight);
        let totalVolumeWeight = 0;
        
        // 如果有体积信息，计算体积重
        if (volume && volume.length && volume.width && volume.height) {
            totalVolumeWeight = (volume.length * volume.width * volume.height) / rule.volume_rate;
        }
        
        // 如果有商品，计算商品总重量（假设每件1kg）
        if (items && items.length > 0) {
            // 可以根据商品自定义重量
        }
        
        // 计费重量 = 实际重量和体积重取较大值
        const billableWeight = Math.max(totalWeight, totalVolumeWeight);
        
        // 计算运费
        // 总运费 = 首重价格 + ceil((计费重量 - 首重) / 续重) * 续重价格
        let shippingFee;
        if (billableWeight <= rule.first_weight) {
            shippingFee = rule.first_price;
        } else {
            const extraWeight = billableWeight - rule.first_weight;
            const extraUnits = Math.ceil(extraWeight / rule.continue_weight);
            shippingFee = rule.first_price + extraUnits * rule.continue_price;
        }
        
        // 保留2位小数
        shippingFee = Math.round(shippingFee * 100) / 100;
        
        res.json({
            fee: shippingFee,
            currency: 'CNY',
            billable_weight: Math.round(billableWeight * 100) / 100,
            actual_weight: totalWeight,
            volume_weight: Math.round(totalVolumeWeight * 100) / 100,
            delivery_days: {
                min: rule.min_days,
                max: rule.max_days
            },
            rule: {
                country: rule.country,
                first_weight: rule.first_weight,
                first_price: rule.first_price,
                continue_weight: rule.continue_weight,
                continue_price: rule.continue_price
            }
        });
    } catch (error) {
        console.error('Calculate shipping error:', error);
        res.status(500).json({ error: '计算失败' });
    }
});

// 获取支持的配送国家
router.get('/countries', (req, res) => {
    try {
        const rules = db.prepare('SELECT DISTINCT country, zone FROM shipping_rules WHERE enabled = 1 ORDER BY zone, country').all();
        
        // 按区域分组
        const zones = {
            1: { name: '亚洲', countries: [] },
            2: { name: '东亚/东南亚', countries: [] },
            3: { name: '美洲', countries: [] },
            4: { name: '欧洲', countries: [] },
            5: { name: '其他', countries: [] }
        };
        
        for (const rule of rules) {
            const zone = zones[rule.zone] || zones[5];
            if (!zone.countries.includes(rule.country)) {
                zone.countries.push(rule.country);
            }
        }
        
        res.json({ zones });
    } catch (error) {
        console.error('Get countries error:', error);
        res.status(500).json({ error: '获取失败' });
    }
});

module.exports = router;
