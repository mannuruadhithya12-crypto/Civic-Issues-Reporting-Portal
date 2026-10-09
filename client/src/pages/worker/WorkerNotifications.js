import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { useRealTime } from '../../context/RealTimeContext';
import { useDataMode } from '../../context/DataModeContext';

const WorkerNotifications = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { subscribe } = useRealTime();
  const { isDemo } = useDataMode();

  const [notifications, setNotifications] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);

const REFERENCE_DEMO_NOTIFICATIONS = [
  {
    _id: 'ref-demo-1',
    type: 'new_task',
    title: 'New Task Assigned',
    message: 'You have been assigned a new task: Pothole Repair - Main Street',
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    issue: {
      _id: '00123',
      title: 'Pothole Repair - Main Street',
      description: 'You have been assigned a new task: Pothole Repair - Main Street. Please review the details and start working on this task.',
      location: 'Main Street, Near Metro Station',
      locationName: 'Main Street, Near Metro Station',
      department: 'Roads',
      category: 'Pothole',
      priority: 'high',
      assignedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      assignedBy: { name: 'Municipal Admin', email: 'admin@civic.gov' },
      sla: { dueAt: new Date(Date.now() + 5 * 3600 * 1000).toISOString(), isBreached: false }
    }
  },
  {
    _id: 'ref-demo-2',
    type: 'task_updated',
    title: 'Task Status Updated',
    message: 'Garbage Collection - Zone B has been updated to In Progress',
    read: false,
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    issue: {
      _id: '00124',
      title: 'Garbage Collection - Zone B',
      location: 'Zone B Market Square',
      locationName: 'Zone B Market Square',
      department: 'Waste',
      priority: 'normal'
    }
  },
  {
    _id: 'ref-demo-3',
    type: 'task_due',
    title: 'Task Due Today',
    message: 'Water Leakage - Block 5 is due today. Please complete it on time.',
    read: false,
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    issue: {
      _id: '00125',
      title: 'Water Leakage - Block 5',
      location: 'Block 5 Main Pipeline',
      locationName: 'Block 5 Main Pipeline',
      department: 'Water',
      priority: 'high',
      sla: { dueAt: new Date(Date.now() + 2 * 3600 * 1000).toISOString(), isBreached: false }
    }
  },
  {
    _id: 'ref-demo-4',
    type: 'task_completed',
    title: 'Task Completed',
    message: 'Street Light Repair - Ward 12 has been marked as completed.',
    read: true,
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    issue: {
      _id: '00126',
      title: 'Street Light Repair - Ward 12',
      location: 'Ward 12 Cross Road',
      locationName: 'Ward 12 Cross Road',
      department: 'Electricity',
      priority: 'normal'
    }
  },
  {
    _id: 'ref-demo-5',
    type: 'new_comment',
    title: 'New Comment',
    message: 'A new comment has been added to your task: Footpath Repair',
    read: true,
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    issue: {
      _id: '00127',
      title: 'Footpath Repair - Sector 4',
      location: 'Sector 4 Pedestrian Way',
      locationName: 'Sector 4 Pedestrian Way',
      department: 'Roads'
    }
  },
  {
    _id: 'ref-demo-6',
    type: 'system_announcement',
    title: 'System Announcement',
    message: 'Citywide maintenance drive scheduled this weekend.',
    read: true,
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
  },
  {
    _id: 'ref-demo-7',
    type: 'task_reassigned',
    title: 'Task Reassigned',
    message: 'Drainage Cleaning - Central Park has been reassigned to you.',
    read: true,
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    issue: {
      _id: '00128',
      title: 'Drainage Cleaning - Central Park',
      location: 'Central Park North Gate',
      locationName: 'Central Park North Gate',
      department: 'Drainage'
    }
  },
  {
    _id: 'ref-demo-8',
    type: 'urgent_task',
    title: 'Urgent Task Assigned',
    message: 'Street Light Outage - Main Road requires immediate attention.',
    read: true,
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    issue: {
      _id: '00129',
      title: 'Street Light Outage - Main Road',
      location: 'Main Road High Voltage Pillar',
      locationName: 'Main Road High Voltage Pillar',
      department: 'Electricity',
      priority: 'urgent'
    }
  }
];

  useEffect(() => {
    const unsubscribe = subscribe('*', () => {
      fetchNotifications();
    });
    return () => unsubscribe();
  }, [subscribe]);

  // Fetch notifications from backend API with local storage sync & reference fallback
  const fetchNotifications = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const res = await api.get('/notifications');
      let data = res.data.notifications || res.data.data || res.data || [];
      const localNotifs = JSON.parse(localStorage.getItem('worker_notifications') || '[]');
      
      const combined = [...localNotifs, ...data];
      const uniqueMap = new Map();
      combined.forEach(item => {
        if (item && item._id && !uniqueMap.has(item._id)) {
          uniqueMap.set(item._id, item);
        }
      });
      const merged = Array.from(uniqueMap.values());

      if (!isDemo) {
        setNotifications(merged);
      } else {
        setNotifications(merged.length > 0 ? merged : REFERENCE_DEMO_NOTIFICATIONS);
      }

      if (merged.length > 0) {
        setSelectedId(prev => {
          if (prev && merged.some(n => n._id === prev)) return prev;
          return merged[0]._id;
        });
      } else if (isDemo && REFERENCE_DEMO_NOTIFICATIONS.length > 0) {
        setSelectedId(REFERENCE_DEMO_NOTIFICATIONS[0]._id);
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      if (!isDemo) {
        setError("Failed to load notifications.");
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(true);

    const handleUpdate = () => fetchNotifications(false);
    window.addEventListener('civic_notifications_updated', handleUpdate);
    return () => window.removeEventListener('civic_notifications_updated', handleUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Categorize helper for reference tabs
  const getCategory = (n) => {
    const t = (n.type || '').toLowerCase();
    if (['announcement', 'system_announcement', 'system'].includes(t)) {
      return 'Announcements';
    }
    if (['task_due', 'urgent', 'urgent_task', 'reminder', 'sla_warning', 'sla_breach', 'warning'].includes(t)) {
      return 'Reminders';
    }
    if (['new_task', 'new_assignment', 'assignment', 'task_reassigned'].includes(t)) {
      return 'New Assignments';
    }
    return 'Task Updates';
  };

  // Real-data counts computed from backend records
  const counts = useMemo(() => {
    const res = {
      All: notifications.length,
      'Task Updates': 0,
      'New Assignments': 0,
      Reminders: 0,
      Announcements: 0
    };
    notifications.forEach(n => {
      const cat = getCategory(n);
      if (res[cat] !== undefined) {
        res[cat]++;
      }
    });
    return res;
  }, [notifications]);

  // Filter & Search logic
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      // Tab filter
      if (activeTab !== 'All') {
        const cat = getCategory(n);
        if (cat !== activeTab) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (n.title || '').toLowerCase().includes(q);
        const messageMatch = (n.message || '').toLowerCase().includes(q);
        const typeMatch = (n.type || '').toLowerCase().includes(q);
        const issueTitleMatch = n.issue?.title ? n.issue.title.toLowerCase().includes(q) : false;
        const issueIdMatch = n.issue?._id ? n.issue._id.toLowerCase().includes(q) : false;
        const locationMatch = (n.issue?.locationName || n.issue?.location || '').toLowerCase().includes(q);

        return titleMatch || messageMatch || typeMatch || issueTitleMatch || issueIdMatch || locationMatch;
      }

      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  // Keep selected ID valid when filtering
  useEffect(() => {
    if (filteredNotifications.length > 0) {
      if (!selectedId || !filteredNotifications.some(n => n._id === selectedId)) {
        setSelectedId(filteredNotifications[0]._id);
      }
    }
  }, [filteredNotifications, selectedId]);

  const selectedNotification = useMemo(() => {
    return notifications.find(n => n._id === selectedId) || null;
  }, [notifications, selectedId]);

  // Toast feedback helper
  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  // API Actions
  const handleSelectNotification = async (notif) => {
    setSelectedId(notif._id);
    setActionMenuOpen(false);

    if (!notif.read) {
      // Optimistic update
      setNotifications(prev => prev.map(item => item._id === notif._id ? { ...item, read: true } : item));
      try {
        await api.patch(`/notifications/${notif._id}/read`);
      } catch (err) {
        console.error("Failed to mark as read:", err);
        // Rollback if needed
        setNotifications(prev => prev.map(item => item._id === notif._id ? { ...item, read: false } : item));
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    if (notifications.every(n => n.read)) return;
    
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showFeedback("All notifications marked as read");

    try {
      await api.patch('/notifications/read-all');
    } catch (err) {
      console.error("Failed to mark all read:", err);
      showFeedback("Failed to update notifications");
      fetchNotifications();
    }
  };

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    setActionMenuOpen(false);

    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    try {
      await api.patch(`/notifications/${id}/read`);
      showFeedback("Marked as read");
    } catch (err) {
      console.error("Failed to mark as read:", err);
      fetchNotifications();
    }
  };

  const handleMarkAsUnread = async (id, e) => {
    if (e) e.stopPropagation();
    setActionMenuOpen(false);

    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: false } : n));
    try {
      await api.patch(`/notifications/${id}/unread`);
      showFeedback("Marked as unread");
    } catch (err) {
      console.error("Failed to mark as unread:", err);
      fetchNotifications();
    }
  };

  const handleDeleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    setActionMenuOpen(false);

    const remaining = notifications.filter(n => n._id !== id);
    setNotifications(remaining);
    showFeedback("Notification deleted");

    if (selectedId === id) {
      setSelectedId(remaining.length > 0 ? remaining[0]._id : null);
    }

    try {
      await api.delete(`/notifications/${id}`);
    } catch (err) {
      console.error("Failed to delete notification:", err);
      showFeedback("Could not delete notification");
      fetchNotifications();
    }
  };

  // Helper for notification type styling & icons
  const getTypeStyle = (type, title = '') => {
    const t = (type || '').toLowerCase();
    const ttl = (title || '').toLowerCase();

    if (t === 'new_task' || t === 'assignment' || t === 'new_assignment' || ttl.includes('assigned')) {
      return {
        bg: '#EFF6FF',
        color: '#0066FF',
        borderColor: '#BFDBFE',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
        )
      };
    }

    if (t === 'task_updated' || t === 'status_update' || t === 'issue_update' || ttl.includes('updated') || ttl.includes('status')) {
      return {
        bg: '#FFF7ED',
        color: '#EA580C',
        borderColor: '#FFEDD5',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        )
      };
    }

    if (t === 'task_due' || t === 'urgent' || t === 'urgent_task' || t === 'warning' || ttl.includes('due') || ttl.includes('urgent')) {
      return {
        bg: '#FEF2F2',
        color: '#EF4444',
        borderColor: '#FEE2E2',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        )
      };
    }

    if (t === 'task_completed' || t === 'resolved' || ttl.includes('completed') || ttl.includes('resolved')) {
      return {
        bg: '#F0FDF4',
        color: '#22C55E',
        borderColor: '#DCFCE7',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        )
      };
    }

    if (t === 'new_comment' || t === 'comment' || ttl.includes('comment')) {
      return {
        bg: '#F5F3FF',
        color: '#8B5CF6',
        borderColor: '#DDD6FE',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )
      };
    }

    if (t === 'system_announcement' || t === 'announcement' || ttl.includes('announcement')) {
      return {
        bg: '#FEFCE8',
        color: '#EAB308',
        borderColor: '#FEF08A',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12A10 10 0 0 0 12 2v10z"/>
            <path d="M12 12V2a10 10 0 0 0-10 10h10z"/>
            <path d="M12 12h10a10 10 0 0 1-10 10v-10z"/>
          </svg>
        )
      };
    }

    // Default icon style
    return {
      bg: '#EFF6FF',
      color: '#0066FF',
      borderColor: '#BFDBFE',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      )
    };
  };

  // Relative timestamp calculation
  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = Math.abs(now - date);
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatDateFull = (dateStr) => {
    if (!dateStr) return 'Not available';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Not available';
    return d.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Tab Definitions matching reference design
  const tabs = [
    { key: 'All', label: 'All', count: counts['All'], activeBg: '#0066FF', badgeBg: '#EF4444', badgeColor: 'white' },
    { key: 'Task Updates', label: 'Task Updates', count: counts['Task Updates'], activeBg: '#0066FF', inactiveBg: '#FFF7ED', inactiveText: '#C2410C', badgeBg: '#F97316', badgeColor: 'white' },
    { key: 'New Assignments', label: 'New Assignments', count: counts['New Assignments'], activeBg: '#0066FF', inactiveBg: '#EFF6FF', inactiveText: '#1D4ED8', badgeBg: '#3B82F6', badgeColor: 'white' },
    { key: 'Reminders', label: 'Reminders', count: counts['Reminders'], activeBg: '#0066FF', inactiveBg: '#FEF2F2', inactiveText: '#B91C1C', badgeBg: '#EF4444', badgeColor: 'white' },
    { key: 'Announcements', label: 'Announcements', count: counts['Announcements'], activeBg: '#0066FF', inactiveBg: '#F0FDF4', inactiveText: '#15803D', badgeBg: '#22C55E', badgeColor: 'white' },
  ];

  const unreadTotal = notifications.filter(n => !n.read).length;

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: 'calc(100vh - 64px)', padding: '2rem' }}>
      
      {/* Toast Feedback Notice */}
      {feedback && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: '#0F172A',
          color: 'white',
          padding: '0.75rem 1.25rem',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          fontSize: '0.875rem',
          fontWeight: 600,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <span>✓</span>
          <span>{feedback}</span>
        </div>
      )}

      {/* Main Container */}
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        
        {/* Page Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Notifications
            </h1>
            <p style={{ fontSize: '0.925rem', color: '#64748B', margin: '0.375rem 0 0 0', fontWeight: 500 }}>
              Stay updated on your assigned tasks, issue updates, and important announcements.
            </p>
          </div>

          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadTotal === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'white',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '0.625rem 1.25rem',
              color: unreadTotal > 0 ? '#0066FF' : '#94A3B8',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: unreadTotal > 0 ? 'pointer' : 'not-allowed',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Mark All as Read</span>
          </button>
        </div>

        {/* Filter Tabs and Search Input Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          
          {/* Tabs Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {tabs.map(tab => {
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    border: 'none',
                    backgroundColor: isActive ? '#0066FF' : (tab.inactiveBg || '#F1F5F9'),
                    color: isActive ? 'white' : (tab.inactiveText || '#475569'),
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{tab.label}</span>
                  <span style={{
                    backgroundColor: isActive ? 'white' : tab.badgeBg,
                    color: isActive ? '#0066FF' : tab.badgeColor,
                    fontSize: '0.725rem',
                    fontWeight: 800,
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1
                  }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '280px' }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 1rem 0.5rem 2.5rem',
                backgroundColor: 'white',
                border: '1px solid #E2E8F0',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                color: '#0F172A',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                ✕
              </button>
            )}
          </div>

        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '1.5rem' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', border: '1px solid #E2E8F0' }}>
              {[1, 2, 3, 4].map(n => (
                <div key={n} style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', opacity: 0.6 }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#E2E8F0' }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: '14px', width: '60%', backgroundColor: '#E2E8F0', borderRadius: '4px', marginBottom: '8px' }}></div>
                    <div style={{ height: '12px', width: '90%', backgroundColor: '#F1F5F9', borderRadius: '4px' }}></div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '2rem', border: '1px solid #E2E8F0', height: '400px' }}>
              <div style={{ height: '24px', width: '40%', backgroundColor: '#E2E8F0', borderRadius: '4px', marginBottom: '1rem' }}></div>
              <div style={{ height: '16px', width: '80%', backgroundColor: '#F1F5F9', borderRadius: '4px' }}></div>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '3rem 2rem',
            textAlign: 'center',
            border: '1px solid #FEE2E2',
            maxWidth: '500px',
            margin: '2rem auto'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
            <h3 style={{ fontSize: '1.125rem', color: '#0F172A', margin: '0 0 0.5rem 0', fontWeight: 700 }}>
              Unable to load notifications.
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: '0 0 1.5rem 0' }}>{error}</p>
            <button
              onClick={() => fetchNotifications(true)}
              style={{
                backgroundColor: '#0066FF',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.625rem 1.5rem',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Two-Column Notification Content */}
        {!loading && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 460px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
            
            {/* LEFT COLUMN: Notification List */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              
              {filteredNotifications.length === 0 ? (
                /* Empty State */
                <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748B' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.375rem 0' }}>
                    No notifications yet
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
                    {searchQuery ? "No notifications match your search query." : "You're all caught up."}
                  </p>
                </div>
              ) : (
                /* Notification Rows */
                <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '720px', overflowY: 'auto' }}>
                  {filteredNotifications.map(notif => {
                    const isSelected = notif._id === selectedId;
                    const typeStyle = getTypeStyle(notif.type, notif.title);

                    return (
                      <div
                        key={notif._id}
                        onClick={() => handleSelectNotification(notif)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.875rem',
                          padding: '1.125rem 1.25rem',
                          borderBottom: '1px solid #F1F5F9',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? '#EFF6FF' : (notif.read ? 'white' : '#F0F7FF'),
                          borderLeft: isSelected ? '4px solid #0066FF' : '4px solid transparent',
                          transition: 'all 0.15s ease',
                          position: 'relative'
                        }}
                      >
                        {/* Unread Indicator Blue Dot */}
                        <div style={{ width: '8px', height: '8px', flexShrink: 0 }}>
                          {!notif.read && (
                            <span style={{
                              display: 'block',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: '#0066FF'
                            }}></span>
                          )}
                        </div>

                        {/* Icon Circle */}
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          backgroundColor: typeStyle.bg,
                          color: typeStyle.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {typeStyle.icon}
                        </div>

                        {/* Text Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{
                            fontSize: '0.925rem',
                            fontWeight: notif.read ? 600 : 800,
                            color: '#0F172A',
                            margin: '0 0 0.25rem 0',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {notif.title}
                          </h4>
                          <p style={{
                            fontSize: '0.8125rem',
                            color: '#64748B',
                            margin: '0 0 0.375rem 0',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.35
                          }}>
                            {notif.message}
                          </p>
                          <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500 }}>
                            {formatRelativeTime(notif.createdAt)}
                          </span>
                        </div>

                        {/* Chevron Right Arrow */}
                        <div style={{ color: isSelected ? '#0066FF' : '#CBD5E1', flexShrink: 0 }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

            {/* RIGHT COLUMN: Notification Details Panel */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '1.75rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              minHeight: '600px'
            }}>
              
              {!selectedNotification ? (
                <div style={{ textAlign: 'center', padding: '6rem 2rem', color: '#94A3B8' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 1rem auto' }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <p style={{ fontSize: '1rem', fontWeight: 600 }}>Select a notification from the list to view full details.</p>
                </div>
              ) : (
                (() => {
                  const typeStyle = getTypeStyle(selectedNotification.type, selectedNotification.title);
                  const issue = selectedNotification.issue;

                  return (
                    <div>
                      
                      {/* Details Header Bar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                        
                        {/* Title & Icon Header */}
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            backgroundColor: typeStyle.bg,
                            color: typeStyle.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {typeStyle.icon}
                          </div>
                          <div>
                            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.25rem 0', lineHeight: 1.2 }}>
                              {selectedNotification.title}
                            </h2>
                            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: '0 0 0.375rem 0' }}>
                              {selectedNotification.message}
                            </p>
                            <span style={{ fontSize: '0.775rem', color: '#94A3B8', fontWeight: 500 }}>
                              {formatRelativeTime(selectedNotification.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge, Action & Menu */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', position: 'relative' }}>
                          
                          {/* Top Row: Read Status Pill + 3-Dot Menu */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.375rem',
                              backgroundColor: '#EFF6FF',
                              border: '1px solid #BFDBFE',
                              borderRadius: '9999px',
                              padding: '0.2rem 0.625rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: selectedNotification.read ? '#64748B' : '#0066FF'
                            }}>
                              <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: selectedNotification.read ? '#94A3B8' : '#0066FF'
                              }}></span>
                              <span>{selectedNotification.read ? 'Read' : 'Unread'}</span>
                            </div>

                            {/* Three Dot Menu Button */}
                            <button
                              onClick={() => setActionMenuOpen(!actionMenuOpen)}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: '0.25rem',
                                color: '#64748B',
                                cursor: 'pointer',
                                borderRadius: '6px'
                              }}
                              title="Notification Options"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="1"/>
                                <circle cx="12" cy="5" r="1"/>
                                <circle cx="12" cy="19" r="1"/>
                              </svg>
                            </button>
                          </div>

                          {/* Row 2: Mark as Read Button (If Unread) */}
                          {!selectedNotification.read && (
                            <button
                              onClick={(e) => handleMarkAsRead(selectedNotification._id, e)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                backgroundColor: 'white',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                padding: '0.375rem 0.75rem',
                                fontSize: '0.775rem',
                                fontWeight: 700,
                                color: '#0F172A',
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                              <span>Mark as Read</span>
                            </button>
                          )}

                          {/* Action Dropdown Menu */}
                          {actionMenuOpen && (
                            <div style={{
                              position: 'absolute',
                              right: 0,
                              top: '100%',
                              marginTop: '0.375rem',
                              width: '180px',
                              backgroundColor: 'white',
                              borderRadius: '10px',
                              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                              border: '1px solid #E2E8F0',
                              zIndex: 30,
                              padding: '0.375rem 0'
                            }}>
                              {!selectedNotification.read ? (
                                <div
                                  onClick={(e) => handleMarkAsRead(selectedNotification._id, e)}
                                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer', fontWeight: 600 }}
                                >
                                  ✓ Mark as read
                                </div>
                              ) : (
                                <div
                                  onClick={(e) => handleMarkAsUnread(selectedNotification._id, e)}
                                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer', fontWeight: 600 }}
                                >
                                  ✉️ Mark as unread
                                </div>
                              )}
                              
                              {issue && (
                                <div
                                  onClick={() => { setActionMenuOpen(false); navigate(`/worker/tasks/${issue._id}`); }}
                                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#0066FF', cursor: 'pointer', fontWeight: 600 }}
                                >
                                  🔗 Open related task
                                </div>
                              )}

                              <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '0.25rem 0' }}></div>
                              
                              <div
                                onClick={(e) => handleDeleteNotification(selectedNotification._id, e)}
                                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#EF4444', cursor: 'pointer', fontWeight: 600 }}
                              >
                                🗑️ Delete notification
                              </div>
                            </div>
                          )}

                        </div>

                      </div>

                      {/* Divider */}
                      <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '1.25rem 0' }}></div>

                      {/* Notification Detailed Description Body */}
                      <div style={{ color: '#334155', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                        <p style={{ margin: 0, fontWeight: 500 }}>
                          You have been assigned a new task: <strong>{issue?.title || selectedNotification.title}</strong>. Please review the details and start working on this task.
                        </p>
                      </div>

                      {/* Task Information Card (Matching Reference Design) */}
                      {issue ? (
                        <div style={{
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '14px',
                          padding: '1.25rem',
                          display: 'flex',
                          gap: '1.25rem',
                          alignItems: 'center',
                          marginBottom: '1.75rem'
                        }}>
                          
                          {/* Task Image Thumbnail */}
                          <div style={{
                            width: '110px',
                            height: '85px',
                            borderRadius: '10px',
                            backgroundColor: '#334155',
                            backgroundImage: issue.images?.[0]
                              ? `url(${issue.images[0]})`
                              : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='110' height='85' viewBox='0 0 110 85'%3E%3Crect width='110' height='85' fill='%23334155'/%3E%3Cellipse cx='55' cy='45' rx='35' ry='20' fill='%231e293b'/%3E%3Cpath d='M25 45 Q55 25 85 45 Q55 65 25 45' stroke='%23475569' stroke-width='2' fill='none'/%3E%3Ctext x='55' y='48' dominant-baseline='middle' text-anchor='middle' fill='%2394A3B8' font-size='10' font-family='sans-serif' font-weight='bold'%3EPOTHOLE REPAIR%3C/text%3E%3C/svg%3E")`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            flexShrink: 0
                          }}></div>

                          {/* Task Details Metadata */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>
                                {issue.title}
                              </h3>
                            </div>
                            <div style={{ fontSize: '0.775rem', fontWeight: 700, color: '#64748B', marginBottom: '0.5rem' }}>
                              #TASK-{issue._id.substring(issue._id.length - 5).toUpperCase()}
                            </div>

                            {/* Location */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: '#475569', marginBottom: '0.625rem' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                <circle cx="12" cy="10" r="3"/>
                              </svg>
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {issue.locationName || issue.location || 'Main Street, Near Metro Station'}
                              </span>
                            </div>

                            {/* Category Tags */}
                            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                              <span style={{ backgroundColor: '#EFF6FF', color: '#0066FF', fontSize: '0.725rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                                {issue.department || 'Roads'}
                              </span>
                              <span style={{ backgroundColor: '#EFF6FF', color: '#0066FF', fontSize: '0.725rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                                {issue.department || 'Pothole'}
                              </span>
                            </div>
                          </div>

                          {/* Task Priority & View Button */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem', flexShrink: 0 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem' }}>
                              <span style={{
                                backgroundColor: issue.priority === 'urgent' || issue.priority === 'high' ? '#FEF2F2' : '#F1F5F9',
                                color: issue.priority === 'urgent' || issue.priority === 'high' ? '#EF4444' : '#475569',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                padding: '2px 10px',
                                borderRadius: '6px',
                                textTransform: 'capitalize'
                              }}>
                                {issue.priority || 'High'}
                              </span>

                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#EF4444', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                🕒 {issue.sla?.isBreached ? 'Overdue' : 'Due Today'}
                              </span>
                            </div>

                            <button
                              onClick={() => navigate(`/worker/tasks/${issue._id}`)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                backgroundColor: '#0066FF',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '0.5rem 1rem',
                                fontSize: '0.8125rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(0, 102, 255, 0.25)',
                                transition: 'transform 0.1s ease'
                              }}
                            >
                              <span>View Task</span>
                              <span>→</span>
                            </button>
                          </div>

                        </div>
                      ) : (
                        /* Graceful handling if related task is unavailable */
                        <div style={{
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '1.25rem',
                          marginBottom: '1.75rem',
                          color: '#64748B',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem'
                        }}>
                          <span style={{ fontSize: '1.25rem' }}>ℹ️</span>
                          <span>Related task is no longer available or not attached.</span>
                        </div>
                      )}

                      {/* Additional Information Grid */}
                      <div style={{ marginBottom: '1.75rem' }}>
                        <h4 style={{ fontSize: '0.925rem', fontWeight: 800, color: '#0F172A', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>Additional Information</span>
                          <span style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }}></span>
                        </h4>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                          
                          {/* Assigned On */}
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                              📅
                            </div>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Assigned On</div>
                              <div style={{ fontSize: '0.875rem', color: '#0F172A', fontWeight: 700 }}>
                                {formatDateFull(issue?.assignedAt || issue?.createdAt || selectedNotification.createdAt)}
                              </div>
                            </div>
                          </div>

                          {/* Estimated Completion */}
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                              ⌛
                            </div>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Estimated Completion</div>
                              <div style={{ fontSize: '0.875rem', color: '#0F172A', fontWeight: 700 }}>
                                {issue?.sla?.dueAt ? formatDateFull(issue.sla.dueAt) : 'Not available'}
                              </div>
                            </div>
                          </div>

                          {/* Assigned By */}
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                              👤
                            </div>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Assigned By</div>
                              <div style={{ fontSize: '0.875rem', color: '#0F172A', fontWeight: 700 }}>
                                {issue?.assignedBy?.name || issue?.assignedBy?.email || 'Municipal Admin'}
                              </div>
                            </div>
                          </div>

                          {/* Priority */}
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                              ⚠️
                            </div>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Priority</div>
                              <div style={{ marginTop: '2px' }}>
                                <span style={{
                                  backgroundColor: '#FEF2F2',
                                  color: '#EF4444',
                                  fontSize: '0.725rem',
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  textTransform: 'capitalize'
                                }}>
                                  {issue?.priority || 'High'}
                                </span>
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* Need Help Section (Matching Reference Design Box) */}
                      <div style={{
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #DBEAFE',
                        borderRadius: '14px',
                        padding: '1.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem'
                      }}>
                        <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#0066FF', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
                            i
                          </div>
                          <div>
                            <h4 style={{ fontSize: '0.925rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.125rem 0' }}>
                              Need Help?
                            </h4>
                            <p style={{ fontSize: '0.8125rem', color: '#475569', margin: 0 }}>
                              If you have any questions about this task, please contact your supervisor or support team.
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => navigate('/worker/help')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            backgroundColor: 'white',
                            border: '1px solid #BFDBFE',
                            borderRadius: '10px',
                            padding: '0.5rem 1rem',
                            color: '#0066FF',
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                          }}
                        >
                          <span>💬</span>
                          <span>Contact Support</span>
                          <span>→</span>
                        </button>
                      </div>

                    </div>
                  );
                })()
              )}

            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default WorkerNotifications;
