import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

const WorkerProfile = () => {
    const { user } = useContext(AuthContext);
    const [tasksCompleted, setTasksCompleted] = useState(0);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/worker/assigned');
                const completed = res.data.filter(i => i.status === 'resolved' || i.status === 'closed').length;
                setTasksCompleted(completed);
            } catch (err) {
                console.error("Failed to fetch worker stats", err);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="w-page-wrapper" style={{ backgroundColor: '#f9fafb', padding: '1.5rem', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--w-neutral-900)' }}>My Profile</h1>
                    <p style={{ color: 'var(--w-neutral-500)', margin: 0 }}>Manage your account settings and preferences.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                    
                    {/* Left Column: Avatar & Quick Stats */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="w-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                                <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: 'var(--w-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 700, boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}>
                                    {user?.name ? user.name.substring(0, 2).toUpperCase() : 'WK'}
                                </div>
                                <div style={{ position: 'absolute', bottom: '0', right: '0', width: '24px', height: '24px', backgroundColor: 'var(--w-success)', border: '4px solid white', borderRadius: '50%' }}></div>
                            </div>
                            <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.5rem', fontWeight: 700, color: 'var(--w-neutral-900)' }}>
                                {user?.name || user?.username || 'Field Worker'}
                            </h2>
                            <div style={{ color: 'var(--w-neutral-500)', fontSize: '0.875rem', marginBottom: '1rem', fontWeight: 500 }}>
                                Field Operations Team
                            </div>
                            <div style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
                                Active - On Duty
                            </div>
                        </div>

                        <div className="w-card" style={{ padding: '0' }}>
                            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--w-neutral-100)' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--w-neutral-900)' }}>Employee Info</h3>
                            </div>
                            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--w-neutral-500)', fontSize: '0.875rem' }}>Employee ID</span>
                                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--w-neutral-900)' }}>#WK-{user?._id?.substring(user._id.length - 4).toUpperCase() || '1024'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--w-neutral-500)', fontSize: '0.875rem' }}>Joined</span>
                                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--w-neutral-900)' }}>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Unknown'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--w-neutral-500)', fontSize: '0.875rem' }}>Total Tasks</span>
                                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--w-neutral-900)' }}>{tasksCompleted}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--w-neutral-500)', fontSize: '0.875rem' }}>Rating</span>
                                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--w-warning)' }}>4.8 ★</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Settings */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="w-card" style={{ padding: '0' }}>
                            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--w-neutral-100)' }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--w-neutral-900)' }}>Personal Information</h3>
                            </div>
                            <div style={{ padding: '2rem' }}>
                                <form onSubmit={(e) => e.preventDefault()}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--w-neutral-700)', marginBottom: '0.5rem' }}>Full Name</label>
                                            <input 
                                                type="text" 
                                                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--w-neutral-300)', borderRadius: '8px', fontSize: '0.875rem' }} 
                                                defaultValue={user?.name || user?.username} 
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--w-neutral-700)', marginBottom: '0.5rem' }}>Username</label>
                                            <input 
                                                type="text" 
                                                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--w-neutral-200)', borderRadius: '8px', fontSize: '0.875rem', backgroundColor: 'var(--w-neutral-50)', color: 'var(--w-neutral-500)' }} 
                                                defaultValue={user?.username} 
                                                disabled 
                                            />
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--w-neutral-700)', marginBottom: '0.5rem' }}>Email Address</label>
                                            <input 
                                                type="email" 
                                                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--w-neutral-300)', borderRadius: '8px', fontSize: '0.875rem' }} 
                                                defaultValue={user?.email} 
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--w-neutral-700)', marginBottom: '0.5rem' }}>Phone Number</label>
                                            <input 
                                                type="tel" 
                                                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--w-neutral-300)', borderRadius: '8px', fontSize: '0.875rem' }} 
                                                placeholder="+1 (555) 000-0000" 
                                            />
                                        </div>
                                    </div>

                                    <h4 style={{ margin: '0 0 1.5rem 0', fontSize: '1.125rem', fontWeight: 600, color: 'var(--w-neutral-900)' }}>Change Password</h4>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--w-neutral-700)', marginBottom: '0.5rem' }}>Current Password</label>
                                            <input 
                                                type="password" 
                                                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--w-neutral-300)', borderRadius: '8px', fontSize: '0.875rem' }} 
                                                placeholder="••••••••" 
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--w-neutral-700)', marginBottom: '0.5rem' }}>New Password</label>
                                            <input 
                                                type="password" 
                                                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--w-neutral-300)', borderRadius: '8px', fontSize: '0.875rem' }} 
                                                placeholder="••••••••" 
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--w-neutral-200)', paddingTop: '1.5rem' }}>
                                        <button type="button" className="w-btn w-btn-primary" style={{ padding: '0.75rem 2rem' }}>
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkerProfile;
