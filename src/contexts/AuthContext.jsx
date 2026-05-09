/**
 * 认证上下文 - 管理用户登录状态
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getProfile, updateProfile, changePassword } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 检查登录状态
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, []);

    // 获取用户信息
    const fetchUser = async () => {
        try {
            const { user: userData } = await getProfile();
            setUser(userData);
            setError(null);
        } catch (err) {
            console.error('Fetch user error:', err);
            logout();
        } finally {
            setLoading(false);
        }
    };

    // 登录
    const login = useCallback(async (email, password) => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || '登录失败');
        }
        
        localStorage.setItem('token', data.token);
        setUser(data.user);
        return data;
    }, []);

    // 注册
    const register = useCallback(async (email, password, name, referralCode) => {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name, referral_code: referralCode })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || '注册失败');
        }
        
        localStorage.setItem('token', data.token);
        setUser(data.user);
        return data;
    }, []);

    // 登出
    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setUser(null);
        setError(null);
    }, []);

    // 更新个人资料
    const updateUserProfile = useCallback(async (profileData) => {
        const { user: updatedUser } = await updateProfile(profileData);
        setUser(updatedUser);
        return updatedUser;
    }, []);

    // 修改密码
    const updatePassword = useCallback(async (oldPassword, newPassword) => {
        await changePassword(oldPassword, newPassword);
    }, []);

    const value = {
        user,
        loading,
        error,
        isAuthenticated: !!user,
        isAdmin: user?.level === 'admin',
        isVIP: user?.level === 'vip' || user?.level === 'svip',
        login,
        register,
        logout,
        updateProfile: updateUserProfile,
        changePassword: updatePassword,
        refreshUser: fetchUser
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
