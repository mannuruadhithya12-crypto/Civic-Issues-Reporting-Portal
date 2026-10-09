import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import '../styles/login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [language, setLanguage] = useState('English');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [stats, setStats] = useState({ reported: '10K+', resolved: '8K+', active: '25K+' });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/issues');
                if (Array.isArray(res.data) && res.data.length > 0) {
                    const total = res.data.length;
                    const resolved = res.data.filter(i => i.status === 'resolved' || i.status === 'closed').length;
                    setStats({
                        reported: total > 10 ? `${total}+` : `${total}`,
                        resolved: resolved > 5 ? `${resolved}+` : `${resolved}`,
                        active: '25K+'
                    });
                }
            } catch (err) {
                // Presentational stats fallback
            }
        };
        fetchStats();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            setError('Please enter your email address.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await login(trimmedEmail, password);
            if (res.user.role === 'admin') {
                navigate('/admin');
            } else if (res.user.role === 'worker') {
                navigate('/worker');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid email or password.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="civic-login-page">
            <div className="civic-login-container">
                
                {/* ================= LEFT BRAND & VISUAL PANEL ================= */}
                <div className="login-brand-panel">
                    
                    {/* Top Header Logo */}
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="brand-header-logo">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                                    <polyline points="2 17 12 22 22 17" />
                                    <polyline points="2 12 12 17 22 12" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="brand-title">CivicConnect</h2>
                                <p className="brand-tagline">Cleaner Cities. Stronger Communities.</p>
                            </div>
                        </div>

                        {/* Hero Headings */}
                        <h1 className="hero-heading">
                            A Cleaner City<br />
                            <span className="hero-heading-highlight">A Better Tomorrow</span>
                        </h1>

                        <p className="hero-description">
                            Report issues. Track progress. Build a safer, cleaner and more livable community together.
                        </p>

                        {/* 3 Feature Columns */}
                        <div className="feature-columns-grid">
                            <div className="feature-column-card">
                                <div className="feature-icon-wrapper bg-blue-100 text-blue-600">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                                </div>
                                <span className="feature-title">Report</span>
                                <span className="feature-desc">Spot an issue?<br />Take a photo and report it.</span>
                            </div>

                            <div className="feature-column-card">
                                <div className="feature-icon-wrapper bg-emerald-100 text-emerald-600">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                </div>
                                <span className="feature-title">Track</span>
                                <span className="feature-desc">Follow real-time progress<br />on your reports.</span>
                            </div>

                            <div className="feature-column-card">
                                <div className="feature-icon-wrapper bg-purple-100 text-purple-600">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                </div>
                                <span className="feature-title">Resolve</span>
                                <span className="feature-desc">Authorities and field workers<br />act to make a better city.</span>
                            </div>
                        </div>
                    </div>

                    {/* Lower City Vector Illustration & Floating Pill Card */}
                    <div className="city-illustration-container">
                        <svg className="city-illustration-image opacity-90" viewBox="0 0 500 160" fill="currentColor">
                            <ellipse cx="80" cy="30" rx="30" ry="12" fill="#ffffff" opacity="0.6" />
                            <ellipse cx="380" cy="40" rx="45" ry="16" fill="#ffffff" opacity="0.6" />
                            <circle cx="440" cy="30" r="18" fill="#fcd34d" />
                            <rect x="30" y="50" width="45" height="110" rx="2" fill="#1e293b" />
                            <rect x="42" y="60" width="7" height="10" fill="#fef08a" />
                            <rect x="58" y="60" width="7" height="10" fill="#fef08a" />
                            <rect x="90" y="30" width="60" height="130" rx="3" fill="#334155" />
                            <rect x="165" y="55" width="50" height="105" rx="2" fill="#0f172a" />
                            <rect x="230" y="25" width="65" height="135" rx="3" fill="#1e293b" />
                            <rect x="310" y="45" width="55" height="115" rx="2" fill="#334155" />
                            <rect x="380" y="65" width="45" height="95" rx="2" fill="#1e293b" />
                            <circle cx="20" cy="115" r="22" fill="#16a34a" />
                            <rect x="18" y="130" width="5" height="30" fill="#78350f" />
                            <circle cx="470" cy="110" r="25" fill="#15803d" />
                            <rect x="467" y="128" width="6" height="32" fill="#78350f" />
                        </svg>
                    </div>

                    {/* Floating Statistics Pill */}
                    <div className="stats-pill-card">
                        <div className="stat-item">
                            <div className="stat-icon-badge bg-emerald-100 text-emerald-600">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.4 19 2c1 2 2 4.1 2 7 0 6-4.5 11-10 11z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
                            </div>
                            <div>
                                <div className="stat-value">{stats.reported}</div>
                                <div className="stat-label">Issues Reported</div>
                            </div>
                        </div>

                        <div className="stat-divider"></div>

                        <div className="stat-item">
                            <div className="stat-icon-badge bg-blue-100 text-blue-600">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                            <div>
                                <div className="stat-value">{stats.resolved}</div>
                                <div className="stat-label">Issues Resolved</div>
                            </div>
                        </div>

                        <div className="stat-divider"></div>

                        <div className="stat-item">
                            <div className="stat-icon-badge bg-purple-100 text-purple-600">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            </div>
                            <div>
                                <div className="stat-value">{stats.active}</div>
                                <div className="stat-label">Active Citizens</div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* ================= RIGHT AUTHENTICATION PANEL ================= */}
                <div className="login-auth-panel">
                    
                    {/* Language Selector Top Right */}
                    <div className="language-selector-wrapper">
                        <div className="language-selector-pill">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                            <select 
                                value={language} 
                                onChange={(e) => setLanguage(e.target.value)}
                                className="language-select"
                            >
                                <option value="English">English</option>
                                <option value="Spanish">Español</option>
                                <option value="French">Français</option>
                            </select>
                        </div>
                    </div>

                    {/* Centered Desktop Login Card */}
                    <div className="login-card-container">
                        <div className="login-card">
                            
                            {/* Card Header */}
                            <div className="login-card-header">
                                <h2>Welcome Back 👋</h2>
                                <div className="subtitle">Sign in to continue to CivicConnect</div>
                                <div className="secondary-subtitle">Together for cleaner cities and stronger communities.</div>
                            </div>

                            {/* Inline Error Alert */}
                            {error && (
                                <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-xl text-xs flex items-center gap-2">
                                    <span>⚠️</span>
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                
                                {/* Email Field */}
                                <div className="login-form-group">
                                    <label className="login-field-label">Email Address</label>
                                    <div className="login-input-wrapper">
                                        <svg className="login-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Enter your email address"
                                            required
                                            className="login-input-field"
                                        />
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="login-form-group">
                                    <label className="login-field-label">Password</label>
                                    <div className="login-input-wrapper">
                                        <svg className="login-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter your password"
                                            required
                                            className="login-input-field"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="login-password-toggle"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? (
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                            ) : (
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Forgot Password Link */}
                                <div className="text-right">
                                    <Link to="/forgot-password" className="forgot-password-link">
                                        Forgot Password?
                                    </Link>
                                </div>

                                {/* Sign In Button */}
                                <button 
                                    type="submit" 
                                    disabled={isLoading}
                                    className="login-submit-button"
                                >
                                    {isLoading ? (
                                        <span>Signing In...</span>
                                    ) : (
                                        <>
                                            <svg className="login-submit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                                            <span>Sign In</span>
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Create Account */}
                            <div className="register-prompt">
                                Don't have an account? {' '}
                                <Link to="/register" className="register-link">
                                    Create Account
                                </Link>
                            </div>

                            {/* Security Notice Panel */}
                            <div className="security-notice-box">
                                <svg className="security-notice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                <p className="security-notice-text">
                                    Your data is secure with enterprise-grade security and privacy protection.
                                </p>
                            </div>

                        </div>
                    </div>

                    <div></div>
                </div>

            </div>
        </div>
    );
};

export default Login;
