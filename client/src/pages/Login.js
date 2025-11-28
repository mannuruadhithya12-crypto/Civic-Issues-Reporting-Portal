import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [activeTab, setActiveTab] = useState('user'); // 'user' or 'admin'
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Forgot Password State
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetStep, setResetStep] = useState(1); // 1: Verify Username, 2: Reset Password
    const [resetUsername, setResetUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await login(email, password);
            // Redirect based on role
            if (res.data.role === 'admin') {
                navigate('/admin');
            } else if (res.data.role === 'worker') {
                navigate('/worker');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError('Invalid credentials');
        }
    };

    const handleVerifyUser = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await api.post('/auth/verify-user', { username: resetUsername });
            if (res.data.exists) {
                setResetStep(2);
                setError('');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'User verification failed');
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        try {
            await api.post('/auth/reset-password', { username: resetUsername, newPassword });
            setSuccess("Password reset successfully! Please login.");
            setTimeout(() => {
                setShowForgotPassword(false);
                setResetStep(1);
                setResetUsername('');
                setNewPassword('');
                setConfirmPassword('');
                setSuccess('');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '450px',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden'
            }}>
                {/* Blue Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #2196F3, #1976D2)',
                    padding: '2.5rem 2rem',
                    textAlign: 'center',
                    color: 'white'
                }}>
                    <h2 style={{
                        margin: 0,
                        fontSize: '1.75rem',
                        fontWeight: 600,
                        marginBottom: '0.5rem'
                    }}>
                        {showForgotPassword ? 'Reset Password' : 'Welcome Back'}
                    </h2>
                    <p style={{
                        margin: 0,
                        fontSize: '0.95rem',
                        opacity: 0.95
                    }}>
                        {showForgotPassword ? 'Recover your account access' : 'Sign in to your account'}
                    </p>
                </div>

                {/* Form Container */}
                <div style={{ padding: '2rem' }}>

                    {/* Error/Success Messages */}
                    {error && (
                        <div style={{
                            padding: '0.75rem',
                            background: '#ffebee',
                            color: '#c62828',
                            borderRadius: '8px',
                            marginBottom: '1rem',
                            fontSize: '0.875rem',
                            textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div style={{
                            padding: '0.75rem',
                            background: '#e8f5e9',
                            color: '#2e7d32',
                            borderRadius: '8px',
                            marginBottom: '1rem',
                            fontSize: '0.875rem',
                            textAlign: 'center'
                        }}>
                            {success}
                        </div>
                    )}

                    {!showForgotPassword ? (
                        <>
                            {/* Tabs */}
                            <div style={{
                                display: 'flex',
                                marginBottom: '2rem',
                                borderBottom: '2px solid #e0e0e0'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('user')}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: activeTab === 'user' ? '3px solid #2196F3' : '3px solid transparent',
                                        color: activeTab === 'user' ? '#2196F3' : '#757575',
                                        fontSize: '0.95rem',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        marginBottom: '-2px'
                                    }}
                                >
                                    User Login
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('admin')}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: activeTab === 'admin' ? '3px solid #2196F3' : '3px solid transparent',
                                        color: activeTab === 'admin' ? '#2196F3' : '#757575',
                                        fontSize: '0.95rem',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        marginBottom: '-2px'
                                    }}
                                >
                                    Admin Login
                                </button>
                            </div>

                            {/* Icon */}
                            <div style={{
                                textAlign: 'center',
                                marginBottom: '1.5rem'
                            }}>
                                {activeTab === 'user' ? (
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2196F3" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                ) : (
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2196F3" strokeWidth="2">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                    </svg>
                                )}
                            </div>

                            <form onSubmit={handleSubmit}>
                                {/* Email Field */}
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#424242', fontSize: '0.875rem', fontWeight: 500 }}>
                                        Email Address
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9e9e9e' }}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                                <polyline points="22,6 12,13 2,6"></polyline>
                                            </svg>
                                        </span>
                                        <input
                                            type="email"
                                            placeholder={activeTab === 'user' ? 'your@email.com' : 'admin@example.com'}
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.75rem', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '0.95rem', outline: 'none' }}
                                            onFocus={(e) => e.target.style.borderColor = '#2196F3'}
                                            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                                        />
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#424242', fontSize: '0.875rem', fontWeight: 500 }}>
                                        Password
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9e9e9e' }}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                            </svg>
                                        </span>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '0.75rem 2.75rem 0.75rem 2.75rem', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '0.95rem', outline: 'none' }}
                                            onFocus={(e) => e.target.style.borderColor = '#2196F3'}
                                            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9e9e9e' }}
                                        >
                                            {showPassword ? (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                                </svg>
                                            ) : (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                    <circle cx="12" cy="12" r="3"></circle>
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Forgot Password Link */}
                                <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotPassword(true)}
                                        style={{ background: 'none', border: 'none', color: '#2196F3', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 500 }}
                                    >
                                        Forgot Password?
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem',
                                        background: 'linear-gradient(135deg, #2196F3, #1976D2)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                        boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)'
                                    }}
                                    onMouseOver={(e) => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 6px 16px rgba(33, 150, 243, 0.4)'; }}
                                    onMouseOut={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.3)'; }}
                                >
                                    Sign In
                                </button>

                                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                    <p style={{ color: '#757575', fontSize: '0.9rem' }}>
                                        Don't have an account?{' '}
                                        <Link to="/register" style={{ color: '#2196F3', textDecoration: 'none', fontWeight: 500 }}>
                                            Create Account
                                        </Link>
                                    </p>
                                </div>
                            </form>
                        </>
                    ) : (
                        /* Forgot Password Flow */
                        <div>
                            {resetStep === 1 ? (
                                <form onSubmit={handleVerifyUser}>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#424242', fontSize: '0.875rem', fontWeight: 500 }}>
                                            Enter Username
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Your username"
                                            value={resetUsername}
                                            onChange={(e) => setResetUsername(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '0.95rem', outline: 'none' }}
                                            onFocus={(e) => e.target.style.borderColor = '#2196F3'}
                                            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        style={{ width: '100%', padding: '0.875rem', background: '#2196F3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', marginBottom: '1rem' }}
                                    >
                                        Verify User
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleResetPassword}>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#424242', fontSize: '0.875rem', fontWeight: 500 }}>
                                            New Password
                                        </label>
                                        <input
                                            type="password"
                                            placeholder="New password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '0.95rem', outline: 'none' }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#424242', fontSize: '0.875rem', fontWeight: 500 }}>
                                            Confirm Password
                                        </label>
                                        <input
                                            type="password"
                                            placeholder="Confirm password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '0.95rem', outline: 'none' }}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        style={{ width: '100%', padding: '0.875rem', background: '#4caf50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', marginBottom: '1rem' }}
                                    >
                                        Save Password
                                    </button>
                                </form>
                            )}

                            <button
                                type="button"
                                onClick={() => { setShowForgotPassword(false); setResetStep(1); setError(''); }}
                                style={{ width: '100%', padding: '0.75rem', background: 'none', border: '1px solid #e0e0e0', color: '#757575', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer' }}
                            >
                                Back to Login
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
