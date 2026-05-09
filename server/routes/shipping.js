/**
 * 运费路由
 */
const express = require('express');
const db = require('../database/connection');

const router = express.Router();

// GET /api/shipping/rules - 获取运费规则列表
router.get('/rules', (req, res) => {
    const { country } = req.query;
    
    let rules;
    if (country) {
        rules = db.prepare('SELECT * FROM shipping_rules WHERE country = ? AND is_active = 1')
            .all(country);
    } else {
        rules = db.prepare('SELECT * FROM shipping_rules WHERE is_active = 1 ORDER BY sort_order')
            .all();
    }
    
    res.json({
        rules: rules.map(rule => ({
            id: rule.id,
            country: rule.country,
            countryCode: rule.country_code,
            firstWeight: rule.first_weight,
            firstPrice: rule.first_price,
            continueWeight: rule.continue_weight,
            continuePrice: rule.continue_price,
            estimatedDays: rule.estimated_days
        }))
    });
});

// GET /api/shipping/calculate - 计算运费
router.get('/calculate', (req, res) => {
    const { country, weight, subtotal } = req.query;
    
    if (!country) {
        return res.status(400).json({ error: '请提供目的地国家' });
    }
    
    const rule = db.prepare('SELECT * FROM shipping_rules WHERE country = ? AND is_active = 1')
        .get(country);
    
    if (!rule) {
        return res.json({
            estimation: {
                country,
                firstPrice: 85,
                estimatedDays: '25-50',
                note: '偏远地区可能需要更长时间'
            }
        });
    }
    
    // 基础运费
    let shippingFee = rule.first_price;
    
    // 如果有重量，计算续重费用
    if (weight && parseFloat(weight) > rule.first_weight) {
        const extraWeight = parseFloat(weight) - rule.first_weight;
        const extraUnits = Math.ceil(extraWeight / rule.continue_weight);
        shippingFee += extraUnits * rule.continue_price;
    }
    
    res.json({
        estimation: {
            country,
            firstPrice: rule.first_price,
            continuePrice: rule.continue_price,
            estimatedFee: shippingFee,
            estimatedDays: rule.estimated_days,
            currency: 'CNY'
        }
    });
});

// GET /api/shipping/countries - 获取支持的国家列表
router.get('/countries', (req, res) => {
    const rules = db.prepare('SELECT country, country_code, estimated_days FROM shipping_rules WHERE is_active = 1 ORDER BY sort_order')
        .all();
    
    res.json({
        countries: rules.map(r => ({
            name: r.country,
            code: r.country_code,
            estimatedDays: r.estimated_days
        }))
    });
});

module.exports = router;
