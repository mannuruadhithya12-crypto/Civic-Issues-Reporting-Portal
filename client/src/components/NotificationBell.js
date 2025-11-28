import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // Fetch notifications when dropdown opens
    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await api.get('/notifications');
            setNotifications(response.data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationClick = (notification) => {
        // Navigate to issues list with query parameter
        navigate(`/issues?highlight=${notification.issueId}`);
        setIsOpen(false);
    };

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
            {/* Bell Icon */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'relative',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
            >
                🔔
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-5px',
                        background: '#f44336',
                        color: 'white',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        fontSize: '0.7rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    right: 0,
                    width: '350px',
                    maxHeight: '500px',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
                    zIndex: 1000,
                    overflow: 'hidden'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '1rem',
                        borderBottom: '1px solid #e0e0e0',
                        background: 'linear-gradient(135deg, #2196F3, #1976D2)',
                        color: 'white'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                            Notifications
                            {unreadCount > 0 && (
                                <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', opacity: 0.9 }}>
                                    ({unreadCount} new)
                                </span>
                            )}
                        </h3>
                    </div>

                    {/* Notifications List */}
                    <div style={{
                        maxHeight: '400px',
                        overflowY: 'auto'
                    }}>
                        {loading ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#757575' }}>
                                Loading notifications...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#757575' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔕</div>
                                <p style={{ margin: 0 }}>No new notifications</p>
                                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                                    New issues will appear here
                                </p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    style={{
                                        padding: '1rem',
                                        borderBottom: '1px solid #f0f0f0',
                                        cursor: 'pointer',
                                        background: notification.read ? 'white' : '#f5f5f5',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = '#e3f2fd';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = notification.read ? 'white' : '#f5f5f5';
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                                        {/* Icon */}
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #2196F3, #1976D2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.2rem',
                                            flexShrink: 0
                                        }}>
                                            📋
                                        </div>

                                        {/* Content */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: '0.875rem',
                                                fontWeight: 600,
                                                color: '#212121',
                                                marginBottom: '0.25rem'
                                            }}>
                                                {notification.title}
                                            </div>
                                            <div style={{
                                                fontSize: '0.875rem',
                                                color: '#424242',
                                                marginBottom: '0.25rem',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {notification.issueTitle}
                                            </div>
                                            <div style={{
                                                fontSize: '0.75rem',
                                                color: '#757575',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                <span>{notification.department}</span>
                                                <span>•</span>
                                                <span>by {notification.createdBy}</span>
                                                <span>•</span>
                                                <span>{formatTimeAgo(notification.createdAt)}</span>
                                            </div>
                                        </div>

                                        {/* Unread indicator */}
                                        {!notification.read && (
                                            <div style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: '#2196F3',
                                                flexShrink: 0,
                                                marginTop: '0.75rem'
                                            }} />
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div style={{
                            padding: '0.75rem',
                            borderTop: '1px solid #e0e0e0',
                            textAlign: 'center'
                        }}>
                            <button
                                onClick={() => {
                                    navigate('/issues');
                                    setIsOpen(false);
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#2196F3',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    padding: '0.5rem'
                                }}
                            >
                                View All Issues →
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default NotificationBell;
