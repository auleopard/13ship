/**
 * 管理员仪表盘
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminGetOrderStats, adminGetUserStats } from '../../services/api';

export default function Dashboard() {
    const [orderStats, setOrderStats] = useState(null);
    const [userStats, setUserStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const [orderData, userData] = await Promise.all([
                adminGetOrderStats(),
                adminGetUserStats()
            ]);
            setOrderStats(orderData.stats);
            setUserStats(userData.stats);
        } catch (err) {
            console.error('Failed to load stats:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const stats = [
        { label: '总订单', value: orderStats?.total || 0, icon: '📦', color: 'bg-blue-500' },
        { label: '待处理', value: orderStats?.pending || 0, icon: '⏳', color: 'bg-yellow-500' },
        { label: '进行中', value: orderStats?.shipping || 0, icon: '🚚', color: 'bg-purple-500' },
        { label: '已完成', value: orderStats?.completed || 0, icon: '✅', color: 'bg-green-500' },
        { label: '今日订单', value: orderStats?.todayOrders || 0, icon: '📅', color: 'bg-indigo-500' },
        { label: '总收入', value: `¥${(orderStats?.totalRevenue || 0).toLocaleString()}`, icon: '💰', color: 'bg-emerald-500' },
        { label: '总用户', value: userStats?.total || 0, icon: '👥', color: 'bg-rose-500' },
        { label: '新增用户', value: userStats?.newToday || 0, icon: '🆕', color: 'bg-cyan-500' }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">管理后台</h1>
                <button onClick={loadStats} className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
                    🔄 刷新数据
                </button>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">{stat.label}</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                            </div>
                            <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl`}>
                                {stat.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 快捷操作 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <Link to="/admin/orders" className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-center">
                            <div className="text-2xl mb-1">📦</div>
                            <div className="text-sm font-medium text-blue-700">订单管理</div>
                        </Link>
                        <Link to="/admin/users" className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-center">
                            <div className="text-2xl mb-1">👥</div>
                            <div className="text-sm font-medium text-purple-700">用户管理</div>
                        </Link>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">订单状态分布</h2>
                    <div className="space-y-3">
                        {[
                            { label: '待处理', value: orderStats?.pending || 0, color: 'bg-yellow-400' },
                            { label: '已确认', value: orderStats?.confirmed || 0, color: 'bg-blue-400' },
                            { label: '配送中', value: orderStats?.shipping || 0, color: 'bg-purple-400' },
                            { label: '已完成', value: orderStats?.completed || 0, color: 'bg-green-400' },
                            { label: '已取消', value: orderStats?.cancelled || 0, color: 'bg-gray-400' }
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="w-16 text-sm text-gray-600">{item.label}</span>
                                <div className="flex-1 bg-gray-100 rounded-full h-2">
                                    <div 
                                        className={`${item.color} h-2 rounded-full`}
                                        style={{ width: `${Math.min((item.value / (orderStats?.total || 1)) * 100, 100)}%` }}
                                    ></div>
                                </div>
                                <span className="w-8 text-sm font-medium text-gray-900">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
