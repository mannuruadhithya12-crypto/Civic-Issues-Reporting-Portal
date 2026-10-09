import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const refetchUser = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const res = await api.get('/auth/me');
                const userData = res.data.user;
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
                return userData;
            } catch (err) {
                console.error("Token invalid or expired", err);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUser(null);
            }
        }
        return null;
    };

    useEffect(() => {
        const loadUser = async () => {
            await refetchUser();
            setLoading(false);
        };
        loadUser();
    }, []);

    const updateUser = (updatedFields) => {
        setUser(prev => {
            const next = { ...prev, ...updatedFields };
            localStorage.setItem('user', JSON.stringify(next));
            return next;
        });
    };

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        return res.data;
    };

    const register = async (name, email, phone, password, role, department) => {
        const res = await api.post('/auth/register', { name, email, phone, password, role, department });
        return res.data;
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (err) {
            console.error("Logout error", err);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, setUser, updateUser, refetchUser, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

