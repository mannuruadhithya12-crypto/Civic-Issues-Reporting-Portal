import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import '../styles/citizen.css';

const CitizenLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const searchRef = useRef(null);

  const isAuthPage = ['/login', '/register', '/signup', '/forgot-password'].includes(location.pathname) || 
                     location.pathname.startsWith('/reset-password');

  useEffect(() => {
    if (!user || isAuthPage) return;
    const fetchUnread = async () => {
      try {
        const res = await api.get('/notifications/unread-count');
        setUnreadCount(res.data.count || 0);
      } catch (err) {
        // Silently catch error
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [user, isAuthPage]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setShowSearchDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowSearchDropdown(true);

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/issues?search=${encodeURIComponent(searchQuery.trim())}`);
        setSearchResults(Array.isArray(res.data) ? res.data.slice(0, 5) : []);
      } catch (err) {
        setSearchResults([]);
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
      setShowSearchDropdown(false);
      navigate(`/issues?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  if (isAuthPage) {
    return (
      <div className="citizen-app" style={{ justifyContent: 'center', alignItems: 'center', padding: '40px 16px' }}>
        {children}
      </div>
    );
  }

  const getUserInitials = () => {
    if (!user || !user.name) return 'JD';
    const parts = user.name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return user.name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="citizen-app">
      
      {/* ================= HEADER ================= */}
      <header className="citizen-header">
        
        {/* LEFT: Logo */}
        <Link to="/" className="citizen-header-left">
          <div className="citizen-logo-icon">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="citizen-brand-info">
            <span className="citizen-brand-title">CivicConnect</span>
            <span className="citizen-brand-subtitle">Cleaner Cities. Stronger Communities.</span>
          </div>
        </Link>

        {/* CENTER: Search Bar */}
        <div ref={searchRef} className="citizen-header-search">
          <form onSubmit={handleSearchSubmit} className="citizen-search-input-wrapper">
            <svg className="citizen-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim() && setShowSearchDropdown(true)}
              placeholder="Search for issues, locations, or keywords..."
              className="citizen-search-input"
            />
          </form>

          {showSearchDropdown && (
            <div className="citizen-search-dropdown">
              {isSearching ? (
                <div style={{ padding: '12px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>Searching...</div>
              ) : searchResults.length === 0 ? (
                <div style={{ padding: '12px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>No issues found.</div>
              ) : (
                searchResults.map((issue) => (
                  <div
                    key={issue._id}
                    onClick={() => {
                      setShowSearchDropdown(false);
                      setSearchQuery('');
                      navigate(`/issues/${issue._id}`);
                    }}
                    className="citizen-search-item"
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{issue.title}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{issue.locationName || issue.location}</div>
                    </div>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: '#f1f5f9', fontWeight: '600' }}>
                      {issue.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Profile & Notifications */}
        <div className="citizen-header-right">
          
          <Link to="/notifications" className="citizen-bell-btn" title="Notifications">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="citizen-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </Link>

          {user ? (
            <div style={{ position: 'relative' }}>
              <div 
                className="citizen-profile-menu-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <div className="citizen-avatar-circle">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    getUserInitials()
                  )}
                </div>

                <div className="citizen-user-details">
                  <span className="citizen-user-name">{user.name || user.username || 'Citizen'}</span>
                  <span className="citizen-user-role">{user.role === 'citizen' ? 'Citizen' : (user.role || 'Citizen')}</span>
                </div>

                <svg width="14" height="14" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2">
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {dropdownOpen && (
                <div className="citizen-profile-dropdown">
                  <div style={{ padding: '8px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700' }}>{user.name || user.username}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{user.email}</div>
                  </div>
                  
                  {user.role === 'admin' && (
                    <Link to="/admin" className="citizen-dropdown-item" onClick={() => setDropdownOpen(false)}>
                      ⚡ Admin Dashboard
                    </Link>
                  )}
                  {user.role === 'worker' && (
                    <Link to="/worker" className="citizen-dropdown-item" onClick={() => setDropdownOpen(false)}>
                      🛠️ Worker Dashboard
                    </Link>
                  )}

                  <Link to="/profile" className="citizen-dropdown-item" onClick={() => setDropdownOpen(false)}>
                    👤 Profile
                  </Link>

                  <Link to="/settings" className="citizen-dropdown-item" onClick={() => setDropdownOpen(false)}>
                    ⚙️ Settings
                  </Link>

                  <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }}></div>

                  <div 
                    onClick={handleLogout}
                    className="citizen-dropdown-item"
                    style={{ color: '#ef4444' }}
                  >
                    🚪 Logout
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link to="/login" style={{ fontSize: '13px', fontWeight: '700', padding: '8px 16px' }}>Login</Link>
              <Link to="/register" style={{ fontSize: '13px', fontWeight: '700', background: '#1d61f2', color: 'white', padding: '8px 16px', borderRadius: '12px' }}>Sign Up</Link>
            </div>
          )}

        </div>
      </header>

      {/* ================= MAIN CONTAINER ================= */}
      <div className="citizen-layout-container">
        
        {/* LEFT SIDEBAR */}
        <aside className="citizen-sidebar">
          <nav className="citizen-sidebar-nav">
            
            <Link to="/" className={`citizen-sidebar-link ${isActive('/') ? 'active' : ''}`}>
              <div className="citizen-sidebar-link-content">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
                <span>Home</span>
              </div>
            </Link>

            <Link to="/report" className={`citizen-sidebar-link ${isActive('/submit') || isActive('/report') ? 'active' : ''}`}>
              <div className="citizen-sidebar-link-content">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                <span>Report Issue</span>
              </div>
            </Link>

            <Link to="/issues" className={`citizen-sidebar-link ${location.pathname.startsWith('/issues') ? 'active' : ''}`}>
              <div className="citizen-sidebar-link-content">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <span>My Issues</span>
              </div>
            </Link>

            <Link to="/map" className={`citizen-sidebar-link ${isActive('/map') ? 'active' : ''}`}>
              <div className="citizen-sidebar-link-content">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                </svg>
                <span>Map</span>
              </div>
            </Link>

            <Link to="/notifications" className={`citizen-sidebar-link ${isActive('/notifications') ? 'active' : ''}`}>
              <div className="citizen-sidebar-link-content">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                </svg>
                <span>Notifications</span>
              </div>
              {unreadCount > 0 && <span className="citizen-sidebar-badge">{unreadCount}</span>}
            </Link>

            <Link to="/profile" className={`citizen-sidebar-link ${isActive('/profile') ? 'active' : ''}`}>
              <div className="citizen-sidebar-link-content">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Profile</span>
              </div>
            </Link>

            <Link to="/settings" className={`citizen-sidebar-link ${isActive('/settings') ? 'active' : ''}`}>
              <div className="citizen-sidebar-link-content">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span>Settings</span>
              </div>
            </Link>

            <Link to="/help" className={`citizen-sidebar-link ${isActive('/help') ? 'active' : ''}`}>
              <div className="citizen-sidebar-link-content">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>Help & Support</span>
              </div>
            </Link>

          </nav>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="citizen-main-content">
          {children}
        </main>

      </div>

      {/* FOOTER */}
      <footer className="citizen-footer">
        <div className="citizen-footer-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div className="citizen-logo-icon" style={{ width: '28px', height: '28px', borderRadius: '8px' }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <span style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>CivicConnect</span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.5', margin: 0 }}>
              Cleaner Cities. Stronger Communities. Empowering citizens to report, track, and resolve municipal issues together.
            </p>
          </div>

          <div>
            <div style={{ fontWeight: '800', fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px', color: '#0f172a', letterSpacing: '0.5px' }}>Quick Links</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#475569' }}>
              <Link to="/">Home</Link>
              <Link to="/report">Report Issue</Link>
              <Link to="/issues">My Issues</Link>
              <Link to="/map">Map</Link>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: '800', fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px', color: '#0f172a', letterSpacing: '0.5px' }}>Support</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#475569' }}>
              <Link to="/help">Help Center</Link>
              <Link to="/settings">Settings</Link>
              <span style={{ color: '#94a3b8' }}>Emergency: 911 / Municipal Dispatch</span>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: '800', fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px', color: '#0f172a', letterSpacing: '0.5px' }}>Civic Platform</div>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', lineHeight: '1.4' }}>
              Real-time civic intelligence, ML incident prediction, and dispatch management.
            </p>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              &copy; {new Date().getFullYear()} CivicConnect. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default CitizenLayout;
