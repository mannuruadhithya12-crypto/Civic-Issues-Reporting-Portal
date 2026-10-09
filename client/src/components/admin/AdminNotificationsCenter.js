import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

// SVG Sparkline Component
const Sparkline = ({ data = [10, 15, 12, 18, 22, 25, 30], color = '#2563eb' }) => {
    const min = Math.min(...data);
    const max = Math.max(...data) || 1;
    const points = data.map((val, idx) => {
        const x = (idx / (data.length - 1)) * 80;
        const y = 30 - ((val - min) / (max - min || 1)) * 24;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width="85" height="32" viewBox="0 0 80 30" style={{ overflow: 'visible' }}>
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
            />
        </svg>
    );
};

const AdminNotificationsCenter = () => {
    const navigate = useNavigate();

    // Data state
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [workersList, setWorkersList] = useState([]);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [lastRefreshed, setLastRefreshed] = useState(new Date());

    // Filters & Pagination State
    const [activeTab, setActiveTab] = useState('all'); // all, civic, operations, workers, system, announcements
    const [searchQuery, setSearchQuery] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [sortOption, setSortOption] = useState('newest');
    const [currentPage, setCurrentPage] = useState(1);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    // Action Modals State
    const [modalState, setModalState] = useState({ type: null, data: null }); // 'assign', 'comment', 'settings'
    const [commentText, setCommentText] = useState('');
    const [selectedWorkerId, setSelectedWorkerId] = useState('');

    // Fetch Backend Data
    const fetchCenterData = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const queryParams = new URLSearchParams({
                category: activeTab,
                search: searchQuery.trim(),
                priority: priorityFilter,
                sort: sortOption,
                page: currentPage,
                limit: 10
            }).toString();

            const [centerRes, workersRes] = await Promise.all([
                api.get(`/admin/notifications/center?${queryParams}`),
                api.get('/admin/workers')
            ]);

            if (centerRes.data && centerRes.data.data) {
                const resData = centerRes.data.data;
                setData(resData);
                if (resData.notifications && resData.notifications.length > 0) {
                    if (!selectedNotification) {
                        setSelectedNotification(resData.notifications[0]);
                    } else {
                        // Refresh selected notification reference
                        const updated = resData.notifications.find(n => n._id === selectedNotification._id);
                        if (updated) setSelectedNotification(updated);
                    }
                }
            }
            if (workersRes.data) {
                setWorkersList(workersRes.data);
            }
            setLastRefreshed(new Date());
        } catch (err) {
            console.error('Error fetching Admin Notifications Center:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab, searchQuery, priorityFilter, sortOption, currentPage]);

    useEffect(() => {
        fetchCenterData();
    }, [fetchCenterData]);

    // Action Handlers
    const handleMarkAsRead = async (id, e) => {
        if (e) e.stopPropagation();
        try {
            await api.patch(`/notifications/${id}/read`);
            fetchCenterData(true);
        } catch (err) {
            console.error('Error marking as read:', err);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await api.patch('/notifications/read-all');
            fetchCenterData(true);
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    };

    const handleNotificationSelect = (n) => {
        setSelectedNotification(n);
        if (!n.read) {
            handleMarkAsRead(n._id);
        }
    };

    const handleAddCommentSubmit = async (e) => {
        e.preventDefault();
        if (!selectedNotification?.issue?._id || !commentText.trim()) return;

        try {
            await api.post('/admin/notifications/comment', {
                issueId: selectedNotification.issue._id,
                comment: commentText.trim()
            });
            setCommentText('');
            setModalState({ type: null, data: null });
            fetchCenterData(true);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to add comment');
        }
    };

    const handleAssignWorkerSubmit = async (e) => {
        e.preventDefault();
        if (!selectedNotification?.issue?._id || !selectedWorkerId) return;

        try {
            await api.post('/admin/notifications/assign-worker', {
                issueId: selectedNotification.issue._id,
                workerId: selectedWorkerId
            });
            setSelectedWorkerId('');
            setModalState({ type: null, data: null });
            fetchCenterData(true);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to assign worker');
        }
    };

    if (loading && !data) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <div style={{ width: '40px', height: '40px', border: '4px solid #cbd5e1', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            </div>
        );
    }

    const {
        kpis = {},
        categoryCounts = {},
        notifications = [],
        pagination = { totalItems: 0, totalPages: 1, currentPage: 1, showingStart: 0, showingEnd: 0 }
    } = data || {};

    const getIconForNotification = (category, type) => {
        switch ((category || '').toLowerCase()) {
            case 'civic issues':
            case 'civic':
                return { icon: '⚠️', bg: '#fee2e2', color: '#dc2626' };
            case 'workers':
                return { icon: '👷', bg: '#fef3c7', color: '#d97706' };
            case 'operations':
                return { icon: '🚚', bg: '#e0f2fe', color: '#0284c7' };
            case 'announcements':
                return { icon: '📢', bg: '#fef3c7', color: '#d97706' };
            case 'system':
            default:
                return { icon: '⚙️', bg: '#f1f5f9', color: '#475569' };
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Inter, system-ui, sans-serif', color: '#0f172a', paddingBottom: '40px' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '16px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', color: '#2563eb' }}>
                        🔔
                    </div>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Notifications</h1>
                        <p style={{ color: '#64748b', margin: '2px 0 0 0', fontSize: '13px' }}>Monitor and manage important civic, operational, worker, and system notifications.</p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#475569', fontWeight: '600' }}>
                        📅 {lastRefreshed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <button
                        onClick={() => fetchCenterData(true)}
                        disabled={refreshing}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}
                    >
                        🔄 {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <button
                        onClick={handleMarkAllAsRead}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: '#2563eb', cursor: 'pointer' }}
                    >
                        ✓ Mark All as Read
                    </button>
                    <button
                        onClick={() => navigate('/admin/settings')}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}
                    >
                        ⚙ Notification Settings
                    </button>
                </div>
            </div>

            {/* KPI Cards Row (5 Cards) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                
                {/* 1. Unread */}
                <div onClick={() => { setActiveTab('all'); setPriorityFilter('all'); }} style={{ cursor: 'pointer', backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🔔</div>
                        <Sparkline data={kpis.unread?.sparkline} color="#2563eb" />
                    </div>
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>{kpis.unread?.count || 0}</div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Unread</div>
                        <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: '600', marginTop: '2px' }}>{kpis.unread?.trend}</div>
                    </div>
                </div>

                {/* 2. Total Notifications */}
                <div onClick={() => setActiveTab('all')} style={{ cursor: 'pointer', backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📄</div>
                        <Sparkline data={kpis.total?.sparkline} color="#0284c7" />
                    </div>
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>{kpis.total?.count || 0}</div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Total Notifications</div>
                        <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: '600', marginTop: '2px' }}>{kpis.total?.trend}</div>
                    </div>
                </div>

                {/* 3. High Priority */}
                <div onClick={() => setPriorityFilter('high')} style={{ cursor: 'pointer', backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>⚠️</div>
                        <Sparkline data={kpis.highPriority?.sparkline} color="#dc2626" />
                    </div>
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>{kpis.highPriority?.count || 0}</div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>High Priority</div>
                        <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '600', marginTop: '2px' }}>{kpis.highPriority?.trend}</div>
                    </div>
                </div>

                {/* 4. Worker Related */}
                <div onClick={() => setActiveTab('workers')} style={{ cursor: 'pointer', backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>👥</div>
                        <Sparkline data={kpis.workerRelated?.sparkline} color="#d97706" />
                    </div>
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>{kpis.workerRelated?.count || 0}</div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Worker Related</div>
                        <div style={{ fontSize: '11px', color: '#d97706', fontWeight: '600', marginTop: '2px' }}>{kpis.workerRelated?.trend}</div>
                    </div>
                </div>

                {/* 5. Announcements */}
                <div onClick={() => setActiveTab('announcements')} style={{ cursor: 'pointer', backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📣</div>
                        <Sparkline data={kpis.announcements?.sparkline} color="#d97706" />
                    </div>
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>{kpis.announcements?.count || 0}</div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Announcements</div>
                        <div style={{ fontSize: '11px', color: '#d97706', fontWeight: '600', marginTop: '2px' }}>{kpis.announcements?.trend}</div>
                    </div>
                </div>

            </div>

            {/* Category Pills & Filter Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                
                {/* Category Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {[
                        { id: 'all', label: 'All', count: categoryCounts.all },
                        { id: 'civic', label: 'Civic Issues', count: categoryCounts.civic },
                        { id: 'operations', label: 'Operations', count: categoryCounts.operations },
                        { id: 'workers', label: 'Workers', count: categoryCounts.workers },
                        { id: 'system', label: 'System', count: categoryCounts.system },
                        { id: 'announcements', label: 'Announcements', count: categoryCounts.announcements }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 14px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: '600',
                                border: activeTab === tab.id ? 'none' : '1px solid #e2e8f0',
                                backgroundColor: activeTab === tab.id ? '#2563eb' : '#ffffff',
                                color: activeTab === tab.id ? '#ffffff' : '#475569',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <span>{tab.label}</span>
                            <span style={{
                                padding: '2px 6px',
                                borderRadius: '10px',
                                fontSize: '10px',
                                backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                                color: activeTab === tab.id ? '#ffffff' : '#64748b'
                            }}>
                                {tab.count || 0}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Search & Filter Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
                    <div style={{ position: 'relative', width: '240px' }}>
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#94a3b8' }}>🔍</span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            placeholder="Search notifications..."
                            style={{ width: '100%', padding: '6px 12px 6px 30px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#f8fafc', color: '#0f172a' }}
                        />
                    </div>

                    <button
                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}
                    >
                        ⚙️ Filter
                    </button>

                    {showFilterDropdown && (
                        <div style={{ position: 'absolute', right: 0, top: '40px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px', zIndex: 100, width: '200px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Filter by Priority</div>
                            <select
                                value={priorityFilter}
                                onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
                                style={{ width: '100%', padding: '6px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="all">All Priorities</option>
                                <option value="high">High Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="normal">Normal</option>
                            </select>
                        </div>
                    )}
                </div>

            </div>

            {/* Main Section: Notifications List (Left) & Notification Details (Right) */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                
                {/* Left Panel: Notifications List */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#2563eb', fontSize: '18px' }}>🔔</span>
                            <div>
                                <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: '#0f172a' }}>Notifications List</h3>
                                <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Latest notifications across all municipal operations.</p>
                            </div>
                        </div>

                        {/* Sort Dropdown */}
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#334155', fontWeight: '600' }}
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="priority">Highest Priority</option>
                            <option value="unread">Unread First</option>
                        </select>
                    </div>

                    {/* Notification Rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '380px' }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                                No notifications found matching your filters.
                            </div>
                        ) : notifications.map(n => {
                            const iconConfig = getIconForNotification(n.computedCategory, n.type);
                            const isSelected = selectedNotification && selectedNotification._id === n._id;

                            return (
                                <div
                                    key={n._id}
                                    onClick={() => handleNotificationSelect(n)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justify: 'space-between',
                                        padding: '12px 16px',
                                        borderRadius: '10px',
                                        border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                        backgroundColor: !n.read ? '#f0f9ff' : isSelected ? '#faf5ff' : '#ffffff',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            backgroundColor: iconConfig.bg, color: iconConfig.color,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0
                                        }}>
                                            {iconConfig.icon}
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {!n.read && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb' }}></span>}
                                                <h4 style={{ fontSize: '13px', fontWeight: !n.read ? '700' : '600', color: '#0f172a', margin: 0 }}>{n.title}</h4>
                                            </div>
                                            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '380px' }}>
                                                {n.message}
                                            </p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '700', backgroundColor: '#e0f2fe', color: '#0284c7' }}>
                                            {n.computedCategory}
                                        </span>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '700',
                                            backgroundColor: n.computedPriority === 'High Priority' ? '#fee2e2' : n.computedPriority === 'Medium Priority' ? '#fef3c7' : '#f1f5f9',
                                            color: n.computedPriority === 'High Priority' ? '#dc2626' : n.computedPriority === 'Medium Priority' ? '#d97706' : '#475569'
                                        }}>
                                            {n.computedPriority}
                                        </span>
                                        <span style={{ fontSize: '11px', color: '#94a3b8', width: '70px', textAlign: 'right' }}>
                                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span style={{ fontSize: '14px', color: '#94a3b8' }}>›</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                            Showing {pagination.showingStart}–{pagination.showingEnd} of {pagination.totalItems} notifications
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                                disabled={pagination.currentPage <= 1}
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: pagination.currentPage <= 1 ? 'not-allowed' : 'pointer' }}
                            >
                                ‹
                            </button>
                            {Array.from({ length: Math.min(pagination.totalPages, 5) }).map((_, idx) => (
                                <button
                                    key={idx + 1}
                                    onClick={() => setCurrentPage(idx + 1)}
                                    style={{
                                        padding: '4px 10px',
                                        fontSize: '11px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        backgroundColor: pagination.currentPage === (idx + 1) ? '#2563eb' : '#ffffff',
                                        color: pagination.currentPage === (idx + 1) ? '#ffffff' : '#334155',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {idx + 1}
                                </button>
                            ))}
                            <button
                                disabled={pagination.currentPage >= pagination.totalPages}
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                                style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: pagination.currentPage >= pagination.totalPages ? 'not-allowed' : 'pointer' }}
                            >
                                ›
                            </button>
                        </div>
                    </div>

                </div>

                {/* Right Panel: Notification Details */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#2563eb', fontSize: '16px' }}>⚙️</span>
                            <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: '#0f172a' }}>Notification Details</h3>
                        </div>
                    </div>

                    {selectedNotification ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            
                            {/* Selected Card Banner */}
                            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
                                <div style={{ fontSize: '24px' }}>
                                    {getIconForNotification(selectedNotification.computedCategory, selectedNotification.type).icon}
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{selectedNotification.title}</h4>
                                    <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>{selectedNotification.message}</p>
                                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '700', backgroundColor: '#fee2e2', color: '#dc2626' }}>
                                            {selectedNotification.computedPriority || 'Normal'}
                                        </span>
                                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '700', backgroundColor: selectedNotification.read ? '#f1f5f9' : '#e0f2fe', color: selectedNotification.read ? '#64748b' : '#0284c7' }}>
                                            {selectedNotification.read ? 'Read' : 'Unread'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Details Metadata Grid */}
                            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px', color: '#334155' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>Type:</span>
                                    <span style={{ fontWeight: '600' }}>{selectedNotification.computedCategory || 'Civic Issue'}</span>
                                </div>

                                {selectedNotification.issue && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#64748b' }}>Related Issue:</span>
                                        <span style={{ color: '#2563eb', fontWeight: '700', cursor: 'pointer' }} onClick={() => navigate(`/admin/civic?search=${selectedNotification.issue._id}`)}>
                                            CC-2026-{selectedNotification.issue._id.slice(-4)} ↗
                                        </span>
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>Location:</span>
                                    <span style={{ fontWeight: '600' }}>{selectedNotification.issue?.locationName || selectedNotification.issue?.location || 'Central District'}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>Reported By:</span>
                                    <span style={{ fontWeight: '600' }}>{selectedNotification.issue?.createdBy?.name || 'Citizen'}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>Category:</span>
                                    <span style={{ fontWeight: '600' }}>{selectedNotification.issue?.department || 'Roads'}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>Priority:</span>
                                    <span style={{ fontWeight: '700', color: selectedNotification.issue?.priority === 'urgent' ? '#dc2626' : '#d97706' }}>{selectedNotification.issue?.priority || 'Normal'}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>Status:</span>
                                    <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>{selectedNotification.issue?.status || 'Open'}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>Created At:</span>
                                    <span style={{ fontWeight: '600' }}>{new Date(selectedNotification.createdAt).toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                                {selectedNotification.issue && (
                                    <button
                                        onClick={() => navigate(`/admin/civic?search=${selectedNotification.issue._id}`)}
                                        style={{ gridColumn: 'span 2', padding: '8px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                                    >
                                        ↗ View Issue
                                    </button>
                                )}
                                <button
                                    onClick={() => setModalState({ type: 'assign', data: selectedNotification })}
                                    style={{ padding: '8px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '11px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}
                                >
                                    👷 Assign Worker
                                </button>
                                <button
                                    onClick={() => setModalState({ type: 'comment', data: selectedNotification })}
                                    style={{ padding: '8px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '11px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}
                                >
                                    💬 Add Comment
                                </button>
                                <button
                                    onClick={(e) => handleMarkAsRead(selectedNotification._id, e)}
                                    style={{ gridColumn: 'span 2', padding: '8px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '11px', fontWeight: '600', color: '#2563eb', cursor: 'pointer' }}
                                >
                                    ✓ Mark as Read
                                </button>
                            </div>

                            {/* Related Activity Timeline */}
                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                                <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', margin: '0 0 8px 0' }}>Related Activity</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                        <span>• Issue reported by citizen</span>
                                        <span style={{ color: '#94a3b8' }}>{new Date(selectedNotification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                        <span>• Notification sent to administrators</span>
                                        <span style={{ color: '#94a3b8' }}>{new Date(selectedNotification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                        <span>• Priority flag recorded</span>
                                        <span style={{ color: '#94a3b8' }}>{new Date(selectedNotification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                            Select a notification to view details.
                        </div>
                    )}

                </div>

            </div>

            {/* Action Modals */}
            {modalState.type && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#0f172a' }}>
                                {modalState.type === 'comment' && '💬 Add Administrative Comment'}
                                {modalState.type === 'assign' && '👷 Assign Field Worker'}
                            </h3>
                            <button onClick={() => setModalState({ type: null, data: null })} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                        </div>

                        {modalState.type === 'comment' && (
                            <form onSubmit={handleAddCommentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Comment / Note</label>
                                    <textarea
                                        required
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder="Add operational notes or details..."
                                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', height: '80px' }}
                                    />
                                </div>
                                <button type="submit" style={{ padding: '10px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Submit Comment</button>
                            </form>
                        )}

                        {modalState.type === 'assign' && (
                            <form onSubmit={handleAssignWorkerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Select Field Worker</label>
                                    <select
                                        required
                                        value={selectedWorkerId}
                                        onChange={(e) => setSelectedWorkerId(e.target.value)}
                                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                                    >
                                        <option value="">-- Choose Worker --</option>
                                        {workersList.map(w => (
                                            <option key={w._id} value={w._id}>{w.name} ({w.department || 'General'})</option>
                                        ))}
                                    </select>
                                </div>
                                <button type="submit" style={{ padding: '10px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Confirm Worker Assignment</button>
                            </form>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};

export default AdminNotificationsCenter;
