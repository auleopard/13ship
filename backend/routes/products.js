/**
 * 商品路由（用于链接解析等）
 */

const express = require('express');
const router = express.Router();

// 解析商品链接
router.post('/parse', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL不能为空' });
        }
        
        // 判断来源平台
        let sourceSite = 'other';
        if (url.includes('taobao.com') || url.includes('tmall.com')) {
            sourceSite = 'taobao';
        } else if (url.includes('1688.com')) {
            sourceSite = '1688';
        } else if (url.includes('jd.com') || url.includes('jd.hk')) {
            sourceSite = 'jd';
        }
        
        // 模拟商品信息（实际项目中需要调用对应平台的API或爬虫服务）
        // 这里返回一个模拟的商品对象
        const mockProducts = {
            taobao: {
                title: '【示例】现代简约布艺沙发三人位 客厅家具',
                price: 899.00,
                image_url: 'https://via.placeholder.com/400x400/FF9500/FFFFFF?text=沙发',
                shop: '优品家居旗舰店',
                location: '广东佛山',
                sales: 2580
            },
            '1688': {
                title: '【1688】实木餐桌 简约现代 6人位 工厂直供',
                price: 599.00,
                image_url: 'https://via.placeholder.com/400x400/0071e3/FFFFFF?text=餐桌',
                shop: '佛山市xxx家具有限公司',
                location: '广东佛山',
                sales: 15000
            },
            jd: {
                title: '【京东】真皮电动沙发 智能家居 2024新款',
                price: 1599.00,
                image_url: 'https://via.placeholder.com/400x400/34c759/FFFFFF?text=真皮沙发',
                shop: '京东自营',
                location: '北京',
                sales: 3200
            },
            other: {
                title: '未知商品 - 请手动输入信息',
                price: 0,
                image_url: 'https://via.placeholder.com/400x400/86868b/FFFFFF?text=商品',
                shop: '-',
                location: '-',
                sales: 0
            }
        };
        
        const product = mockProducts[sourceSite] || mockProducts.other;
        
        res.json({
            success: true,
            product: {
                ...product,
                source_url: url,
                source_site: sourceSite
            },
            message: sourceSite === 'other' ? '暂不支持该平台，将为您手动创建商品' : '商品信息已获取'
        });
    } catch (error) {
        console.error('Parse product error:', error);
        res.status(500).json({ error: '解析失败' });
    }
});

// 获取汇率
router.get('/currencies', (req, res) => {
    try {
        const { db } = require('../database');
        const currencies = db.prepare('SELECT * FROM currencies ORDER BY rate DESC').all();
        res.json({ currencies });
    } catch (error) {
        console.error('Get currencies error:', error);
        res.status(500).json({ error: '获取失败' });
    }
});

// 币种转换
router.post('/convert', (req, res) => {
    try {
        const { amount, from = 'CNY', to = 'USD' } = req.body;
        const { db } = require('../database');
        
        const fromCurrency = db.prepare('SELECT rate FROM currencies WHERE code = ?').get(from);
        const toCurrency = db.prepare('SELECT rate FROM currencies WHERE code = ?').get(to);
        
        if (!fromCurrency || !toCurrency) {
            return res.status(400).json({ error: '不支持的币种' });
        }
        
        // 转换为CNY，再转换为目标币种
        const amountInCNY = parseFloat(amount) * fromCurrency.rate;
        const result = amountInCNY / toCurrency.rate;
        
        res.json({
            amount: Math.round(result * 100) / 100,
            from,
            to,
            rate: toCurrency.rate / fromCurrency.rate
        });
    } catch (error) {
        console.error('Convert currency error:', error);
        res.status(500).json({ error: '转换失败' });
    }
});

module.exports = router;
