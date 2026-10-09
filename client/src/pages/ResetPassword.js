import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);

        try {
            const res = await api.post('/auth/reset-password', { token, newPassword: password });
            setMessage(res.data.message);
            setTimeout(() => navigate('/login'), 2500);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-160px)] py-8 px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-center text-white">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 backdrop-blur-md">
                        🔒
                    </div>
                    <h1 className="text-xl font-bold m-0 mb-1">Create New Password</h1>
                    <p className="text-xs text-blue-100 m-0">Enter your new secure password below.</p>
                </div>

                <div className="p-8">
                    {error && (
                        <div className="bg-red-50 text-red-600 border border-red-200 p-3.5 rounded-xl mb-5 text-xs flex items-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}
                    {message && (
                        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3.5 rounded-xl mb-5 text-xs flex items-center gap-2">
                            <span>✅</span> {message} Redirecting to login...
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div>
                            <label className="block mb-1.5 text-xs font-semibold text-gray-700">New Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter new password"
                                required
                                minLength={6}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs text-gray-800 focus:outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block mb-1.5 text-xs font-semibold text-gray-700">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                required
                                minLength={6}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs text-gray-800 focus:outline-none transition-all"
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading || !password}
                            className="cit-btn cit-btn-primary w-full py-3 text-xs font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    Saving New Password...
                                </span>
                            ) : (
                                'SAVE NEW PASSWORD'
                            )}
                        </button>
                    </form>

                    <div className="text-center mt-6">
                        <Link to="/login" className="text-blue-600 font-semibold text-xs hover:underline">
                            ← Back to Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
