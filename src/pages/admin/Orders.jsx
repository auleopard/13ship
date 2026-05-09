/**
 * 管理员订单管理
 */
import { useState, useEffect } from 'react';
import { adminGetOrders, adminUpdateOrderStatus, adminAddShipment } from '../../services/api';

const STATUS_MAP = {
    pending: { label: '待处理', color: 'bg-yellow-100 text-yellow-800' },
    confirmed: { label: '已确认', color: 'bg-blue-100 text-blue-800' },
    purchasing: { label: '采购中', color: 'bg-indigo-100 text-indigo-800' },
    in_warehouse: { label: '已入库', color: 'bg-purple-100 text-purple-800' },
    shipping: { label: '配送中', color: 'bg-orange-100 text-orange-800' },
    delivered: { label: '已完成', color: 'bg-green-100 text-green-800' },
    cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-800' },
    refunded: { label: '已退款', color: 'bg-red-100 text-red-800' }
};

export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [filters, setFilters] = useState({ status: '', search: '' });

    useEffect(() => {
        loadOrders();
    }, [filters]);

    const loadOrders = async (page = 1) => {
        setLoading(true);
        try {
            const params = { page, limit: 20, ...filters };
            const data = await adminGetOrders(params);
            setOrders(data.orders);
            setPagination(data.pagination);
        } catch (err) {
            console.error('Failed to load orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            await adminUpdateOrderStatus(orderId, newStatus);
            loadOrders();
            if (selectedOrder?.id === orderId) {
                const updated = orders.find(o => o.id === orderId);
                setSelectedOrder({ ...selectedOrder, status: newStatus });
            }
        } catch (err) {
            alert('更新失败: ' + err.message);
        }
    };

    const handleAddShipment = async (orderId, data) => {
        try {
            await adminAddShipment(orderId, data);
            alert('物流信息已添加');
            loadOrders();
        } catch (err) {
            alert('添加失败: ' + err.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">订单管理</h1>
                <div className="flex gap-3">
                    <input
                        type="text"
                        placeholder="搜索订单号/邮箱/收货人..."
                        className="px-4 py-2 border rounded-lg"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                    <select
                        className="px-4 py-2 border rounded-lg"
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    >
                        <option value="">全部状态</option>
                        {Object.entries(STATUS_MAP).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 订单列表 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">订单号</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">用户</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">收货人</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">金额</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">状态</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">时间</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">加载中...</td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">暂无订单</td>
                                </tr>
                            ) : orders.map(order => (
                                <tr key={order.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-sm">{order.orderNo}</span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <div>{order.userEmail}</div>
                                        <div className="text-gray-500 text-xs">{order.userName}</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm">{order.recipient.name}</td>
                                    <td className="px-4 py-3 text-sm font-medium">¥{order.total.toFixed(2)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs rounded-full ${STATUS_MAP[order.status]?.color}`}>
                                            {STATUS_MAP[order.status]?.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{order.createdAt?.split('T')[0]}</td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => setSelectedOrder(order)}
                                            className="text-blue-600 hover:text-blue-800 text-sm"
                                        >
                                            详情
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 分页 */}
                {pagination.totalPages > 1 && (
                    <div className="px-4 py-3 border-t flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                            共 {pagination.total} 条，第 {pagination.page}/{pagination.totalPages} 页
                        </span>
                        <div className="flex gap-2">
                            <button
                                disabled={pagination.page <= 1}
                                onClick={() => loadOrders(pagination.page - 1)}
                                className="px-3 py-1 text-sm bg-gray-100 rounded disabled:opacity-50"
                            >
                                上一页
                            </button>
                            <button
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => loadOrders(pagination.page + 1)}
                                className="px-3 py-1 text-sm bg-gray-100 rounded disabled:opacity-50"
                            >
                                下一页
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 订单详情弹窗 */}
            {selectedOrder && (
                <OrderDetailModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onStatusChange={handleStatusChange}
                    onAddShipment={handleAddShipment}
                />
            )}
        </div>
    );
}

function OrderDetailModal({ order, onClose, onStatusChange, onAddShipment }) {
    const [trackingNo, setTrackingNo] = useState('');
    const [carrier, setCarrier] = useState('');

    const handleSubmitShipment = (e) => {
        e.preventDefault();
        onAddShipment(order.id, { tracking_no: trackingNo, carrier });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
                    <h2 className="text-lg font-semibold">订单详情 - {order.orderNo}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
                </div>

                <div className="p-6 space-y-6">
                    {/* 基本信息 */}
                    <div>
                        <h3 className="font-medium text-gray-900 mb-3">基本信息</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">状态:</span>
                                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${STATUS_MAP[order.status]?.color}`}>
                                    {STATUS_MAP[order.status]?.label}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500">总金额:</span>
                                <span className="ml-2 font-medium">¥{order.total.toFixed(2)}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">商品金额:</span>
                                <span className="ml-2">¥{order.subtotal.toFixed(2)}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">服务费:</span>
                                <span className="ml-2">¥{order.serviceFee.toFixed(2)}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">运费:</span>
                                <span className="ml-2">¥{order.shippingFee.toFixed(2)}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">用户:</span>
                                <span className="ml-2">{order.userEmail}</span>
                            </div>
                        </div>
                    </div>

                    {/* 收货信息 */}
                    <div>
                        <h3 className="font-medium text-gray-900 mb-3">收货信息</h3>
                        <div className="text-sm space-y-1">
                            <p><span className="text-gray-500">姓名:</span> {order.recipient.name}</p>
                            <p><span className="text-gray-500">电话:</span> {order.recipient.phone}</p>
                            <p><span className="text-gray-500">国家:</span> {order.recipient.country}</p>
                            <p><span className="text-gray-500">城市:</span> {order.recipient.city}</p>
                            <p><span className="text-gray-500">地址:</span> {order.recipient.address}</p>
                        </div>
                    </div>

                    {/* 商品列表 */}
                    <div>
                        <h3 className="font-medium text-gray-900 mb-3">商品列表</h3>
                        <div className="space-y-2">
                            {order.items?.map(item => (
                                <div key={item.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-2xl">
                                        {item.sourceSite === 'taobao' ? '🛒' : item.sourceSite === 'tmall' ? '🏬' : item.sourceSite === 'jd' ? '📱' : '📦'}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{item.title}</p>
                                        <p className="text-xs text-gray-500">{item.shopName}</p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            ¥{item.price} × {item.quantity}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 操作 */}
                    <div>
                        <h3 className="font-medium text-gray-900 mb-3">状态管理</h3>
                        <div className="flex flex-wrap gap-2">
                            {['pending', 'confirmed', 'purchasing', 'in_warehouse', 'shipping', 'delivered', 'cancelled'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => onStatusChange(order.id, status)}
                                    disabled={order.status === status}
                                    className={`px-3 py-1.5 text-sm rounded-lg border ${
                                        order.status === status 
                                            ? 'bg-gray-100 cursor-not-allowed' 
                                            : 'hover:bg-gray-50'
                                    }`}
                                >
                                    → {STATUS_MAP[status]?.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 添加物流 */}
                    {order.status === 'in_warehouse' && (
                        <div>
                            <h3 className="font-medium text-gray-900 mb-3">添加物流</h3>
                            <form onSubmit={handleSubmitShipment} className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="物流单号"
                                    value={trackingNo}
                                    onChange={(e) => setTrackingNo(e.target.value)}
                                    className="flex-1 px-3 py-2 border rounded-lg"
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="快递公司"
                                    value={carrier}
                                    onChange={(e) => setCarrier(e.target.value)}
                                    className="w-32 px-3 py-2 border rounded-lg"
                                    required
                                />
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                                    添加
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
