/**
 * 管理员用户管理
 */
import { useState, useEffect } from 'react';
import { adminGetUsers, adminUpdateUser } from '../../services/api';

const LEVEL_MAP = {
    normal: { label: '普通用户', color: 'bg-gray-100 text-gray-800' },
    vip: { label: 'VIP', color: 'bg-yellow-100 text-yellow-800' },
    svip: { label: 'SVIP', color: 'bg-purple-100 text-purple-800' },
    admin: { label: '管理员', color: 'bg-red-100 text-red-800' }
};

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [filters, setFilters] = useState({ search: '', level: '' });

    useEffect(() => {
        loadUsers();
    }, [filters]);

    const loadUsers = async (page = 1) => {
        setLoading(true);
        try {
            const params = { page, limit: 20, ...filters };
            const data = await adminGetUsers(params);
            setUsers(data.users);
            setPagination(data.pagination);
        } catch (err) {
            console.error('Failed to load users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUser = async (userId, data) => {
        try {
            await adminUpdateUser(userId, data);
            loadUsers();
            setSelectedUser(null);
        } catch (err) {
            alert('更新失败: ' + err.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
                <div className="flex gap-3">
                    <input
                        type="text"
                        placeholder="搜索邮箱/姓名..."
                        className="px-4 py-2 border rounded-lg"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                    <select
                        className="px-4 py-2 border rounded-lg"
                        value={filters.level}
                        onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                    >
                        <option value="">全部级别</option>
                        {Object.entries(LEVEL_MAP).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 用户列表 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">用户</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">级别</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">余额</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">累计消费</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">状态</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">最后登录</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">注册时间</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="px-4 py-8 text-center text-gray-500">加载中...</td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-4 py-8 text-center text-gray-500">暂无用户</td>
                                </tr>
                            ) : users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{user.name || '未设置'}</div>
                                        <div className="text-sm text-gray-500">{user.email}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs rounded-full ${LEVEL_MAP[user.level]?.color}`}>
                                            {LEVEL_MAP[user.level]?.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">¥{user.balance.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-sm">¥{user.totalSpent.toFixed(2)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {user.isActive ? '正常' : '禁用'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        {user.lastLoginAt ? user.lastLoginAt.split('T')[0] : '从未登录'}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        {user.createdAt?.split('T')[0]}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => setSelectedUser(user)}
                                            className="text-blue-600 hover:text-blue-800 text-sm"
                                        >
                                            编辑
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
                                onClick={() => loadUsers(pagination.page - 1)}
                                className="px-3 py-1 text-sm bg-gray-100 rounded disabled:opacity-50"
                            >
                                上一页
                            </button>
                            <button
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => loadUsers(pagination.page + 1)}
                                className="px-3 py-1 text-sm bg-gray-100 rounded disabled:opacity-50"
                            >
                                下一页
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 用户编辑弹窗 */}
            {selectedUser && (
                <UserEditModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    onSave={handleUpdateUser}
                />
            )}
        </div>
    );
}

function UserEditModal({ user, onClose, onSave }) {
    const [level, setLevel] = useState(user.level);
    const [balance, setBalance] = useState(user.balance);
    const [isActive, setIsActive] = useState(user.isActive);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(user.id, { level, balance, is_active: isActive });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full">
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-lg font-semibold">编辑用户</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                        <input type="text" value={user.email} disabled className="w-full px-3 py-2 bg-gray-100 border rounded-lg" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                        <input type="text" value={user.name || ''} disabled className="w-full px-3 py-2 bg-gray-100 border rounded-lg" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">用户级别</label>
                        <select
                            value={level}
                            onChange={(e) => setLevel(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            <option value="normal">普通用户</option>
                            <option value="vip">VIP</option>
                            <option value="svip">SVIP</option>
                            <option value="admin">管理员</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">余额</label>
                        <input
                            type="number"
                            step="0.01"
                            value={balance}
                            onChange={(e) => setBalance(parseFloat(e.target.value))}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="w-4 h-4"
                        />
                        <label htmlFor="isActive" className="text-sm text-gray-700">账号正常</label>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
                            取消
                        </button>
                        <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            保存
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
