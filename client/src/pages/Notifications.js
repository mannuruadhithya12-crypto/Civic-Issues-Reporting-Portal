import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Spinner from '../components/common/Spinner';

// Categorize notification type into 3 tabs
const categorizeType = (type) => {
  const t = (type || '').toLowerCase();
  if (t === 'announcement') return 'Announcements';
  if (t === 'system' || t === 'sla_warning' || t === 'sla_breach' || t === 'warning' || t === 'general') return 'System';
  return 'Issue Updates';
};

// Helper for relative time string
const getRelativeTime = (dateString) => {
  if (!dateString) return 'Recently';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 4) return `${diffWeek} ${diffWeek === 1 ? 'week' : 'weeks'} ago`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth} ${diffMonth === 1 ? 'month' : 'months'} ago`;
};

// Format exact date time
const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' • ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

// Format date only
const formatDateOnly = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Icon & Color styling helper based on notification type
const getNotificationTypeMeta = (type, title = '') => {
  const t = (type || '').toLowerCase();
  const titleLower = (title || '').toLowerCase();

  if (t === 'resolved' || titleLower.includes('resolved')) {
    return {
      bg: '#dcfce7',
      color: '#16a34a',
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )
    };
  }

  if (t === 'announcement' || titleLower.includes('clean-up') || titleLower.includes('announcement')) {
    return {
      bg: '#f3e8ff',
      color: '#9333ea',
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.684A1.85 1.85 0 014 12c0-.75.454-1.4 1.12-1.684l6.096-2.612C12.33 7.227 13 8.04 13 9.24v5.52c0 1.2-.67 2.013-1.784 1.536l-5.78-2.612z" />
        </svg>
      )
    };
  }

  if (t === 'comment' || titleLower.includes('comment')) {
    return {
      bg: '#fef3c7',
      color: '#d97706',
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    };
  }

  if (t === 'warning' || t === 'sla_warning' || t === 'sla_breach' || titleLower.includes('delay') || titleLower.includes('warning')) {
    return {
      bg: '#fef2f2',
      color: '#dc2626',
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    };
  }

  if (t === 'under_review' || titleLower.includes('under review')) {
    return {
      bg: '#faf5ff',
      color: '#9333ea',
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    };
  }

  // Default Issue Status / Update Blue Icon
  return {
    bg: '#eff6ff',
    color: '#1d61f2',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
      </svg>
    )
  };
};

// Status Badge Helper
const getStatusBadgeMeta = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'resolved') {
    return { label: 'Resolved', bg: '#dcfce7', color: '#16a34a' };
  }
  if (s === 'in_progress' || s === 'assigned' || s === 'in progress') {
    return { label: 'In Progress', bg: '#dbeafe', color: '#1d61f2' };
  }
  if (s === 'under_review' || s === 'verified' || s === 'under review') {
    return { label: 'Under Review', bg: '#f3e8ff', color: '#9333ea' };
  }
  if (s === 'closed' || s === 'rejected') {
    return { label: 'Closed', bg: '#fef2f2', color: '#dc2626' };
  }
  return { label: 'Reported', bg: '#fef3c7', color: '#b45309' };
};

function Notifications() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('All'); // 'All' | 'Issue Updates' | 'Announcements' | 'System'
  const [notifications, setNotifications] = useState([]);
  const [selectedNotificationId, setSelectedNotificationId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch Notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      let items = [];
      if (res.data && Array.isArray(res.data.notifications)) {
        items = res.data.notifications;
      } else if (Array.isArray(res.data)) {
        items = res.data;
      }

      setNotifications(items);

      if (items.length > 0 && !selectedNotificationId) {
        setSelectedNotificationId(items[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedNotificationId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      try {
        await api.put('/notifications/mark-all-read');
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      } catch (err2) {
        console.error('Error marking all as read:', err2);
      }
    }
  };

  // Select Notification & Mark as Read
  const handleSelectNotification = async (notif) => {
    setSelectedNotificationId(notif._id);

    if (!notif.read) {
      // Optimistic update
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));

      try {
        await api.patch(`/notifications/${notif._id}/read`);
      } catch (err) {
        try {
          await api.put(`/notifications/${notif._id}/read`);
        } catch (err2) {
          console.error('Failed to mark read:', err2);
        }
      }
    }
  };

  // Calculate Tab Counts
  const counts = {
    all: notifications.length,
    issueUpdates: notifications.filter(n => categorizeType(n.type) === 'Issue Updates').length,
    announcements: notifications.filter(n => categorizeType(n.type) === 'Announcements').length,
    system: notifications.filter(n => categorizeType(n.type) === 'System').length
  };

  // Filter notifications by Active Tab
  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'Issue Updates') return categorizeType(n.type) === 'Issue Updates';
    if (activeTab === 'Announcements') return categorizeType(n.type) === 'Announcements';
    if (activeTab === 'System') return categorizeType(n.type) === 'System';
    return true; // 'All'
  });

  // Selected Notification details object
  const selectedNotif = notifications.find(n => n._id === selectedNotificationId) || (filteredNotifications.length > 0 ? filteredNotifications[0] : null);
  const selectedIssue = selectedNotif?.issue || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', boxSizing: 'border-box' }}>
      
      {/* ================= PAGE HEADER ================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.4px' }}>
            Notifications
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, fontWeight: '500' }}>
            Stay updated on the progress of your reported issues and important announcements.
          </p>
        </div>

        {/* Top-Right Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={handleMarkAllRead}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#1d61f2',
              fontSize: '13px',
              fontWeight: '700',
              padding: '10px 20px',
              borderRadius: '9999px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease'
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Mark All as Read
          </button>

          <button
            type="button"
            onClick={() => navigate('/settings')}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#1d61f2',
              fontSize: '13px',
              fontWeight: '700',
              padding: '10px 20px',
              borderRadius: '9999px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease'
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Notification Settings
          </button>
        </div>
      </div>

      {/* ================= CATEGORY TABS ================= */}
      <div style={{ display: 'flex', gap: '12px' }}>
        
        {/* Tab 1: All */}
        <button
          type="button"
          onClick={() => setActiveTab('All')}
          style={{
            backgroundColor: activeTab === 'All' ? '#1d61f2' : '#ffffff',
            color: activeTab === 'All' ? '#ffffff' : '#475569',
            border: activeTab === 'All' ? 'none' : '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: activeTab === 'All' ? '0 4px 12px rgba(29, 97, 242, 0.25)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          All
          <span
            style={{
              backgroundColor: activeTab === 'All' ? '#ffffff' : '#f1f5f9',
              color: activeTab === 'All' ? '#1d61f2' : '#64748b',
              fontSize: '11px',
              fontWeight: '800',
              padding: '2px 8px',
              borderRadius: '9999px'
            }}
          >
            {counts.all}
          </span>
        </button>

        {/* Tab 2: Issue Updates */}
        <button
          type="button"
          onClick={() => setActiveTab('Issue Updates')}
          style={{
            backgroundColor: activeTab === 'Issue Updates' ? '#1d61f2' : '#ffffff',
            color: activeTab === 'Issue Updates' ? '#ffffff' : '#475569',
            border: activeTab === 'Issue Updates' ? 'none' : '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: activeTab === 'Issue Updates' ? '0 4px 12px rgba(29, 97, 242, 0.25)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          Issue Updates
          <span
            style={{
              backgroundColor: activeTab === 'Issue Updates' ? '#ffffff' : '#f1f5f9',
              color: activeTab === 'Issue Updates' ? '#1d61f2' : '#64748b',
              fontSize: '11px',
              fontWeight: '800',
              padding: '2px 8px',
              borderRadius: '9999px'
            }}
          >
            {counts.issueUpdates}
          </span>
        </button>

        {/* Tab 3: Announcements */}
        <button
          type="button"
          onClick={() => setActiveTab('Announcements')}
          style={{
            backgroundColor: activeTab === 'Announcements' ? '#1d61f2' : '#ffffff',
            color: activeTab === 'Announcements' ? '#ffffff' : '#475569',
            border: activeTab === 'Announcements' ? 'none' : '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: activeTab === 'Announcements' ? '0 4px 12px rgba(29, 97, 242, 0.25)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          Announcements
          <span
            style={{
              backgroundColor: activeTab === 'Announcements' ? '#ffffff' : '#f1f5f9',
              color: activeTab === 'Announcements' ? '#1d61f2' : '#64748b',
              fontSize: '11px',
              fontWeight: '800',
              padding: '2px 8px',
              borderRadius: '9999px'
            }}
          >
            {counts.announcements}
          </span>
        </button>

        {/* Tab 4: System */}
        <button
          type="button"
          onClick={() => setActiveTab('System')}
          style={{
            backgroundColor: activeTab === 'System' ? '#1d61f2' : '#ffffff',
            color: activeTab === 'System' ? '#ffffff' : '#475569',
            border: activeTab === 'System' ? 'none' : '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: activeTab === 'System' ? '0 4px 12px rgba(29, 97, 242, 0.25)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          System
          <span
            style={{
              backgroundColor: activeTab === 'System' ? '#ffffff' : '#f1f5f9',
              color: activeTab === 'System' ? '#1d61f2' : '#64748b',
              fontSize: '11px',
              fontWeight: '800',
              padding: '2px 8px',
              borderRadius: '9999px'
            }}
          >
            {counts.system}
          </span>
        </button>

      </div>

      {/* ================= 2-COLUMN MAIN CONTENT ================= */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
        
        {/* LEFT COLUMN: NOTIFICATION LIST */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {loading ? (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '48px 24px', textAlign: 'center' }}>
              <Spinner />
            </div>
          ) : filteredNotifications.length === 0 ? (
            /* Empty State */
            <div 
              style={{ 
                backgroundColor: '#ffffff', 
                borderRadius: '24px', 
                border: '1px solid #e2e8f0', 
                padding: '64px 32px', 
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              <div 
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#eff6ff',
                  color: '#1d61f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px'
                }}
              >
                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
                You're all caught up!
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                You don't have any notifications in this category yet.
              </p>
            </div>
          ) : (
            <>
              {filteredNotifications.map((notif) => {
                const isSelected = selectedNotif && selectedNotif._id === notif._id;
                const isUnread = !notif.read;
                const typeMeta = getNotificationTypeMeta(notif.type, notif.title);

                return (
                  <div
                    key={notif._id}
                    onClick={() => handleSelectNotification(notif)}
                    style={{
                      backgroundColor: isSelected ? '#eff6ff' : (isUnread ? '#f8fafc' : '#ffffff'),
                      border: isSelected ? '2px solid #1d61f2' : '1px solid #e2e8f0',
                      borderRadius: '20px',
                      padding: '16px 20px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      position: 'relative',
                      boxShadow: isSelected ? '0 4px 14px rgba(29, 97, 242, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                  >
                    {/* Icon Badge */}
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        backgroundColor: typeMeta.bg,
                        color: typeMeta.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {typeMeta.icon}
                    </div>

                    {/* Notification Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: isUnread ? '800' : '700', color: '#0f172a', marginBottom: '4px' }}>
                        {notif.title}
                      </div>

                      <div 
                        style={{ 
                          fontSize: '12px', 
                          color: '#475569', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          marginBottom: '6px',
                          lineHeight: '1.4'
                        }}
                      >
                        {notif.message}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {getRelativeTime(notif.createdAt)}
                      </div>
                    </div>

                    {/* Unread Blue Dot Indicator */}
                    {isUnread && (
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: '#1d61f2',
                          flexShrink: 0
                        }}
                      />
                    )}

                    {/* Right Chevron Arrow */}
                    <div style={{ color: '#cbd5e1', fontSize: '16px', fontWeight: 'bold', flexShrink: 0 }}>
                      &rsaquo;
                    </div>

                  </div>
                );
              })}

              {/* Bottom List Footer Banner */}
              <div 
                style={{ 
                  textAlign: 'center', 
                  padding: '24px 16px', 
                  color: '#94a3b8', 
                  fontSize: '12px', 
                  fontWeight: '600',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <svg width="24" height="24" fill="none" stroke="#cbd5e1" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span>No more notifications</span>
                <span style={{ fontSize: '11px', color: '#cbd5e1' }}>You're all caught up!</span>
              </div>
            </>
          )}

        </div>

        {/* RIGHT COLUMN: NOTIFICATION DETAIL PANEL */}
        <div>
          {selectedNotif ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                position: 'sticky',
                top: '92px'
              }}
            >
              {/* Detail Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {(() => {
                  const meta = getNotificationTypeMeta(selectedNotif.type, selectedNotif.title);
                  return (
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: meta.bg,
                        color: meta.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {meta.icon}
                    </div>
                  );
                })()}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', lineHeight: '1.2' }}>
                    {selectedNotif.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {getRelativeTime(selectedNotif.createdAt)}
                  </div>
                </div>

                {!selectedNotif.read && (
                  <span style={{ backgroundColor: '#1d61f2', color: '#ffffff', padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: '800' }}>
                    New
                  </span>
                )}
              </div>

              {/* Message Box */}
              <div 
                style={{ 
                  backgroundColor: '#f8fafc', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '16px', 
                  padding: '16px',
                  fontSize: '13px',
                  color: '#334155',
                  lineHeight: '1.5',
                  fontWeight: '500'
                }}
              >
                {selectedNotif.message}
              </div>

              {/* Issue Details Card (if associated issue exists) */}
              {selectedIssue && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                    Issue Details
                  </div>

                  <div 
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '18px',
                      padding: '14px',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center'
                    }}
                  >
                    {/* Issue Image or Fallback */}
                    <div 
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        backgroundColor: '#f1f5f9',
                        flexShrink: 0,
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {selectedIssue.images && selectedIssue.images.length > 0 ? (
                        <img src={selectedIssue.images[0]} alt={selectedIssue.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <svg width="24" height="24" fill="none" stroke="#64748b" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      )}
                    </div>

                    {/* Issue Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                          {selectedIssue.title}
                        </span>
                        {(() => {
                          const badge = getStatusBadgeMeta(selectedIssue.status);
                          return (
                            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: badge.bg, color: badge.color, padding: '2px 8px', borderRadius: '9999px' }}>
                              {badge.label}
                            </span>
                          );
                        })()}
                      </div>

                      <div style={{ fontSize: '11px', color: '#1d61f2', fontWeight: '700', fontFamily: 'monospace', marginBottom: '4px' }}>
                        #CC-{(selectedIssue._id || '').substring((selectedIssue._id || '').length - 6).toUpperCase()}
                      </div>

                      <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {selectedIssue.locationName || selectedIssue.location || 'Municipal Area'}
                        </span>
                      </div>

                      <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Dept: {selectedIssue.department || 'General'}</span>
                        <span>Reported {formatDateOnly(selectedIssue.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* What's Next? Progress Timeline */}
              {selectedIssue && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                    What's Next?
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '8px', position: 'relative' }}>
                    
                    {/* Step 1: Reported */}
                    <div style={{ display: 'flex', gap: '14px', position: 'relative', paddingBottom: '20px' }}>
                      {/* Line */}
                      <div style={{ position: 'absolute', left: '7px', top: '16px', bottom: 0, width: '2px', backgroundColor: '#1d61f2' }} />
                      
                      {/* Node */}
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#1d61f2', flexShrink: 0, zIndex: 1 }} />
                      
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>Issue reported</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{formatDateTime(selectedIssue.createdAt)}</div>
                      </div>
                    </div>

                    {/* Step 2: Under Review */}
                    <div style={{ display: 'flex', gap: '14px', position: 'relative', paddingBottom: '20px' }}>
                      {/* Line */}
                      <div style={{ position: 'absolute', left: '7px', top: '16px', bottom: 0, width: '2px', backgroundColor: ['in_progress', 'assigned', 'resolved', 'closed'].includes((selectedIssue.status || '').toLowerCase()) ? '#1d61f2' : '#e2e8f0' }} />
                      
                      {/* Node */}
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: ['under_review', 'verified', 'in_progress', 'assigned', 'resolved', 'closed'].includes((selectedIssue.status || '').toLowerCase()) ? '#1d61f2' : '#ffffff', border: '3px solid #1d61f2', flexShrink: 0, zIndex: 1 }} />
                      
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>Under review</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {selectedIssue.verifiedAt ? formatDateTime(selectedIssue.verifiedAt) : 'Completed'}
                        </div>
                      </div>
                    </div>

                    {/* Step 3: In Progress */}
                    <div style={{ display: 'flex', gap: '14px', position: 'relative', paddingBottom: '20px' }}>
                      {/* Line */}
                      <div style={{ position: 'absolute', left: '7px', top: '16px', bottom: 0, width: '2px', backgroundColor: ['resolved', 'closed'].includes((selectedIssue.status || '').toLowerCase()) ? '#1d61f2' : '#e2e8f0' }} />
                      
                      {/* Node */}
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: ['in_progress', 'assigned', 'resolved', 'closed'].includes((selectedIssue.status || '').toLowerCase()) ? '#1d61f2' : '#ffffff', border: '3px solid #cbd5e1', flexShrink: 0, zIndex: 1 }} />
                      
                      <div 
                        style={{
                          backgroundColor: ['in_progress', 'assigned'].includes((selectedIssue.status || '').toLowerCase()) ? '#eff6ff' : 'transparent',
                          borderRadius: '12px',
                          padding: ['in_progress', 'assigned'].includes((selectedIssue.status || '').toLowerCase()) ? '10px 14px' : '0',
                          flex: 1
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: '800', color: ['in_progress', 'assigned'].includes((selectedIssue.status || '').toLowerCase()) ? '#1d61f2' : '#0f172a' }}>
                          In progress
                        </div>
                        <div style={{ fontSize: '11px', color: ['in_progress', 'assigned'].includes((selectedIssue.status || '').toLowerCase()) ? '#1d61f2' : '#64748b' }}>
                          {selectedIssue.assignedAt ? formatDateTime(selectedIssue.assignedAt) : (['in_progress', 'assigned', 'resolved', 'closed'].includes((selectedIssue.status || '').toLowerCase()) ? 'Active' : 'Pending')}
                        </div>
                        {['in_progress', 'assigned'].includes((selectedIssue.status || '').toLowerCase()) && (
                          <div style={{ fontSize: '11px', color: '#3b82f6', marginTop: '4px', lineHeight: '1.4' }}>
                            The maintenance team has started working on this issue.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Step 4: Resolved */}
                    <div style={{ display: 'flex', gap: '14px', position: 'relative', paddingBottom: '20px' }}>
                      {/* Line */}
                      <div style={{ position: 'absolute', left: '7px', top: '16px', bottom: 0, width: '2px', backgroundColor: (selectedIssue.status || '').toLowerCase() === 'closed' ? '#1d61f2' : '#e2e8f0' }} />
                      
                      {/* Node */}
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: ['resolved', 'closed'].includes((selectedIssue.status || '').toLowerCase()) ? '#16a34a' : '#ffffff', border: '3px solid #cbd5e1', flexShrink: 0, zIndex: 1 }} />
                      
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: (selectedIssue.status || '').toLowerCase() === 'resolved' ? '#16a34a' : '#475569' }}>
                          Resolved
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {selectedIssue.resolvedAt ? formatDateTime(selectedIssue.resolvedAt) : 'Pending'}
                        </div>
                      </div>
                    </div>

                    {/* Step 5: Closed */}
                    <div style={{ display: 'flex', gap: '14px', position: 'relative' }}>
                      {/* Node */}
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: (selectedIssue.status || '').toLowerCase() === 'closed' ? '#dc2626' : '#ffffff', border: '3px solid #cbd5e1', flexShrink: 0, zIndex: 1 }} />
                      
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: (selectedIssue.status || '').toLowerCase() === 'closed' ? '#dc2626' : '#475569' }}>
                          Closed
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {selectedIssue.closedAt ? formatDateTime(selectedIssue.closedAt) : 'Pending'}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Bottom Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => selectedIssue && navigate(`/issues/${selectedIssue._id}`)}
                  disabled={!selectedIssue}
                  style={{
                    flex: 1,
                    backgroundColor: '#ffffff',
                    border: '1px solid #1d61f2',
                    color: '#1d61f2',
                    fontSize: '13px',
                    fontWeight: '700',
                    padding: '12px',
                    borderRadius: '9999px',
                    cursor: selectedIssue ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View Issue Details
                </button>

                <button
                  type="button"
                  onClick={() => selectedIssue && navigate('/map', { state: { centerIssue: selectedIssue } })}
                  disabled={!selectedIssue}
                  style={{
                    flex: 1,
                    backgroundColor: '#1d61f2',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '700',
                    padding: '12px',
                    borderRadius: '9999px',
                    cursor: selectedIssue ? 'pointer' : 'not-allowed',
                    boxShadow: '0 4px 12px rgba(29, 97, 242, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  View on Map
                </button>
              </div>

            </div>
          ) : (
            <div 
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '24px',
                padding: '48px 24px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '13px'
              }}
            >
              Select a notification to view details.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

export default Notifications;
