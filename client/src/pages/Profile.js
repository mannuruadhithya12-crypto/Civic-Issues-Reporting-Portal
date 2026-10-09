import React, { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Profile() {
  const { user, updateUser, refetchUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Profile Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States'
  });

  const [initialFormData, setInitialFormData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  // Statistics State
  const [stats, setStats] = useState({
    reported: 0,
    resolved: 0,
    inProgress: 0,
    underReview: 0,
    resolvedPercent: '—',
    inProgressPercent: '—',
    underReviewPercent: '—'
  });
  const [loadingStats, setLoadingStats] = useState(true);


  // Notification Preferences State
  const [notificationPreferences, setNotificationPreferences] = useState({
    issueStatusUpdates: true,
    issueComments: true,
    announcements: true,
    systemNotifications: true,
    emailNotifications: true,
    pushNotifications: false
  });

  // Account Settings State
  const [accountSettings, setAccountSettings] = useState({
    language: 'English (US)',
    timezone: 'UTC-05:00 (Eastern Time)',
    theme: 'light',
    accessibilityMode: false,
    defaultMapView: 'standard'
  });

  // Privacy Settings State
  const [privacySettings, setPrivacySettings] = useState({
    publicProfile: false,
    showActivity: true,
    twoFactorEnabled: false
  });

  // Loading & Toast States
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [toast, setToast] = useState(null);

  // Modals State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [deactivateError, setDeactivateError] = useState('');
  const [deactivating, setDeactivating] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);

  // Load User Data & Stats
  useEffect(() => {
    if (!user) return;

    const data = {
      name: user.name || user.username || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      state: user.state || '',
      postalCode: user.postalCode || '',
      country: user.country || 'United States'
    };

    setFormData(data);
    setInitialFormData(data);

    if (user.notificationPreferences) {
      setNotificationPreferences(prev => ({ ...prev, ...user.notificationPreferences }));
    }
    if (user.accountSettings) {
      setAccountSettings(prev => ({ ...prev, ...user.accountSettings }));
    }
    if (user.privacySettings) {
      setPrivacySettings(prev => ({ ...prev, ...user.privacySettings }));
    }

    fetchStatistics();
  }, [user]);

  const fetchStatistics = async () => {
    setLoadingStats(true);
    try {
      const res = await api.get('/users/me/statistics');
      if (res.data && res.data.statistics) {
        setStats(res.data.statistics);
      }
    } catch (err) {
      console.error('Failed to fetch profile stats', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const showToastNotification = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isFormModified = () => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      showToastNotification('error', 'Full Name is required.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/users/me/update', formData);
      if (res.data && res.data.user) {
        updateUser(res.data.user);
        setInitialFormData(formData);
        setIsEditing(false);
        showToastNotification('success', 'Profile updated successfully.');
      }
    } catch (err) {
      console.error(err);
      showToastNotification('error', err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isFormModified()) {
      setShowCancelModal(true);
    } else {
      setIsEditing(false);
    }
  };

  const confirmDiscard = () => {
    setFormData(initialFormData);
    setIsEditing(false);
    setShowCancelModal(false);
  };

  // Photo Upload Handler
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToastNotification('error', 'File size exceeds 5MB limit.');
      return;
    }

    const uploadData = new FormData();
    uploadData.append('photo', file);

    setPhotoUploading(true);
    try {
      const res = await api.post('/users/me/profile-photo', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data && res.data.user) {
        updateUser(res.data.user);
        showToastNotification('success', 'Profile picture updated.');
      }
    } catch (err) {
      console.error(err);
      showToastNotification('error', err.response?.data?.message || 'Failed to upload photo.');
    } finally {
      setPhotoUploading(false);
    }
  };

  // Photo Removal Handler
  const handleRemovePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) return;
    setPhotoUploading(true);
    try {
      const res = await api.delete('/users/me/profile-photo');
      if (res.data && res.data.user) {
        updateUser(res.data.user);
        showToastNotification('success', 'Profile picture removed.');
      }
    } catch (err) {
      console.error(err);
      showToastNotification('error', 'Failed to remove photo.');
    } finally {
      setPhotoUploading(false);
    }
  };

  // Change Password Handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!passwordForm.currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }
    if (!passwordForm.newPassword) {
      setPasswordError('New password is required.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      await api.post('/users/me/change-password', passwordForm);
      showToastNotification('success', 'Password changed successfully.');
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      console.error(err);
      setPasswordError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  // Deactivate Account Handler
  const handleDeactivateAccount = async (e) => {
    e.preventDefault();
    setDeactivateError('');
    setDeactivating(true);
    try {
      await api.patch('/users/me/deactivate', { password: deactivatePassword });
      showToastNotification('success', 'Account deactivated.');
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 1500);
    } catch (err) {
      console.error(err);
      setDeactivateError(err.response?.data?.message || 'Failed to deactivate account.');
      setDeactivating(false);
    }
  };

  // Notification Preferences Handler
  const handleSaveNotificationPreferences = async () => {
    setSaving(true);
    try {
      await api.patch('/users/me/notification-preferences', notificationPreferences);
      showToastNotification('success', 'Notification preferences saved.');
      refetchUser();
    } catch (err) {
      showToastNotification('error', 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  // Account Settings Handler
  const handleSaveAccountSettings = async () => {
    setSaving(true);
    try {
      await api.patch('/users/me/account-settings', accountSettings);
      showToastNotification('success', 'Account settings saved.');
      refetchUser();
    } catch (err) {
      showToastNotification('error', 'Failed to save account settings.');
    } finally {
      setSaving(false);
    }
  };

  // Privacy Settings Handler
  const handleSavePrivacySettings = async () => {
    setSaving(true);
    try {
      await api.patch('/users/me/privacy-settings', privacySettings);
      showToastNotification('success', 'Privacy settings saved.');
      refetchUser();
    } catch (err) {
      showToastNotification('error', 'Failed to save privacy settings.');
    } finally {
      setSaving(false);
    }
  };

  // Date Format Helpers
  const formatDate = (dateString) => {
    if (!dateString) return 'Oct 2, 2024';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Oct 8, 2024 at 10:30 AM';
    const d = new Date(dateString);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} at ${timeStr}`;
  };

  const getUserIdCode = () => {
    if (!user || !user._id) return '#CC-2024-000123';
    return `#CC-2024-${user._id.toString().slice(-6).toUpperCase()}`;
  };

  if (!user) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', margin: '40px auto', maxWidth: '500px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>Please log in to view your profile</h2>
        <button onClick={() => navigate('/login')} className="cit-btn cit-btn-primary">Go to Login</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '12px',
          fontWeight: '600',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{toast.text}</span>
        </div>
      )}

      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>My Profile</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>Manage your personal information, account settings, and preferences.</p>
        </div>

        <button 
          onClick={() => {
            setIsEditing(true);
            setActiveTab('personal');
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
            transition: 'all 0.2s'
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit Profile
        </button>
      </div>

      {/* ================= PROFILE SUMMARY CARD ================= */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '24px 32px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '32px',
        flexWrap: 'wrap'
      }}>
        
        {/* AVATAR WITH CAMERA OVERLAY */}
        <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            overflow: 'hidden',
            background: '#eff6ff',
            border: '4px solid #ffffff',
            boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '36px', fontWeight: '800', color: '#2563eb' }}>
                {user.name ? user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : 'JD'}
              </span>
            )}
          </div>

          <button 
            onClick={() => fileInputRef.current?.click()}
            title="Upload Profile Photo"
            style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: '#1e293b',
              color: '#ffffff',
              border: '2px solid #ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handlePhotoUpload} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
        </div>

        {/* PROFILE INFO DETAILS */}
        <div style={{ flex: 1, minWidth: '260px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              {user.name || user.username || 'John Doe'}
            </h2>
            <span style={{
              background: '#dcfce7',
              color: '#166534',
              fontSize: '12px',
              fontWeight: '700',
              padding: '3px 10px',
              borderRadius: '99px'
            }}>
              Citizen
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px 16px', fontSize: '13px', color: '#475569' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="15" height="15" fill="none" stroke="#64748b" viewBox="0 0 24 24" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>{user.email}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="15" height="15" fill="none" stroke="#64748b" viewBox="0 0 24 24" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>{user.phone || 'Not provided'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="15" height="15" fill="none" stroke="#64748b" viewBox="0 0 24 24" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{user.address ? `${user.address}${user.city ? ', ' + user.city : ''}` : 'Not provided'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="15" height="15" fill="none" stroke="#64748b" viewBox="0 0 24 24" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Member since {formatDate(user.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* 4 STATISTIC CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', minWidth: '320px', flex: '1 1 320px' }}>
          
          {/* STAT 1: Issues Reported */}
          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', border: '1px solid #f1f5f9' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{stats.reported}</div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#334155' }}>Issues Reported</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>All time</div>
          </div>

          {/* STAT 2: Resolved */}
          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', border: '1px solid #f1f5f9' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{stats.resolved}</div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#334155' }}>Resolved</div>
            <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: '600' }}>{stats.resolvedPercent}</div>
          </div>

          {/* STAT 3: In Progress */}
          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', border: '1px solid #f1f5f9' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{stats.inProgress}</div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#334155' }}>In Progress</div>
            <div style={{ fontSize: '10px', color: '#ea580c', fontWeight: '600' }}>{stats.inProgressPercent}</div>
          </div>

          {/* STAT 4: Under Review */}
          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', border: '1px solid #f1f5f9' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{stats.underReview}</div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#334155' }}>Under Review</div>
            <div style={{ fontSize: '10px', color: '#9333ea', fontWeight: '600' }}>{stats.underReviewPercent}</div>
          </div>

        </div>

      </div>

      {/* ================= PROFILE TABS NAVIGATION ================= */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '12px',
        marginBottom: '24px',
        overflowX: 'auto'
      }}>
        
        {/* TAB 1 */}
        <button
          onClick={() => setActiveTab('personal')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '700',
            border: activeTab === 'personal' ? 'none' : '1px solid #e2e8f0',
            background: activeTab === 'personal' ? '#2563eb' : '#ffffff',
            color: activeTab === 'personal' ? '#ffffff' : '#64748b',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Personal Information
        </button>

        {/* TAB 2 */}
        <button
          onClick={() => setActiveTab('account')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '700',
            border: activeTab === 'account' ? 'none' : '1px solid #e2e8f0',
            background: activeTab === 'account' ? '#2563eb' : '#ffffff',
            color: activeTab === 'account' ? '#ffffff' : '#64748b',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Account Settings
        </button>

        {/* TAB 3 */}
        <button
          onClick={() => setActiveTab('notification')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '700',
            border: activeTab === 'notification' ? 'none' : '1px solid #e2e8f0',
            background: activeTab === 'notification' ? '#2563eb' : '#ffffff',
            color: activeTab === 'notification' ? '#ffffff' : '#64748b',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          Notification Preferences
        </button>

        {/* TAB 4 */}
        <button
          onClick={() => setActiveTab('privacy')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '700',
            border: activeTab === 'privacy' ? 'none' : '1px solid #e2e8f0',
            background: activeTab === 'privacy' ? '#2563eb' : '#ffffff',
            color: activeTab === 'privacy' ? '#ffffff' : '#64748b',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Privacy & Security
        </button>

      </div>

      {/* ================= TAB CONTENT 1: PERSONAL INFORMATION ================= */}
      {activeTab === 'personal' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '24px', alignItems: 'start' }}>
          
          {/* LEFT FORM CARD */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '28px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>Personal Information</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px 0' }}>Update your personal details and contact information.</p>

            <form onSubmit={handleSaveProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px 20px' }}>
                
                {/* FULL NAME */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <svg width="16" height="16" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <input 
                      type="text" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleInputChange} 
                      placeholder="John Doe"
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* EMAIL ADDRESS */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Email Address <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <svg width="16" height="16" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <input 
                      type="email" 
                      value={formData.email} 
                      disabled 
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        fontSize: '14px',
                        color: '#64748b',
                        cursor: 'not-allowed',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* PHONE NUMBER */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Phone Number
                  </label>
                  <div style={{ position: 'relative' }}>
                    <svg width="16" height="16" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <input 
                      type="text" 
                      name="phone" 
                      value={formData.phone} 
                      onChange={handleInputChange} 
                      placeholder="+1 (555) 123-4567"
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* ADDRESS */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <svg width="16" height="16" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <input 
                      type="text" 
                      name="address" 
                      value={formData.address} 
                      onChange={handleInputChange} 
                      placeholder="Maple Avenue, Block 5, Riverdale"
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* CITY */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    City
                  </label>
                  <div style={{ position: 'relative' }}>
                    <svg width="16" height="16" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                      <path d="M9 22v-4h6v4" />
                      <line x1="8" y1="6" x2="8.01" y2="6" />
                      <line x1="16" y1="6" x2="16.01" y2="6" />
                      <line x1="12" y1="6" x2="12.01" y2="6" />
                      <line x1="8" y1="10" x2="8.01" y2="10" />
                      <line x1="16" y1="10" x2="16.01" y2="10" />
                      <line x1="12" y1="10" x2="12.01" y2="10" />
                    </svg>
                    <input 
                      type="text" 
                      name="city" 
                      value={formData.city} 
                      onChange={handleInputChange} 
                      placeholder="Riverside"
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* STATE */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    State/Province
                  </label>
                  <div style={{ position: 'relative' }}>
                    <svg width="16" height="16" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                    </svg>
                    <input 
                      type="text" 
                      name="state" 
                      value={formData.state} 
                      onChange={handleInputChange} 
                      placeholder="California"
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* POSTAL CODE */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Postal Code
                  </label>
                  <div style={{ position: 'relative' }}>
                    <svg width="16" height="16" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input 
                      type="text" 
                      name="postalCode" 
                      value={formData.postalCode} 
                      onChange={handleInputChange} 
                      placeholder="90210"
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* COUNTRY */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Country
                  </label>
                  <div style={{ position: 'relative' }}>
                    <svg width="16" height="16" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: '#ffffff'
                      }}
                    >
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Australia">Australia</option>
                      <option value="India">India</option>
                      <option value="Germany">Germany</option>
                      <option value="France">France</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* ACTION BUTTONS */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#334155',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                    opacity: saving ? 0.7 : 1
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

            </form>
          </div>

          {/* RIGHT SIDEBAR CARDS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* CARD 1: PROFILE PICTURE */}
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>Profile Picture</h4>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0', lineHeight: '1.4' }}>
                Update your profile picture. This will be visible to other users in the community.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', background: '#eff6ff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '20px', fontWeight: '800', color: '#2563eb' }}>
                      {user.name ? user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : 'JD'}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photoUploading}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #2563eb',
                      background: '#ffffff',
                      color: '#2563eb',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Upload Photo
                  </button>

                  <button 
                    onClick={handleRemovePhoto}
                    disabled={photoUploading || !user.avatar}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #fca5a5',
                      background: '#fef2f2',
                      color: '#ef4444',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: (!user.avatar || photoUploading) ? 'not-allowed' : 'pointer',
                      opacity: (!user.avatar || photoUploading) ? 0.5 : 1
                    }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Remove
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Supported formats: JPG, PNG (Max 5MB)</div>
            </div>

            {/* CARD 2: ACCOUNT INFORMATION */}
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 16px 0' }}>Account Information</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    User ID
                  </span>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>{getUserIdCode()}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /></svg>
                    Role
                  </span>
                  <span style={{ background: '#dcfce7', color: '#166534', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '99px' }}>Citizen</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /></svg>
                    Account Status
                  </span>
                  <span style={{ color: '#16a34a', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }}></span>
                    Active
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    Member Since
                  </span>
                  <span style={{ fontWeight: '600', color: '#334155' }}>{formatDate(user.createdAt)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    Last Login
                  </span>
                  <span style={{ fontWeight: '600', color: '#334155', fontSize: '12px' }}>{formatDateTime(user.lastLogin)}</span>
                </div>

              </div>
            </div>

            {/* CARD 3: QUICK ACTIONS */}
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 16px 0' }}>Quick Actions</h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* CHANGE PASSWORD */}
                <button
                  onClick={() => setShowPasswordModal(true)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#2563eb' }}>Change Password</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Update your account password</div>
                  </div>
                </button>

                {/* DEACTIVATE ACCOUNT */}
                <button
                  onClick={() => setShowDeactivateModal(true)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #fecaca',
                    background: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#ef4444' }}>Deactivate Account</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Temporarily disable your account</div>
                  </div>
                </button>

              </div>
            </div>

          </div>

        </div>
      )}

      {/* ================= TAB CONTENT 2: ACCOUNT SETTINGS ================= */}
      {activeTab === 'account' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '28px', maxWidth: '720px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>Account Settings</h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px 0' }}>Customize your display preferences, language, and regional defaults.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* LANGUAGE */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Preferred Language</label>
              <select
                value={accountSettings.language}
                onChange={(e) => setAccountSettings(prev => ({ ...prev, language: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', color: '#0f172a', background: '#fff' }}
              >
                <option value="English (US)">English (US)</option>
                <option value="Spanish">Spanish (Español)</option>
                <option value="French">French (Français)</option>
                <option value="Hindi">Hindi (हिंदी)</option>
              </select>
            </div>

            {/* TIMEZONE */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Timezone</label>
              <select
                value={accountSettings.timezone}
                onChange={(e) => setAccountSettings(prev => ({ ...prev, timezone: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', color: '#0f172a', background: '#fff' }}
              >
                <option value="UTC-05:00 (Eastern Time)">UTC-05:00 (Eastern Time)</option>
                <option value="UTC-08:00 (Pacific Time)">UTC-08:00 (Pacific Time)</option>
                <option value="UTC+00:00 (Greenwich Mean Time)">UTC+00:00 (Greenwich Mean Time)</option>
                <option value="UTC+05:30 (India Standard Time)">UTC+05:30 (India Standard Time)</option>
              </select>
            </div>

            {/* MAP VIEW */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Default Map Style</label>
              <select
                value={accountSettings.defaultMapView}
                onChange={(e) => setAccountSettings(prev => ({ ...prev, defaultMapView: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', color: '#0f172a', background: '#fff' }}
              >
                <option value="standard">Standard OpenStreetMap</option>
                <option value="satellite">Satellite View</option>
                <option value="terrain">Terrain View</option>
              </select>
            </div>

            {/* ACCESSIBILITY */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>High Contrast Mode</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Increase visual contrast for enhanced accessibility.</div>
              </div>
              <input 
                type="checkbox"
                checked={accountSettings.accessibilityMode}
                onChange={(e) => setAccountSettings(prev => ({ ...prev, accessibilityMode: e.target.checked }))}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ marginTop: '16px' }}>
              <button
                onClick={handleSaveAccountSettings}
                disabled={saving}
                style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: '700', cursor: 'pointer' }}
              >
                {saving ? 'Saving...' : 'Save Account Settings'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= TAB CONTENT 3: NOTIFICATION PREFERENCES ================= */}
      {activeTab === 'notification' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '28px', maxWidth: '720px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>Notification Preferences</h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px 0' }}>Choose what alerts and updates you receive from CivicConnect.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {[
              { key: 'issueStatusUpdates', title: 'Issue Status Updates', desc: 'Get notified when municipal staff change the status of your reported issues.' },
              { key: 'issueComments', title: 'Issue Comments', desc: 'Receive notifications when comments or worker notes are added to your issue.' },
              { key: 'announcements', title: 'Community Announcements', desc: 'Stay updated on public clean-up drives, road maintenance, and city news.' },
              { key: 'systemNotifications', title: 'System Alerts & Maintenance', desc: 'Alerts regarding scheduled platform maintenance and critical system updates.' },
              { key: 'emailNotifications', title: 'Email Notifications', desc: 'Receive instant email digests for important civic updates.' },
              { key: 'pushNotifications', title: 'Mobile Push Notifications', desc: 'Receive real-time push alerts directly to your mobile device.' }
            ].map(item => (
              <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{item.title}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{item.desc}</div>
                </div>
                <input 
                  type="checkbox"
                  checked={!!notificationPreferences[item.key]}
                  onChange={(e) => setNotificationPreferences(prev => ({ ...prev, [item.key]: e.target.checked }))}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>
            ))}

            <div style={{ marginTop: '16px' }}>
              <button
                onClick={handleSaveNotificationPreferences}
                disabled={saving}
                style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: '700', cursor: 'pointer' }}
              >
                {saving ? 'Saving...' : 'Save Notification Preferences'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= TAB CONTENT 4: PRIVACY & SECURITY ================= */}
      {activeTab === 'privacy' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '28px', maxWidth: '720px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>Privacy & Security</h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px 0' }}>Control how your information is shared and manage account security.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Public Citizen Profile</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Allow other citizens to view your public profile and contribution stats.</div>
              </div>
              <input 
                type="checkbox"
                checked={privacySettings.publicProfile}
                onChange={(e) => setPrivacySettings(prev => ({ ...prev, publicProfile: e.target.checked }))}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Show Activity on Public Maps</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Display your reported issues on the community interactive map.</div>
              </div>
              <input 
                type="checkbox"
                checked={privacySettings.showActivity}
                onChange={(e) => setPrivacySettings(prev => ({ ...prev, showActivity: e.target.checked }))}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Two-Factor Authentication (2FA)</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Add an extra layer of security to your CivicConnect account.</div>
              </div>
              <input 
                type="checkbox"
                checked={privacySettings.twoFactorEnabled}
                onChange={(e) => setPrivacySettings(prev => ({ ...prev, twoFactorEnabled: e.target.checked }))}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ marginTop: '16px' }}>
              <button
                onClick={handleSavePrivacySettings}
                disabled={saving}
                style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: '700', cursor: 'pointer' }}
              >
                {saving ? 'Saving...' : 'Save Privacy Settings'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= MODAL 1: CHANGE PASSWORD ================= */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '28px', maxWidth: '440px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>Change Password</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>Enter your current password and set a new password.</p>

            {passwordError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Current Password</label>
                  <input 
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>New Password</label>
                  <input 
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Confirm New Password</label>
                  <input 
                    type="password"
                    value={passwordForm.confirmNewPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmNewPassword: e.target.value }))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordSaving}
                  style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {passwordSaving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: DEACTIVATE ACCOUNT ================= */}
      {showDeactivateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '28px', maxWidth: '440px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#ef4444', margin: '0 0 6px 0' }}>Deactivate Account</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0', lineHeight: '1.4' }}>
              Are you sure you want to deactivate your account? Your submitted issues will remain in the city database, but you will not be able to log in until reactivated.
            </p>

            {deactivateError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>
                {deactivateError}
              </div>
            )}

            <form onSubmit={handleDeactivateAccount}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Confirm Your Password</label>
                <input 
                  type="password"
                  value={deactivatePassword}
                  onChange={(e) => setDeactivatePassword(e.target.value)}
                  placeholder="Enter your password to confirm"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowDeactivateModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deactivating}
                  style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {deactivating ? 'Deactivating...' : 'Confirm Deactivation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: CANCEL DISCARD CONFIRMATION ================= */}
      {showCancelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>Discard unsaved changes?</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>You have unsaved edits in your profile details. Are you sure you want to discard them?</p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowCancelModal(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                Keep Editing
              </button>
              <button
                onClick={confirmDiscard}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Profile;
