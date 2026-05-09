/**
 * 验证中间件
 */
const { body, param, query, validationResult } = require('express-validator');

// 处理验证结果
const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            error: '验证失败', 
            details: errors.array() 
        });
    }
    next();
};

// 用户注册验证
const validateRegister = [
    body('email').isEmail().normalizeEmail().withMessage('请输入有效的邮箱地址'),
    body('password').isLength({ min: 6 }).withMessage('密码至少6位'),
    body('name').optional().trim().isLength({ min: 2, max: 50 }),
    handleValidation
];

// 用户登录验证
const validateLogin = [
    body('email').isEmail().normalizeEmail().withMessage('请输入有效的邮箱地址'),
    body('password').notEmpty().withMessage('请输入密码'),
    handleValidation
];

// 创建订单验证
const validateCreateOrder = [
    body('items').isArray({ min: 1 }).withMessage('订单至少包含一件商品'),
    body('items.*.source_url').notEmpty().withMessage('商品链接不能为空'),
    body('items.*.price').isFloat({ min: 0.01 }).withMessage('商品价格必须大于0'),
    body('recipient_name').notEmpty().trim().withMessage('收货人姓名不能为空'),
    body('recipient_phone').notEmpty().withMessage('联系电话不能为空'),
    body('recipient_address').notEmpty().trim().withMessage('收货地址不能为空'),
    body('recipient_country').notEmpty().withMessage('国家/地区不能为空'),
    handleValidation
];

// 添加购物车验证
const validateAddToCart = [
    body('source_site').notEmpty().withMessage('来源平台不能为空'),
    body('source_url').notEmpty().withMessage('商品链接不能为空'),
    body('title').notEmpty().trim().withMessage('商品标题不能为空'),
    body('price').isFloat({ min: 0.01 }).withMessage('商品价格必须大于0'),
    handleValidation
];

// 地址验证
const validateAddress = [
    body('name').notEmpty().trim().withMessage('收货人姓名不能为空'),
    body('phone').notEmpty().withMessage('联系电话不能为空'),
    body('country').notEmpty().withMessage('国家/地区不能为空'),
    body('city').notEmpty().trim().withMessage('城市不能为空'),
    body('address').notEmpty().trim().withMessage('详细地址不能为空'),
    handleValidation
];

// 分页参数验证
const validatePagination = [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    handleValidation
];

module.exports = {
    validateRegister,
    validateLogin,
    validateCreateOrder,
    validateAddToCart,
    validateAddress,
    validatePagination
};
