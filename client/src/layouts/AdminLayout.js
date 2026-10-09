import React, { useContext, useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useRealTime } from '../context/RealTimeContext';
import { DataModeToggle } from '../components/common/DataModeControls';
import api from '../services/api';

const AdminLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const { subscribe } = useRealTime();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      const list = Array.isArray(res.data) ? res.data : (res.data?.notifications || []);
      const count = list.filter(n => !n.read).length;
      setUnreadCount(count);
    } catch (err) {
      console.error('Error fetching notifications count:', err);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const unsubscribe = subscribe('*', () => {
      fetchUnreadCount();
    });
    return () => unsubscribe();
  }, [fetchUnreadCount, subscribe]);

  // Debounced search logic
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get(`/admin/command-center/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.data && res.data.success) {
          setSearchResults(res.data.results || []);
          setSearchOpen(true);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/admin/civic?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  const navItems = [
    {
      name: 'Command Center',
      path: '/admin',
      exact: true,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      )
    },
    {
      name: 'Civic Issues',
      path: '/admin/civic',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      )
    },
    {
      name: 'Citizens',
      path: '/admin/citizens',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      )
    },
    {
      name: 'Workers',
      path: '/admin/workers',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      )
    },
    {
      name: 'Live Map',
      path: '/admin/live-map',
      aliasPaths: ['/admin/live_map'],
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
          <line x1="8" y1="2" x2="8" y2="18"/>
          <line x1="16" y1="6" x2="16" y2="22"/>
        </svg>
      )
    },

    {
      name: 'Intelligence',
      path: '/admin/intelligence',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a9 9 0 0 1 9 9c0 3.6-2.1 6.7-5.2 8.1l-1.3.6a.75.75 0 0 0-.5.7v1.6H10v-1.6a.75.75 0 0 0-.5-.7l-1.3-.6A9 9 0 0 1 3 11a9 9 0 0 1 9-9z"/>
          <path d="M9 22h6"/>
        </svg>
      )
    },

    {
      name: 'Live Operations',
      path: '/admin/live',
      exact: true,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <polygon points="10 8 16 12 10 16 10 8"/>
        </svg>
      )
    },
    {
      name: 'Notifications',
      path: '/admin/notifications',
      badge: unreadCount > 0 ? unreadCount : null,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      )
    },
    {
      name: 'Reports & Analytics',
      path: '/admin/reports',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      )
    },
    {
      name: 'Settings',
      path: '/admin/settings',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      )
    },
    {
      name: 'Help & Support',
      path: '/help',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      )
    }
  ];

  const displayName = user?.name || user?.username || 'System Administrator';
  const displayRole = user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Administrator';
  const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'SA';

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <Link to="/admin" className="admin-logo">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="4" width="24" height="24" rx="6" fill="#2563eb"/>
              <path d="M16 8L23 12V20L16 24L9 20V12L16 8Z" fill="#ffffff" fillOpacity="0.9"/>
              <path d="M16 11L20 13.5V18.5L16 21L12 18.5V13.5L16 11Z" fill="#2563eb"/>
            </svg>
            <div className="admin-logo-text">
              <span className="admin-logo-title">CivicConnect</span>
              <span className="admin-logo-subtitle">Municipal Intelligence Platform</span>
            </div>
          </Link>
        </div>
        
        <nav className="admin-nav">
          {navItems.map((item) => {
            const isPathMatch = (targetPath) => {
              if (location.pathname === targetPath) return true;
              if (location.pathname === targetPath + '/') return true;
              return false;
            };

            const isActive = item.exact 
              ? isPathMatch(item.path) || (item.aliasPaths && item.aliasPaths.some(isPathMatch))
              : (isPathMatch(item.path) || location.pathname.startsWith(item.path + '/') || (item.aliasPaths && item.aliasPaths.some(p => location.pathname.startsWith(p))));

            return (
              <Link 
                key={item.path}
                to={item.path}
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="admin-nav-icon">{item.icon}</span>
                <span>{item.name}</span>
                {item.badge && <span className="admin-nav-badge">{item.badge}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Area */}
      <div className="admin-main">
        {/* Top Header */}
        <header className="admin-header">
          <div className="admin-header-left">
            <form onSubmit={handleSearchSubmit} className="admin-header-search" style={{ position: 'relative' }}>
              <svg 
                style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} 
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input 
                type="text" 
                placeholder="Search issues, citizens, workers, locations, or keywords..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setSearchOpen(true); }}
              />

              {searchOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '6px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  zIndex: 1000,
                  maxHeight: '350px',
                  overflowY: 'auto'
                }}>
                  {isSearching ? (
                    <div style={{ padding: '12px', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>Searching...</div>
                  ) : searchResults.length === 0 ? (
                    <div style={{ padding: '12px', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>No results found.</div>
                  ) : (
                    searchResults.map((item) => (
                      <div 
                        key={`${item.type}-${item.id}`}
                        style={{
                          padding: '10px 14px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery('');
                          navigate(item.route);
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{item.title}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{item.subtitle}</div>
                        </div>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: item.type === 'Issue' ? '#dbeafe' : item.type === 'Worker' ? '#fef3c7' : '#e0e7ff',
                          color: item.type === 'Issue' ? '#1d4ed8' : item.type === 'Worker' ? '#b45309' : '#4338ca'
                        }}>
                          {item.type}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </form>
          </div>
          
          <div className="admin-header-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Demo vs Live Data Mode Toggle */}
            <DataModeToggle />

            {/* Notification Bell */}
            <div 
              style={{ position: 'relative', cursor: 'pointer' }}
              onClick={() => navigate('/admin/notifications')}
              title="Notifications"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: '700',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {unreadCount}
                </span>
              )}
            </div>
            
            {/* User Profile */}
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', position: 'relative' }}
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            >
              <div className="admin-avatar">{initials}</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', lineHeight: '1.2' }}>{displayName}</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{displayRole}</span>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>

              {profileDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  width: '180px',
                  zIndex: 100,
                  overflow: 'hidden'
                }}>
                  <div 
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '13px', color: '#0f172a' }}
                    onClick={() => { setProfileDropdownOpen(false); navigate('/profile'); }}
                  >
                    👤 Profile Settings
                  </div>
                  <div 
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '13px', color: '#0f172a' }}
                    onClick={() => { setProfileDropdownOpen(false); navigate('/admin/settings'); }}
                  >
                    ⚙️ Admin Settings
                  </div>
                  <div 
                    style={{ padding: '10px 14px', cursor: 'pointer', color: '#ef4444', fontSize: '13px' }}
                    onClick={() => { setProfileDropdownOpen(false); handleLogout(); }}
                  >
                    ⏻ Logout
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        
        {/* Main Content Area */}
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

