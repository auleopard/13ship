/**
 * 文章/帮助文档路由
 */

const express = require('express');
const router = express.Router();
const { db } = require('../database');

// 获取文章列表
router.get('/', (req, res) => {
    try {
        const { category, language = 'zh-CN' } = req.query;
        
        let whereClause = 'WHERE published = 1 AND language = ?';
        const params = [language];
        
        if (category) {
            whereClause += ' AND category = ?';
            params.push(category);
        }
        
        const articles = db.prepare(`
            SELECT id, category, title, content, language, sort, created_at
            FROM articles ${whereClause}
            ORDER BY sort, id
        `).all(...params);
        
        // 移除HTML标签，只返回摘要
        for (const article of articles) {
            article.summary = article.content?.replace(/<[^>]*>/g, '').substring(0, 100) + '...';
            delete article.content;
        }
        
        res.json({ articles });
    } catch (error) {
        console.error('Get articles error:', error);
        res.status(500).json({ error: '获取失败' });
    }
});

// 获取文章详情
router.get('/:id', (req, res) => {
    try {
        const articleId = parseInt(req.params.id);
        const article = db.prepare('SELECT * FROM articles WHERE id = ? AND published = 1').get(articleId);
        
        if (!article) {
            return res.status(404).json({ error: '文章不存在' });
        }
        
        res.json({ article });
    } catch (error) {
        console.error('Get article error:', error);
        res.status(500).json({ error: '获取失败' });
    }
});

// 获取分类下的文章
router.get('/category/:category', (req, res) => {
    try {
        const { category } = req.params;
        const { language = 'zh-CN' } = req.query;
        
        const articles = db.prepare(`
            SELECT id, category, title, content, language, sort, created_at
            FROM articles
            WHERE category = ? AND language = ? AND published = 1
            ORDER BY sort, id
        `).all(category, language);
        
        // 移除HTML标签
        for (const article of articles) {
            article.summary = article.content?.replace(/<[^>]*>/g, '').substring(0, 100) + '...';
            delete article.content;
        }
        
        res.json({ articles });
    } catch (error) {
        console.error('Get category articles error:', error);
        res.status(500).json({ error: '获取失败' });
    }
});

module.exports = router;
