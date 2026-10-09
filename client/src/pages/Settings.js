import React, { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Settings() {
  const { user, updateUser, refetchUser } = useContext(AuthContext);
  const { themeName, switchTheme } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Notification Preferences State
  const [notificationPreferences, setNotificationPreferences] = useState({
    issueStatusUpdates: true,
    issueComments: true,
    communityAnnouncements: true
  });

  // Account Edit Form State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States'
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Photo Upload State
  const [photoUploading, setPhotoUploading] = useState(false);

  // Security / Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Toast Notification State
  const [toast, setToast] = useState(null);

  // Initialize data from authenticated user
  useEffect(() => {
    if (!user) return;

    setEditForm({
      name: user.name || user.username || '',
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      state: user.state || '',
      postalCode: user.postalCode || '',
      country: user.country || 'United States'
    });

    if (user.notificationPreferences) {
      setNotificationPreferences({
        issueStatusUpdates: user.notificationPreferences.issueStatusUpdates ?? true,
        issueComments: user.notificationPreferences.issueComments ?? true,
        communityAnnouncements: user.notificationPreferences.communityAnnouncements ?? user.notificationPreferences.announcements ?? true
      });
    }
  }, [user]);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Toggle Notification Preference
  const handleToggleNotification = async (key) => {
    const updated = {
      ...notificationPreferences,
      [key]: !notificationPreferences[key]
    };
    setNotificationPreferences(updated);

    try {
      await api.patch('/users/me/notification-preferences', updated);
      showToast('success', 'Notification preferences updated.');
      refetchUser();
    } catch (err) {
      console.error('Failed to update notification preferences', err);
      // Rollback
      setNotificationPreferences(notificationPreferences);
      showToast('error', 'Could not save notification preference.');
    }
  };

  // Handle Theme Change
  const handleThemeChange = async (e) => {
    const selectedTheme = e.target.value;
    switchTheme(selectedTheme);

    try {
      await api.patch('/users/me/account-settings', { theme: selectedTheme });
      showToast('success', 'Appearance settings saved.');
      refetchUser();
    } catch (err) {
      console.error('Failed to save theme setting', err);
    }
  };

  // Save Edit Profile Form
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setEditError('');

    if (!editForm.name.trim()) {
      setEditError('Full Name is required.');
      return;
    }

    setEditSaving(true);
    try {
      const res = await api.post('/users/me/update', editForm);
      if (res.data && res.data.user) {
        updateUser(res.data.user);
        showToast('success', 'Profile updated successfully.');
        setShowEditModal(false);
      }
    } catch (err) {
      console.error(err);
      setEditError(err.response?.data?.message || 'Unable to update your profile. Please try again.');
    } finally {
      setEditSaving(false);
    }
  };

  // Photo Upload Handler
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'File size exceeds 5MB limit.');
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
        showToast('success', 'Profile picture updated successfully.');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to upload photo.');
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
      showToast('success', 'Password changed successfully.');
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      console.error(err);
      setPasswordError(err.response?.data?.message || 'Failed to change password. Check your current password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', margin: '40px auto', maxWidth: '500px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>Please log in to view Settings</h2>
        <button onClick={() => navigate('/login')} className="cit-btn cit-btn-primary">Go to Login</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
      
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
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>Settings</h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>Manage your account settings and preferences.</p>
      </div>

      {/* ================= CARD 1: ACCOUNT INFORMATION ================= */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '24px 28px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        marginBottom: '24px'
      }}>
        
        {/* CARD HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Account Information</h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>Update your basic information.</p>
            </div>
          </div>

          <button 
            onClick={() => setShowEditModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#2563eb',
              borderRadius: '10px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
        </div>

        {/* CARD BODY */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          
          {/* AVATAR WITH CAMERA OVERLAY */}
          <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: '#eff6ff',
              border: '3px solid #ffffff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '32px', fontWeight: '800', color: '#2563eb' }}>
                  {user.name ? user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : 'JD'}
                </span>
              )}
            </div>

            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={photoUploading}
              title="Change Photo"
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: '#2563eb',
                color: '#ffffff',
                border: '2px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" style={{ display: 'none' }} />
          </div>

          {/* USER DETAILS */}
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                {user.name || user.username || 'John Doe'}
              </h3>
              <span style={{
                background: '#dcfce7',
                color: '#166534',
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '99px'
              }}>
                Citizen
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#64748b' }}>
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
                <span>{user.phone || 'No phone number added'}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="15" height="15" fill="none" stroke="#64748b" viewBox="0 0 24 24" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{user.address ? `${user.address}${user.city ? ', ' + user.city : ''}` : 'No address added'}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ================= CARD 2: NOTIFICATION PREFERENCES ================= */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '24px 28px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        marginBottom: '24px'
      }}>
        
        {/* CARD HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Notification Preferences</h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>Choose what notifications you want to receive.</p>
          </div>
        </div>

        {/* ROWS */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          
          {/* ROW 1: Issue Status Updates */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Issue Status Updates</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Get notified when your reported issues are updated</div>
              </div>
            </div>

            <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={!!notificationPreferences.issueStatusUpdates} 
                onChange={() => handleToggleNotification('issueStatusUpdates')}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', inset: 0,
                backgroundColor: notificationPreferences.issueStatusUpdates ? '#2563eb' : '#cbd5e1',
                borderRadius: '24px', transition: '0.3s'
              }}>
                <span style={{
                  position: 'absolute', height: '18px', width: '18px',
                  left: notificationPreferences.issueStatusUpdates ? '22px' : '3px',
                  bottom: '3px', backgroundColor: '#ffffff',
                  borderRadius: '50%', transition: '0.3s'
                }}></span>
              </span>
            </label>
          </div>

          {/* ROW 2: Comments on Your Issues */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Comments on Your Issues</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Get notified when someone comments on your issues</div>
              </div>
            </div>

            <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={!!notificationPreferences.issueComments} 
                onChange={() => handleToggleNotification('issueComments')}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', inset: 0,
                backgroundColor: notificationPreferences.issueComments ? '#2563eb' : '#cbd5e1',
                borderRadius: '24px', transition: '0.3s'
              }}>
                <span style={{
                  position: 'absolute', height: '18px', width: '18px',
                  left: notificationPreferences.issueComments ? '22px' : '3px',
                  bottom: '3px', backgroundColor: '#ffffff',
                  borderRadius: '50%', transition: '0.3s'
                }}></span>
              </span>
            </label>
          </div>

          {/* ROW 3: Community Announcements */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0 4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path d="M22 12A10 10 0 0 0 12 2v20a10 10 0 0 0 10-10z" />
                  <path d="M12 2a10 10 0 0 0-10 10h10" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Community Announcements</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Receive important community announcements</div>
              </div>
            </div>

            <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={!!notificationPreferences.communityAnnouncements} 
                onChange={() => handleToggleNotification('communityAnnouncements')}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', inset: 0,
                backgroundColor: notificationPreferences.communityAnnouncements ? '#2563eb' : '#cbd5e1',
                borderRadius: '24px', transition: '0.3s'
              }}>
                <span style={{
                  position: 'absolute', height: '18px', width: '18px',
                  left: notificationPreferences.communityAnnouncements ? '22px' : '3px',
                  bottom: '3px', backgroundColor: '#ffffff',
                  borderRadius: '50%', transition: '0.3s'
                }}></span>
              </span>
            </label>
          </div>

        </div>

      </div>

      {/* ================= CARD 3: APPEARANCE ================= */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '24px 28px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        marginBottom: '24px'
      }}>
        
        {/* CARD HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a7 7 0 1 0 7 7" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Appearance</h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>Customize the look and feel of the application.</p>
          </div>
        </div>

        {/* THEME ROW */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Theme</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Choose your preferred theme</div>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <select
              value={themeName || 'light'}
              onChange={handleThemeChange}
              style={{
                appearance: 'none',
                padding: '9px 36px 9px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="light">☀️ Light Mode</option>
              <option value="dark">🌙 Dark Mode</option>
              <option value="default">💻 System Default</option>
            </select>
            <svg width="14" height="14" fill="none" stroke="#64748b" viewBox="0 0 24 24" strokeWidth="2" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>

      </div>

      {/* ================= CARD 4: SECURITY ================= */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '24px 28px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
      }}>
        
        {/* CARD HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Security</h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>Manage your account security.</p>
          </div>
        </div>

        {/* ROW: Change Password */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Change Password</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Update your password to keep your account secure</div>
            </div>
          </div>

          <button
            onClick={() => setShowPasswordModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#2563eb',
              borderRadius: '10px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Change Password
          </button>
        </div>

      </div>

      {/* ================= MODAL: EDIT ACCOUNT INFORMATION ================= */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '28px', maxWidth: '540px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>Edit Basic Information</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>Update your contact details below.</p>

            {editError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Full Name *</label>
                  <input 
                    type="text" 
                    value={editForm.name} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} 
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Phone Number</label>
                  <input 
                    type="text" 
                    value={editForm.phone} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))} 
                    placeholder="+1 (555) 123-4567"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Address</label>
                  <input 
                    type="text" 
                    value={editForm.address} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))} 
                    placeholder="Maple Avenue, Riverdale"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>City</label>
                  <input 
                    type="text" 
                    value={editForm.city} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))} 
                    placeholder="Riverside"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>State / Province</label>
                  <input 
                    type="text" 
                    value={editForm.state} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, state: e.target.value }))} 
                    placeholder="California"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHANGE PASSWORD ================= */}
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
                  {passwordSaving ? 'Updating...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Settings;
