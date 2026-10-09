import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const NotificationCenter = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const [notifsRes, countRes] = await Promise.all([
                api.get('/notifications'),
                api.get('/notifications/unread-count')
            ]);
            setNotifications(notifsRes.data);
            setUnreadCount(countRes.data.count);
        } catch (err) {
            console.error("Failed to fetch notifications");
        }
    };

    useEffect(() => {
        fetchNotifications();
        
        // Simple polling every 30 seconds as requested
        const intervalId = setInterval(() => {
            fetchNotifications();
        }, 30000);

        return () => clearInterval(intervalId);
    }, [user]);

    const handleRead = async (id, issueId) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            fetchNotifications();
            if (issueId) {
                setIsOpen(false);
                navigate(`/issues?highlight=${issueId}`);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleReadAll = async () => {
        try {
            await api.patch('/notifications/read-all');
            fetchNotifications();
        } catch (err) {
            console.error(err);
        }
    };

    if (!user) return null;

    return (
        <div style={{ position: 'relative' }}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{ 
                    background: 'transparent', 
                    border: 'none', 
                    fontSize: '1.5rem', 
                    cursor: 'pointer', 
                    position: 'relative',
                    padding: '0.5rem'
                }}
            >
                🔔
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '0',
                        right: '0',
                        background: '#f44336',
                        color: 'white',
                        borderRadius: '50%',
                        padding: '2px 6px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                    }}>
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    width: '350px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    background: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    padding: '1rem',
                    animation: 'fadeIn 0.2s ease'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                        <h4 style={{ margin: 0 }}>Notifications</h4>
                        {unreadCount > 0 && (
                            <button onClick={handleReadAll} style={{ background: 'none', border: 'none', color: '#2196f3', cursor: 'pointer', fontSize: '0.875rem' }}>
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {notifications.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#666' }}>No notifications</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {notifications.map(notif => (
                                <div 
                                    key={notif._id} 
                                    onClick={() => handleRead(notif._id, notif.issue)}
                                    style={{
                                        padding: '0.75rem',
                                        background: notif.read ? 'white' : '#e3f2fd',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        border: '1px solid #eee',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <h5 style={{ margin: '0 0 0.25rem 0' }}>{notif.title}</h5>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#555' }}>{notif.message}</p>
                                    <small style={{ color: '#999', display: 'block', marginTop: '0.25rem' }}>
                                        {new Date(notif.createdAt).toLocaleString()}
                                    </small>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
