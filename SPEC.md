# 13Ship 反向海淘转运平台 - 技术规格书

## 1. 项目概述

### 1.1 产品定位
**13Ship** 是一款专业的中文电商反向海淘转运平台，帮助全球用户从淘宝、1688、京东等中国电商平台购买商品，并提供仓储、转运、配送等一站式服务。

### 1.2 目标用户
- 海外华人、留学生
- 海外采购商、代购
- 跨境电商卖家
- 需要从中国进口商品的海外企业

### 1.3 核心功能
1. 贴链接下单（自动解析商品信息）
2. 定制订单（家具定制、批量采购）
3. 转运服务（仓库代收、合并打包）
4. 大件运输（整柜/拼柜海运）
5. 运费智能计算
6. 多语言/多币种支持
7. 会员系统
8. 推广佣金系统

---

## 2. 技术架构

### 2.1 技术栈
| 层级 | 技术 |
|------|------|
| 前端(用户端) | HTML5 + CSS3 + Vanilla JS (单页应用) |
| 前端(后台) | HTML5 + CSS3 + Vanilla JS |
| 后端 | Node.js + Express.js |
| 数据库 | SQLite (开发) / MySQL (生产) |
| 图片存储 | 本地 + CDN |

### 2.2 目录结构
```
13ship/
├── frontend/              # 用户端前端
│   ├── index.html         # 首页
│   ├── css/
│   ├── js/
│   └── assets/
├── admin/                 # 后台管理系统
│   ├── index.html
│   ├── css/
│   └── js/
├── backend/               # 后端API
│   ├── server.js          # 主服务
│   ├── routes/            # 路由
│   ├── models/            # 数据模型
│   ├── middleware/        # 中间件
│   └── database.js        # 数据库配置
└── uploads/               # 上传文件目录
```

---

## 3. 数据库设计

### 3.1 ER图概述
```
users (1) ─────< (N) orders
  │                 │
  │                 │
  └─── (N) addresses  └─── (N) order_items
  └─── (N) carts  ─────< (N) cart_items
  └─── (N) commissions
  
shipping_rules (1) ─────< (N) orders
articles (1) ─────< (N) article_categories
currencies (1) ─────< products
```

### 3.2 数据表详细设计

#### 3.2.1 users - 用户表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 用户ID |
| email | VARCHAR(255) | 邮箱(唯一) |
| password | VARCHAR(255) | 密码(加密) |
| name | VARCHAR(100) | 姓名 |
| phone | VARCHAR(50) | 电话 |
| avatar | VARCHAR(500) | 头像URL |
| level | ENUM('normal','vip','svip') | 会员等级 |
| balance | DECIMAL(10,2) | 账户余额 |
| total_spent | DECIMAL(10,2) | 累计消费 |
| referral_code | VARCHAR(20) | 邀请码 |
| referred_by | INTEGER FK | 推荐人ID |
| language | VARCHAR(10) | 默认语言 |
| currency | VARCHAR(10) | 默认币种 |
| created_at | DATETIME | 注册时间 |
| updated_at | DATETIME | 更新时间 |

#### 3.2.2 addresses - 收货地址表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 地址ID |
| user_id | INTEGER FK | 用户ID |
| country | VARCHAR(100) | 国家 |
| province | VARCHAR(100) | 省/州 |
| city | VARCHAR(100) | 城市 |
| address | TEXT | 详细地址 |
| zip_code | VARCHAR(20) | 邮编 |
| recipient_name | VARCHAR(100) | 收件人 |
| phone | VARCHAR(50) | 电话 |
| is_default | BOOLEAN | 是否默认 |

#### 3.2.3 products - 商品表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 商品ID |
| user_id | INTEGER FK | 用户ID(谁添加的) |
| order_id | INTEGER FK | 关联订单 |
| source_url | VARCHAR(500) | 原链接 |
| source_site | ENUM('taobao','1688','jd','other') | 来源平台 |
| title | VARCHAR(500) | 商品标题 |
| price | DECIMAL(10,2) | 单价(CNY) |
| quantity | INTEGER | 数量 |
| specs | TEXT | 规格(JSON) |
| image_url | VARCHAR(500) | 图片URL |
| notes | TEXT | 备注 |
| created_at | DATETIME | 添加时间 |

#### 3.2.4 orders - 订单主表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 订单ID |
| order_no | VARCHAR(50) | 订单号(唯一) |
| user_id | INTEGER FK | 用户ID |
| address_id | INTEGER FK | 收货地址ID |
| type | ENUM('link','custom','transport','large') | 订单类型 |
| status | ENUM('pending','confirmed','purchasing','in_warehouse','shipping','delivered','cancelled') | 状态 |
| subtotal | DECIMAL(10,2) | 商品小计 |
| shipping_fee | DECIMAL(10,2) | 运费 |
| service_fee | DECIMAL(10,2) | 服务费 |
| discount | DECIMAL(10,2) | 折扣 |
| total | DECIMAL(10,2) | 总计 |
| currency | VARCHAR(10) | 币种 |
| notes | TEXT | 备注 |
| tracking_no | VARCHAR(100) | 物流单号 |
| paid_at | DATETIME | 支付时间 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

#### 3.2.5 carts - 购物车表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 购物车ID |
| user_id | INTEGER FK | 用户ID |
| created_at | DATETIME | 创建时间 |

#### 3.2.6 cart_items - 购物车商品表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | ID |
| cart_id | INTEGER FK | 购物车ID |
| product_id | INTEGER FK | 商品ID |
| quantity | INTEGER | 数量 |

#### 3.2.7 shipping_rules - 运费规则表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 规则ID |
| country | VARCHAR(100) | 目的国家 |
| zone | INTEGER | 区域(分组) |
| first_weight | DECIMAL(10,2) | 首重(kg) |
| first_price | DECIMAL(10,2) | 首重价格 |
|续重 | DECIMAL(10,2) | 续重(kg) |
| continue_price | DECIMAL(10,2) | 续重价格 |
| volume_rate | DECIMAL(10,4) | 体积重比率 |
| min_days | INTEGER | 最少天数 |
| max_days | INTEGER | 最多天数 |
| enabled | BOOLEAN | 是否启用 |

#### 3.2.8 articles - 文章/帮助文档表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 文章ID |
| category | ENUM('guide','faq','policy','notice') | 分类 |
| title | VARCHAR(255) | 标题 |
| content | TEXT | 内容(HTML) |
| language | VARCHAR(10) | 语言 |
| sort | INTEGER | 排序 |
| published | BOOLEAN | 是否发布 |
| created_at | DATETIME | 创建时间 |

#### 3.2.9 currencies - 币种汇率表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | ID |
| code | VARCHAR(10) | 币种代码 |
| name | VARCHAR(50) | 币种名称 |
| symbol | VARCHAR(10) | 符号 |
| rate | DECIMAL(10,4) | 汇率(CNY基准) |
| updated_at | DATETIME | 更新时间 |

#### 3.2.10 commissions - 佣金记录表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | ID |
| user_id | INTEGER FK | 推广员ID |
| order_id | INTEGER FK | 关联订单 |
| amount | DECIMAL(10,2) | 佣金金额 |
| level | INTEGER | 佣金层级 |
| status | ENUM('pending','available','withdrawn') | 状态 |
| created_at | DATETIME | 创建时间 |

#### 3.2.11 notifications - 通知消息表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | ID |
| user_id | INTEGER FK | 接收用户 |
| type | ENUM('order','system','promotion') | 类型 |
| title | VARCHAR(255) | 标题 |
| content | TEXT | 内容 |
| is_read | BOOLEAN | 已读 |
| created_at | DATETIME | 创建时间 |

---

## 4. API 接口设计

### 4.1 用户相关
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 注册 |
| POST | /api/auth/login | 登录 |
| POST | /api/auth/logout | 登出 |
| GET | /api/auth/me | 获取当前用户 |
| PUT | /api/users/profile | 更新资料 |
| GET | /api/users/addresses | 获取地址列表 |
| POST | /api/users/addresses | 添加地址 |
| PUT | /api/users/addresses/:id | 更新地址 |
| DELETE | /api/users/addresses/:id | 删除地址 |

### 4.2 商品/购物车
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/cart | 获取购物车 |
| POST | /api/cart/items | 添加商品 |
| PUT | /api/cart/items/:id | 更新数量 |
| DELETE | /api/cart/items/:id | 删除商品 |
| POST | /api/products/parse | 解析商品链接 |

### 4.3 订单
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/orders | 获取订单列表 |
| POST | /api/orders | 创建订单 |
| GET | /api/orders/:id | 获取订单详情 |
| PUT | /api/orders/:id | 更新订单 |
| DELETE | /api/orders/:id | 取消订单 |
| POST | /api/orders/:id/confirm | 确认订单 |
| POST | /api/orders/:id/pay | 支付订单 |

### 4.4 运费/系统
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/shipping/calculate | 计算运费 |
| GET | /api/shipping/rules | 获取规则列表 |
| GET | /api/currencies | 获取币种汇率 |
| GET | /api/articles | 获取文章列表 |
| GET | /api/articles/:id | 获取文章详情 |

### 4.5 后台管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/admin/dashboard | 仪表盘统计 |
| GET | /api/admin/users | 用户列表 |
| GET | /api/admin/orders | 所有订单 |
| PUT | /api/admin/orders/:id | 更新订单状态 |
| GET | /api/admin/products | 商品列表 |
| POST | /api/admin/products | 添加商品 |
| PUT | /api/admin/products/:id | 更新商品 |
| GET | /api/admin/shipping-rules | 运费规则 |
| PUT | /api/admin/shipping-rules/:id | 更新规则 |
| GET | /api/admin/articles | 文章管理 |
| POST | /api/admin/articles | 添加文章 |
| GET | /api/admin/commissions | 佣金管理 |

---

## 5. 前端页面设计

### 5.1 用户端页面
1. **首页** - Banner + 四大服务入口 + 商品展示 + 搜索
2. **搜索结果页** - 商品列表 + 筛选 + 排序
3. **商品详情页** - 商品信息 + 规格选择 + 加入购物车
4. **购物车页** - 商品列表 + 运费计算 + 结算
5. **下单页** - 地址选择 + 订单确认 + 支付
6. **订单列表** - 我的订单 + 状态追踪
7. **订单详情** - 订单信息 + 物流动态
8. **个人中心** - 个人信息 + 地址管理 + 余额
9. **帮助中心** - 新手指引 + FAQ + 联系我们
10. **登录/注册页** - 表单 + 社交登录

### 5.2 后台管理页面
1. **登录页** - 管理员登录
2. **仪表盘** - 数据看板 + 图表
3. **订单管理** - 订单列表 + 详情 + 状态操作
4. **商品管理** - 商品列表 + 添加/编辑
5. **用户管理** - 用户列表 + 会员管理
6. **地址管理** - 用户地址查看
7. **运费模板** - 规则配置
8. **文章管理** - 帮助文档编辑
9. **佣金管理** - 推广佣金设置
10. **系统设置** - 基本配置

---

## 6. 首页苹果风格设计规范

### 6.1 配色方案
| 用途 | 色值 |
|------|------|
| 主色 | #0071e3 (Apple Blue) |
| 深色 | #1d1d1f |
| 成功 | #34c759 |
| 警告 | #ff9500 |
| 危险 | #ff3b30 |
| 文字 | #1d1d1f |
| 浅文字 | #86868b |
| 背景 | #f5f5f7 |
| 白色 | #ffffff |
| 边框 | #d2d2d7 |

### 6.2 字体
- 主字体: Inter
- 备选: -apple-system, BlinkMacSystemFont, sans-serif
- 权重: 300(轻), 400(常规), 500(中等), 600(半粗), 700(粗), 800(特粗)

### 6.3 间距系统
- 基础单位: 8px
- 间距: 8, 16, 24, 32, 40, 48, 64, 80, 120px

### 6.4 圆角
- 小: 8px
- 中: 12px
- 大: 16px
- 特大: 20px
- 卡片: 20px

### 6.5 阴影
- 轻: 0 2px 8px rgba(0,0,0,0.06)
- 中: 0 4px 20px rgba(0,0,0,0.08)
- 重: 0 12px 40px rgba(0,0,0,0.12)

---

## 7. 运费计算规则

### 7.1 计算公式
```
总运费 = 首重价格 + ceil((实际重量 - 首重) / 续重) * 续重价格
体积重 = 长(cm) * 宽(cm) * 高(cm) / 体积比率
计费重量 = max(实际重量, 体积重)
```

### 7.2 默认区域划分
| 区域 | 国家示例 |
|------|----------|
| 1区 | 香港、澳门、台湾 |
| 2区 | 日本、韩国、新加坡 |
| 3区 | 美国、加拿大、澳大利亚 |
| 4区 | 英国、法国、德国等欧洲 |
| 5区 | 其他国家 |

---

## 8. 订单状态流转

```
pending(待确认) → confirmed(已确认) → purchasing(采购中) 
→ in_warehouse(仓库中) → shipping(运输中) → delivered(已送达)
                                    ↓
                              cancelled(已取消)
```

---

## 9. 多语言支持

### 9.1 支持语言
- zh-CN: 简体中文
- en: English
- ja: 日本語
- ko: 한국어
- ru: Русский

### 9.2 翻译文件结构
```json
{
  "nav": {
    "home": {"zh-CN": "首页", "en": "Home", ...},
    "cart": {"zh-CN": "购物车", "en": "Cart", ...}
  },
  "order": {
    "types": {
      "link": {"zh-CN": "贴链接", "en": "Link Order", ...},
      "custom": {"zh-CN": "定制订单", "en": "Custom Order", ...},
      ...
    }
  }
}
```

---

## 10. 推广佣金规则

### 10.1 默认佣金比例
| 层级 | 比例 | 说明 |
|------|------|------|
| 一级 | 5% | 直接推荐 |
| 二级 | 2% | 间推荐 |

### 10.2 佣金计算
```
佣金 = 订单实付金额 * 佣金比例
```

---

## 11. 版本规划

### v1.0 (当前版本)
- [x] 首页苹果风格设计
- [x] 四大下单入口
- [x] 购物车功能
- [x] 用户注册/登录
- [x] 订单管理
- [x] 运费计算
- [x] 多语言/多币种
- [x] 后台管理系统

### v1.1 (下一版本)
- [ ] 推广佣金系统
- [ ] 实时物流追踪
- [ ] 商品自动解析增强

### v2.0 (未来版本)
- [ ] 移动端App
- [ ] 微信/支付宝支付集成
- [ ] AI智能推荐

---

*最后更新: 2025-05-09*
