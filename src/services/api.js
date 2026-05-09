/**
 * 13Ship API 服务层
 * 对接后端 REST API
 */

const API_BASE = '/api';

// 获取 token
const getToken = () => localStorage.getItem('token');

// 获取用户信息
export const getProfile = async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error('获取用户信息失败');
    return res.json();
};

// 更新用户资料
export const updateProfile = async (data) => {
    const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('更新失败');
    return res.json();
};

// 修改密码
export const changePassword = async (oldPassword, newPassword) => {
    const res = await fetch(`${API_BASE}/auth/password`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
    });
    if (!res.ok) throw new Error('修改失败');
    return res.json();
};

// 获取商品来源平台
export const getPlatforms = async () => {
    const res = await fetch(`${API_BASE}/products/platforms`);
    if (!res.ok) throw new Error('获取平台列表失败');
    return res.json();
};

// 解析商品链接
export const parseProduct = async (url) => {
    const res = await fetch(`${API_BASE}/products/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
    });
    if (!res.ok) throw new Error('解析商品失败');
    return res.json();
};

// 获取运费规则
export const getShippingRules = async (country) => {
    const url = country ? `${API_BASE}/shipping/rules?country=${country}` : `${API_BASE}/shipping/rules`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('获取运费规则失败');
    return res.json();
};

// 计算运费
export const calculateShipping = async (country, weight, subtotal) => {
    const params = new URLSearchParams({ country, weight, subtotal });
    const res = await fetch(`${API_BASE}/shipping/calculate?${params}`);
    if (!res.ok) throw new Error('计算运费失败');
    return res.json();
};

// 获取支持的国家列表
export const getCountries = async () => {
    const res = await fetch(`${API_BASE}/shipping/countries`);
    if (!res.ok) throw new Error('获取国家列表失败');
    return res.json();
};

// 获取购物车
export const getCart = async () => {
    const res = await fetch(`${API_BASE}/cart`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error('获取购物车失败');
    return res.json();
};

// 添加到购物车
export const addToCart = async (item) => {
    const res = await fetch(`${API_BASE}/cart`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(item)
    });
    if (!res.ok) throw new Error('添加失败');
    return res.json();
};

// 更新购物车商品
export const updateCartItem = async (id, data) => {
    const res = await fetch(`${API_BASE}/cart/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('更新失败');
    return res.json();
};

// 删除购物车商品
export const removeFromCart = async (id) => {
    const res = await fetch(`${API_BASE}/cart/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error('删除失败');
    return res.json();
};

// 清空购物车
export const clearCart = async () => {
    const res = await fetch(`${API_BASE}/cart`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error('清空失败');
    return res.json();
};

// 获取收货地址
export const getAddresses = async () => {
    const res = await fetch(`${API_BASE}/addresses`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error('获取地址失败');
    return res.json();
};

// 添加收货地址
export const addAddress = async (address) => {
    const res = await fetch(`${API_BASE}/addresses`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(address)
    });
    if (!res.ok) throw new Error('添加失败');
    return res.json();
};

// 更新收货地址
export const updateAddress = async (id, address) => {
    const res = await fetch(`${API_BASE}/addresses/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(address)
    });
    if (!res.ok) throw new Error('更新失败');
    return res.json();
};

// 删除收货地址
export const deleteAddress = async (id) => {
    const res = await fetch(`${API_BASE}/addresses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error('删除失败');
    return res.json();
};

// 设为默认地址
export const setDefaultAddress = async (id) => {
    const res = await fetch(`${API_BASE}/addresses/${id}/default`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error('设置失败');
    return res.json();
};

// 获取订单列表
export const getOrders = async (params = {}) => {
    const searchParams = new URLSearchParams(params);
    const res = await fetch(`${API_BASE}/orders?${searchParams}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error('获取订单失败');
    return res.json();
};

// 获取订单详情
export const getOrderDetail = async (id) => {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error('获取订单详情失败');
    return res.json();
};

// 创建订单
export const createOrder = async (orderData) => {
    const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(orderData)
    });
    if (!res.ok) throw new Error('创建订单失败');
    return res.json();
};

// 取消订单
export const cancelOrder = async (id) => {
    const res = await fetch(`${API_BASE}/orders/${id}/cancel`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error('取消订单失败');
    return res.json();
};

// 追踪物流
export const trackOrder = async (id) => {
    const res = await fetch(`${API_BASE}/orders/${id}/track`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error('获取物流失败');
    return res.json();
};

// ==================== 管理员 API ====================

export const adminGetOrders = async (params = {}) => {
    const searchParams = new URLSearchParams(params);
    const res = await fetch(`${API_BASE}/admin/orders?${searchParams}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error('获取订单失败');
    return res.json();
};

export const adminGetOrderDetail = async (id) => {
    const res = await fetch(`${API_BASE}/admin/orders/${id}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error('获取订单详情失败');
    return res.json();
};

export const adminUpdateOrderStatus = async (id, status, notes) => {
    const res = await fetch(`${API_BASE}/admin/orders/${id}/status`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ status, admin_notes: notes })
    });
    if (!res.ok) throw new Error('更新状态失败');
    return res.json();
};

export const adminAddShipment = async (id, data) => {
    const res = await fetch(`${API_BASE}/admin/orders/${id}/shipment`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('添加物流失败');
    return res.json();
};

export const adminGetOrderStats = async () => {
    const res = await fetch(`${API_BASE}/admin/orders/stats/summary`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error('获取统计失败');
    return res.json();
};

export const adminGetUsers = async (params = {}) => {
    const searchParams = new URLSearchParams(params);
    const res = await fetch(`${API_BASE}/admin/users?${searchParams}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error('获取用户失败');
    return res.json();
};

export const adminGetUserDetail = async (id) => {
    const res = await fetch(`${API_BASE}/admin/users/${id}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error('获取用户详情失败');
    return res.json();
};

export const adminUpdateUser = async (id, data) => {
    const res = await fetch(`${API_BASE}/admin/users/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('更新用户失败');
    return res.json();
};

export const adminGetUserStats = async () => {
    const res = await fetch(`${API_BASE}/admin/users/stats/overview`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error('获取统计失败');
    return res.json();
};

export const adminGetSettings = async () => {
    const res = await fetch(`${API_BASE}/admin/settings`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error('获取设置失败');
    return res.json();
};

export const adminUpdateSettings = async (settings) => {
    const res = await fetch(`${API_BASE}/admin/settings`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('更新设置失败');
    return res.json();
};
