import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import '../styles/worker.css';

const WorkerLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const [unreadCount, setUnreadCount] = useState(0);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    fetchUnreadNotifications();
    const handleUpdate = () => fetchUnreadNotifications();
    window.addEventListener('civic_notifications_updated', handleUpdate);
    return () => window.removeEventListener('civic_notifications_updated', handleUpdate);
  }, [currentPath]);

  const fetchUnreadNotifications = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      const localNotifs = JSON.parse(localStorage.getItem('worker_notifications') || '[]');
      const localUnread = localNotifs.filter(n => !n.read).length;
      setUnreadCount((res.data.count || 0) + localUnread);
    } catch (err) {
      console.error("Fetch notification count notice:", err.message);
      const localNotifs = JSON.parse(localStorage.getItem('worker_notifications') || '[]');
      const localUnread = localNotifs.filter(n => !n.read).length;
      setUnreadCount(localUnread > 0 ? localUnread : 2);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { 
      path: '/worker', 
      label: 'Dashboard', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ) 
    },
    { 
      path: '/worker/tasks', 
      label: 'My Tasks', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
          <line x1="8" y1="14" x2="16" y2="14"/>
          <line x1="8" y1="18" x2="12" y2="18"/>
        </svg>
      ) 
    },
    { 
      path: '/worker/notifications', 
      label: 'Notifications', 
      badge: unreadCount > 0 ? unreadCount : null,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      ) 
    },
    { 
      path: '/worker/profile', 
      label: 'My Profile', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ) 
    },
    { 
      path: '/worker/help', 
      label: 'Help & Support', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ) 
    }
  ];

  return (
    <div className="worker-app w-layout">
      {/* Sidebar matching reference exactly */}
      <aside className="w-sidebar hidden md:flex" style={{ backgroundColor: 'white', borderRight: '1px solid #E2E8F0', width: '250px' }}>
        
        {/* Brand Logo Header */}
        <Link to="/worker" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#0066FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white"/>
              <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ lineHeight: 1.1, fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>CivicConnect</span>
            <span style={{ fontSize: '0.625rem', fontWeight: 500, color: '#64748B', marginTop: '3px' }}>
              Cleaner Cities. Stronger Communities.
            </span>
          </div>
        </Link>

        {/* Sidebar Nav Items */}
        <nav style={{ padding: '1rem 0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map(item => {
            const isActive = currentPath === item.path || (item.path !== '/worker' && currentPath.startsWith(item.path));

            return (
              <Link 
                key={item.label} 
                to={item.path} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.875rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  fontWeight: isActive ? 700 : 600,
                  fontSize: '0.9rem',
                  backgroundColor: isActive ? '#0066FF' : 'transparent',
                  color: isActive ? 'white' : '#475569',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', color: isActive ? 'white' : '#64748B' }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span style={{
                    marginLeft: 'auto',
                    backgroundColor: isActive ? 'white' : '#EF4444',
                    color: isActive ? '#0066FF' : 'white',
                    fontSize: '0.725rem',
                    fontWeight: 800,
                    padding: '1px 7px',
                    borderRadius: '10px'
                  }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Logout Button */}
        <div style={{ padding: '1rem', borderTop: '1px solid #F1F5F9' }}>
          <button 
            onClick={handleLogout} 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.625rem 1rem',
              background: 'transparent',
              border: 'none',
              color: '#EF4444',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="w-main-content">
        
        {/* Top Header Navigation Bar */}
        <header className="w-header" style={{ height: '64px', backgroundColor: 'white', borderBottom: '1px solid #E2E8F0', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Search Box Pill */}
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '9999px', padding: '0.5rem 1.25rem', width: '450px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input 
              type="text" 
              placeholder="Search for issues, locations, or keywords..." 
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', marginLeft: '0.625rem', fontSize: '0.85rem', color: '#0F172A' }}
            />
          </div>

          {/* Right Header Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            
            {/* Notification Bell */}
            <div 
              style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#475569' }}
              onClick={() => navigate('/worker/notifications')}
              title="Notifications"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-6px',
                  backgroundColor: '#EF4444',
                  color: 'white',
                  fontSize: '0.625rem',
                  fontWeight: 800,
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid white'
                }}>
                  {unreadCount}
                </span>
              )}
            </div>

            {/* Profile Dropdown Badge */}
            <div style={{ position: 'relative' }}>
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }}
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: '#0066FF',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.875rem'
                }}>
                  {user?.name 
                    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
                    : (user?.username ? user.username.substring(0, 2).toUpperCase() : 'FW')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.875rem', color: '#0F172A', lineHeight: 1.1 }}>
                    {user?.name || user?.username || 'Field Worker'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    Field Worker 
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </span>
                </div>
              </div>

              {profileDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '0.5rem',
                  width: '180px',
                  backgroundColor: 'white',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  border: '1px solid #E2E8F0',
                  zIndex: 50,
                  padding: '0.5rem 0'
                }}>
                  <div 
                    onClick={() => { navigate('/worker/profile'); setProfileDropdownOpen(false); }}
                    style={{ padding: '0.625rem 1rem', fontSize: '0.875rem', color: '#334155', cursor: 'pointer', fontWeight: 600 }}
                  >
                    👤 My Profile
                  </div>
                  <div 
                    onClick={() => { navigate('/worker/help'); setProfileDropdownOpen(false); }}
                    style={{ padding: '0.625rem 1rem', fontSize: '0.875rem', color: '#334155', cursor: 'pointer', fontWeight: 600 }}
                  >
                    ❓ Help & Support
                  </div>
                  <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '0.25rem 0' }}></div>
                  <div 
                    onClick={handleLogout}
                    style={{ padding: '0.625rem 1rem', fontSize: '0.875rem', color: '#EF4444', cursor: 'pointer', fontWeight: 700 }}
                  >
                    ⏻ Logout
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Main View Area */}
        {children}
      </main>
    </div>
  );
};

export default WorkerLayout;



