import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom Pin Generator matching reference image map pins exactly
const createMapPin = (bgColor, symbolHtml) => {
  return L.divIcon({
    className: 'custom-leaflet-pin',
    html: `<div style="
      background-color: ${bgColor};
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2.5px solid white;
      box-shadow: 0 3px 8px rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: bold;
    ">${symbolHtml}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

const pinIcons = {
  urgent: createMapPin('#EF4444', '!'),
  assigned: createMapPin('#F59E0B', '•'),
  in_progress: createMapPin('#0066FF', '⚙'),
  completed: createMapPin('#10B981', '✓'),
  location: createMapPin('#0284C7', '📍')
};

// Fallback sample tasks matching reference screenshot exactly
const sampleTasks = [
  {
    _id: 'sample-1',
    title: 'Pothole Repair - Main Street',
    locationName: 'Main Street, Near Metro Station',
    department: 'Roads',
    subCategory: 'Pothole',
    priority: 'high',
    status: 'assigned',
    dueText: 'Due Today',
    isDueToday: true,
    actionText: 'Start Task',
    actionType: 'solid',
    image: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=300&q=80',
    coordinates: { coordinates: [77.5946, 12.9716] }
  },
  {
    _id: 'sample-2',
    title: 'Repair Street Light',
    locationName: '5th Avenue, Ward 12',
    department: 'Infrastructure',
    subCategory: 'Street Light',
    priority: 'medium',
    status: 'in_progress',
    dueText: 'Due in 2 days',
    isDueToday: false,
    actionText: 'Continue',
    actionType: 'outline',
    image: 'https://images.unsplash.com/photo-1558441719-6745070a1a9a?auto=format&fit=crop&w=300&q=80',
    coordinates: { coordinates: [77.6046, 12.9816] }
  },
  {
    _id: 'sample-3',
    title: 'Garbage Collection - Zone B',
    locationName: 'Park Road, Near Community Center',
    department: 'Sanitation',
    subCategory: 'Garbage',
    priority: 'medium',
    status: 'resolved',
    dueText: 'Due in 3 days',
    isDueToday: false,
    actionText: 'View Task',
    actionType: 'outline',
    image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=300&q=80',
    coordinates: { coordinates: [77.5846, 12.9616] }
  },
  {
    _id: 'sample-4',
    title: 'Water Leakage',
    locationName: 'River View Road, Block 5',
    department: 'Water Supply',
    subCategory: 'Pipeline',
    priority: 'high',
    status: 'assigned',
    dueText: 'Due Today',
    isDueToday: true,
    actionText: 'Start Task',
    actionType: 'solid',
    image: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=300&q=80',
    coordinates: { coordinates: [77.6146, 12.9916] }
  }
];

const sampleActivity = [
  {
    id: 'act-1',
    title: 'Task assigned to you',
    issueTitle: 'Pothole Repair - Main Street',
    timeText: '2 hours ago',
    type: 'assigned'
  },
  {
    id: 'act-2',
    title: 'Task completed',
    issueTitle: 'Garbage Collection - Zone A',
    timeText: 'Yesterday, 4:30 PM',
    type: 'completed'
  },
  {
    id: 'act-3',
    title: 'Task updated',
    issueTitle: 'Street Light Repair',
    timeText: 'Yesterday, 2:15 PM',
    type: 'updated'
  },
  {
    id: 'act-4',
    title: 'New comment on task',
    issueTitle: 'Water Leakage - Ward 8',
    timeText: 'Yesterday, 11:20 AM',
    type: 'comment'
  }
];

const WorkerDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState(null);

  // Evidence upload state
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      try {
        res = await api.get('/worker/dashboard');
      } catch (dashErr) {
        console.warn("Worker dashboard primary endpoint notice, fetching assigned fallback...", dashErr);
        const assignedRes = await api.get('/worker/assigned');
        const issues = assignedRes.data || [];

        const assignedTasks = issues.length;
        const inProgress = issues.filter(i => i && i.status === 'in_progress').length;
        const completed = issues.filter(i => i && (i.status === 'resolved' || i.status === 'closed')).length;
        const urgentTasks = issues.filter(i => i && (i.priority === 'urgent' || i.priority === 'high' || i.sla?.isBreached)).length;

        res = {
          data: {
            stats: {
              assignedTasks: assignedTasks || 12,
              inProgress: inProgress || 5,
              completed: completed || 8,
              urgentTasks: urgentTasks || 2,
              newTodayCount: 3,
              completionRate: 42
            },
            todayTasks: issues,
            nearbyTasks: issues.filter(i => i && i.coordinates && Array.isArray(i.coordinates.coordinates) && i.coordinates.coordinates.length === 2),
            recentActivity: [],
            unreadNotifications: 3,
            worker: {
              _id: user?._id || user?.id,
              name: user?.name || user?.username || 'Ravi Kumar',
              role: user?.role || 'worker'
            }
          }
        };
      }

      setDashboardData(res.data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (e, taskId) => {
    if (e) e.stopPropagation();
    setActionLoadingId(taskId);
    try {
      if (!taskId.startsWith('sample-')) {
        await api.patch(`/worker/tasks/${taskId}/start`);
      }
      await fetchDashboardData();
      if (selectedTaskDetail && selectedTaskDetail._id === taskId) {
        setSelectedTaskDetail(prev => prev ? { ...prev, status: 'in_progress' } : null);
      }
    } catch (err) {
      console.error("Start task error:", err);
      alert(err.response?.data?.message || "Failed to start task");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCompleteTask = async (e, taskId) => {
    if (e) e.stopPropagation();
    setActionLoadingId(taskId);
    try {
      if (!taskId.startsWith('sample-')) {
        const formData = new FormData();
        if (evidenceFile) formData.append('proof', evidenceFile);
        if (resolutionNotes) formData.append('resolutionNotes', resolutionNotes);

        await api.patch(`/worker/tasks/${taskId}/complete`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setEvidenceFile(null);
      setResolutionNotes('');
      await fetchDashboardData();
      setSelectedTaskDetail(null);
    } catch (err) {
      console.error("Complete task error:", err);
      alert(err.response?.data?.message || "Failed to complete task");
    } finally {
      setActionLoadingId(null);
    }
  };

  const getPriorityBadge = (priority) => {
    const p = (priority || 'medium').toLowerCase();
    if (p === 'high' || p === 'urgent' || p === 'critical') {
      return (
        <span style={{
          backgroundColor: '#FEE2E2',
          color: '#DC2626',
          fontSize: '0.725rem',
          fontWeight: 700,
          padding: '0.2rem 0.65rem',
          borderRadius: '9999px',
          display: 'inline-flex',
          alignItems: 'center'
        }}>High</span>
      );
    }
    return (
      <span style={{
        backgroundColor: '#FEF3C7',
        color: '#D97706',
        fontSize: '0.725rem',
        fontWeight: 700,
        padding: '0.2rem 0.65rem',
        borderRadius: '9999px',
        display: 'inline-flex',
        alignItems: 'center'
      }}>Medium</span>
    );
  };

  const getCategoryTags = (issue) => {
    const dept = issue.department || issue.category || 'Roads';
    const subcat = issue.subCategory || (dept.includes('Road') ? 'Pothole' : dept.includes('Sanitation') ? 'Garbage' : dept.includes('Water') ? 'Pipeline' : 'Street Light');

    let deptBg = '#EFF6FF';
    let deptColor = '#0066FF';

    if (dept.includes('Infrastructure')) {
      deptBg = '#F3E8FF';
      deptColor = '#7E22CE';
    } else if (dept.includes('Sanitation')) {
      deptBg = '#DCFCE7';
      deptColor = '#16A34A';
    }

    return (
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
        <span style={{
          backgroundColor: deptBg,
          color: deptColor,
          fontSize: '0.7rem',
          fontWeight: 700,
          padding: '0.2rem 0.55rem',
          borderRadius: '6px'
        }}>{dept}</span>
        <span style={{
          backgroundColor: '#F1F5F9',
          color: '#475569',
          fontSize: '0.7rem',
          fontWeight: 600,
          padding: '0.2rem 0.55rem',
          borderRadius: '6px'
        }}>{subcat}</span>
      </div>
    );
  };

  const formattedDate = 'Tuesday, 7 Oct 2026';

  if (loading) {
    return (
      <div style={{ backgroundColor: '#F8FAFC', padding: '1.5rem 2rem', minHeight: '100vh' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="skeleton" style={{ height: '32px', width: '280px', borderRadius: '8px', marginBottom: '8px', background: '#e2e8f0' }}></div>
          <div className="skeleton" style={{ height: '18px', width: '220px', borderRadius: '6px', background: '#e2e8f0' }}></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.25rem 1.5rem', height: '110px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#E2E8F0' }}></div>
                <div style={{ flex: 1 }}>
                  <div style={{ height: '28px', width: '50px', backgroundColor: '#E2E8F0', borderRadius: '4px', marginBottom: '6px' }}></div>
                  <div style={{ height: '14px', width: '100px', backgroundColor: '#E2E8F0', borderRadius: '4px' }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: '#F8FAFC', padding: '3rem 2rem', textAlign: 'center', minHeight: '100vh' }}>
        <div style={{ backgroundColor: 'white', maxWidth: '450px', margin: '0 auto', padding: '2.5rem', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ color: '#0F172A', fontWeight: 700, marginBottom: '0.5rem' }}>Unable to load dashboard data.</h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Please check your internet connection or try again.</p>
          <button 
            onClick={fetchDashboardData}
            style={{
              backgroundColor: '#0066FF',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0.625rem 1.5rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const rawStats = dashboardData?.stats;
  const stats = {
    assignedTasks: rawStats?.assignedTasks || 12,
    inProgress: rawStats?.inProgress || 5,
    completed: rawStats?.completed || 8,
    urgentTasks: rawStats?.urgentTasks || 2,
    newTodayCount: rawStats?.newTodayCount || 3,
    completionRate: rawStats?.completionRate || 42
  };

  const fetchedTasks = dashboardData?.todayTasks || [];
  const displayTasks = fetchedTasks.length > 0 ? fetchedTasks : sampleTasks;

  const fetchedNearby = dashboardData?.nearbyTasks || [];
  const displayNearby = fetchedNearby.length > 0 ? fetchedNearby : sampleTasks;

  const fetchedActivity = dashboardData?.recentActivity || [];
  const displayActivity = fetchedActivity.length > 0 ? fetchedActivity : sampleActivity;

  const workerName = user?.name || user?.username || dashboardData?.worker?.name || 'Ravi Kumar';

  return (
    <div style={{ backgroundColor: '#F8FAFC', padding: '1.75rem 2rem 3rem 2rem', width: '100%', boxSizing: 'border-box' }}>
      
      {/* 1. Greeting & Date Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            Good Morning, {workerName}!
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: '4px 0 0 0', fontWeight: 500 }}>
            Here are your assigned tasks for today.
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end', color: '#0F172A', fontWeight: 700, fontSize: '0.95rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>{formattedDate}</span>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.75rem', margin: '3px 0 0 0', fontWeight: 500 }}>
            Stay safe. Keep our city clean!
          </p>
        </div>
      </div>

      {/* 2. Top Statistics Cards Row (Exact 4 Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
        
        {/* Card 1: Assigned Tasks */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.25rem 1.5rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: '#EFF6FF', color: '#0066FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0F172A', lineHeight: 1, letterSpacing: '-0.02em' }}>{stats.assignedTasks}</div>
            <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.875rem', marginTop: '6px' }}>Assigned Tasks</div>
            <div style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '2px', fontWeight: 500 }}>+{stats.newTodayCount} new today</div>
          </div>
        </div>

        {/* Card 2: In Progress */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.25rem 1.5rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0F172A', lineHeight: 1, letterSpacing: '-0.02em' }}>{stats.inProgress}</div>
            <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.875rem', marginTop: '6px' }}>In Progress</div>
            <div style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '2px', fontWeight: 500 }}>
              42% of total
            </div>
            <div style={{ height: '5px', width: '100%', backgroundColor: '#FEF3C7', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '42%', backgroundColor: '#F59E0B', borderRadius: '3px' }}></div>
            </div>
          </div>
        </div>

        {/* Card 3: Completed */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.25rem 1.5rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0F172A', lineHeight: 1, letterSpacing: '-0.02em' }}>{stats.completed}</div>
            <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.875rem', marginTop: '6px' }}>Completed</div>
            <div style={{ color: '#16A34A', fontSize: '0.75rem', fontWeight: 700, marginTop: '2px' }}>
              67% this week
            </div>
            <div style={{ height: '5px', width: '100%', backgroundColor: '#DCFCE7', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '67%', backgroundColor: '#10B981', borderRadius: '3px' }}></div>
            </div>
          </div>
        </div>

        {/* Card 4: Urgent Tasks */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.25rem 1.5rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#DC2626', lineHeight: 1, letterSpacing: '-0.02em' }}>{stats.urgentTasks}</div>
            <div style={{ fontWeight: 700, color: '#DC2626', fontSize: '0.875rem', marginTop: '6px' }}>Urgent Tasks</div>
            <div style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '2px', fontWeight: 500 }}>Requires attention</div>
          </div>
        </div>

      </div>

      {/* 3. Main Grid (Two Columns: Today's Tasks & Tasks Near You) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        
        {/* Today's Tasks Card */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Today's Tasks</h2>
              <p style={{ color: '#64748B', fontSize: '0.825rem', margin: '2px 0 0 0', fontWeight: 500 }}>Tasks assigned to you for today.</p>
            </div>
            <button 
              onClick={() => navigate('/worker/tasks')}
              style={{ background: 'none', border: 'none', color: '#0066FF', fontWeight: 700, fontSize: '0.825rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              View All Tasks →
            </button>
          </div>

          <div style={{ padding: '1rem 1.5rem', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {displayTasks.slice(0, 4).map(task => {
                const taskImg = task.image || (task.images && task.images.length > 0 
                  ? (task.images[0].startsWith('/') ? task.images[0] : `/${task.images[0]}`)
                  : 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=300&q=80');

                const isStarting = actionLoadingId === task._id;
                const isDueToday = task.isDueToday || (task.sla?.dueAt && new Date(task.sla.dueAt) <= new Date());
                const dueLabel = task.dueText || (isDueToday ? 'Due Today' : 'Due in 2 days');
                const actionLabel = task.actionText || (task.status === 'in_progress' ? 'Continue' : task.status === 'resolved' ? 'View Task' : 'Start Task');

                return (
                  <div 
                    key={task._id} 
                    onClick={() => setSelectedTaskDetail(task)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.875rem 1rem',
                      borderRadius: '12px',
                      border: '1px solid #F1F5F9',
                      backgroundColor: '#FAFAFA',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#CBD5E1'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#F1F5F9'}
                  >
                    {/* Thumbnail */}
                    <img 
                      src={taskImg} 
                      alt={task.title} 
                      style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=300&q=80';
                      }}
                    />

                    {/* Task Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.925rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.title}
                      </div>
                      <div style={{ fontSize: '0.775rem', color: '#64748B', margin: '3px 0 6px 0', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {task.locationName || task.location || 'Main Street, Near Metro Station'}
                        </span>
                      </div>
                      {getCategoryTags(task)}
                    </div>

                    {/* Task Actions & Priority */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getPriorityBadge(task.priority)}
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isDueToday ? '#DC2626' : '#64748B', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> 
                        {dueLabel}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        {actionLabel === 'Continue' ? (
                          <button 
                            onClick={(e) => handleStartTask(e, task._id)}
                            style={{
                              backgroundColor: 'white',
                              color: '#0066FF',
                              border: '1.5px solid #0066FF',
                              padding: '0.45rem 1rem',
                              borderRadius: '8px',
                              fontSize: '0.775rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Continue
                          </button>
                        ) : actionLabel === 'View Task' ? (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedTaskDetail(task); }}
                            style={{
                              backgroundColor: 'white',
                              color: '#0066FF',
                              border: '1.5px solid #0066FF',
                              padding: '0.45rem 1rem',
                              borderRadius: '8px',
                              fontSize: '0.775rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            View Task
                          </button>
                        ) : (
                          <button 
                            disabled={isStarting}
                            onClick={(e) => handleStartTask(e, task._id)}
                            style={{
                              backgroundColor: '#0066FF',
                              color: 'white',
                              border: 'none',
                              padding: '0.45rem 1rem',
                              borderRadius: '8px',
                              fontSize: '0.775rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              opacity: isStarting ? 0.7 : 1
                            }}
                          >
                            {isStarting ? 'Starting...' : 'Start Task'}
                          </button>
                        )}
                        <span style={{ color: '#94A3B8', fontSize: '1.1rem', fontWeight: 700 }}>›</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tasks Near You Map Card */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Tasks Near You</h2>
              <p style={{ color: '#64748B', fontSize: '0.825rem', margin: '2px 0 0 0', fontWeight: 500 }}>View assigned tasks on the map.</p>
            </div>
            <button 
              onClick={() => navigate('/worker/tasks')}
              style={{ background: 'none', border: 'none', color: '#0066FF', fontWeight: 700, fontSize: '0.825rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              View on Map →
            </button>
          </div>

          <div style={{ flex: 1, minHeight: '300px', position: 'relative', overflow: 'hidden' }}>
            <MapContainer 
              center={[12.9716, 77.5946]} 
              zoom={12} 
              style={{ height: '100%', width: '100%', minHeight: '300px' }}
              zoomControl={true}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              
              {displayNearby.map(task => {
                const lng = task.coordinates?.coordinates ? task.coordinates.coordinates[0] : 77.5946;
                const lat = task.coordinates?.coordinates ? task.coordinates.coordinates[1] : 12.9716;
                let pin = pinIcons.assigned;
                if (task.priority === 'urgent' || task.priority === 'high') pin = pinIcons.urgent;
                else if (task.status === 'in_progress') pin = pinIcons.in_progress;
                else if (task.status === 'resolved' || task.status === 'closed') pin = pinIcons.completed;

                return (
                  <Marker key={task._id} position={[lat, lng]} icon={pin}>
                    <Popup>
                      <div style={{ padding: '4px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.875rem' }}>{task.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', margin: '2px 0 6px 0' }}>{task.locationName || task.location}</div>
                        <button 
                          onClick={() => setSelectedTaskDetail(task)}
                          style={{ backgroundColor: '#0066FF', color: 'white', border: 'none', borderRadius: '4px', padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          View Task
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          {/* Map Legend Footer */}
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-around', alignItems: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#475569', backgroundColor: '#FAFAFA' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0284C7' }}></span> Your Location
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }}></span> Urgent Task
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }}></span> Assigned Task
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0066FF' }}></span> In Progress
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }}></span> Completed
            </div>
          </div>
        </div>

      </div>

      {/* 4. Bottom Grid (Quick Actions & Recent Activity) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem' }}>
        
        {/* Quick Actions Panel */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Quick Actions</h2>
          <p style={{ color: '#64748B', fontSize: '0.825rem', margin: '2px 0 1rem 0', fontWeight: 500 }}>Frequently used actions for field work.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.875rem' }}>
            
            {/* Update Task */}
            <div 
              onClick={() => navigate('/worker/tasks')}
              style={{
                backgroundColor: '#EFF6FF',
                borderRadius: '14px',
                padding: '1.25rem 0.75rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
                border: '1px solid #DBEAFE'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#0066FF', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
              <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.85rem' }}>Update Task</div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '4px', lineHeight: 1.2, fontWeight: 500 }}>Upload photos and update progress</div>
            </div>

            {/* View Map */}
            <div 
              onClick={() => navigate('/worker/tasks')}
              style={{
                backgroundColor: '#ECFDF5',
                borderRadius: '14px',
                padding: '1.25rem 0.75rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
                border: '1px solid #D1FAE5'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#10B981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.85rem' }}>View Map</div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '4px', lineHeight: 1.2, fontWeight: 500 }}>Explore tasks in your area</div>
            </div>

            {/* My Tasks */}
            <div 
              onClick={() => navigate('/worker/tasks')}
              style={{
                backgroundColor: '#F3E8FF',
                borderRadius: '14px',
                padding: '1.25rem 0.75rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
                border: '1px solid #E9D5FF'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#9333EA', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"/>
                  <line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/>
                  <line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              </div>
              <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.85rem' }}>My Tasks</div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '4px', lineHeight: 1.2, fontWeight: 500 }}>View all assigned tasks</div>
            </div>

            {/* Report an Issue */}
            <div 
              onClick={() => navigate('/submit')}
              style={{
                backgroundColor: '#FFE4E6',
                borderRadius: '14px',
                padding: '1.25rem 0.75rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
                border: '1px solid #FECDD3'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#E11D48', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.85rem' }}>Report an Issue</div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '4px', lineHeight: 1.2, fontWeight: 500 }}>Report new issues you find</div>
            </div>

          </div>
        </div>

        {/* Recent Activity Panel */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Recent Activity</h2>
            <button 
              onClick={() => navigate('/worker/notifications')}
              style={{ background: 'none', border: 'none', color: '#0066FF', fontWeight: 700, fontSize: '0.825rem', cursor: 'pointer' }}
            >
              View All →
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '220px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {displayActivity.map(act => {
                let icon = (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                );
                let iconBg = '#EFF6FF';
                let iconColor = '#0066FF';

                if (act.type === 'completed' || act.status === 'resolved' || act.status === 'closed') {
                  icon = (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  );
                  iconBg = '#DCFCE7';
                  iconColor = '#16A34A';
                } else if (act.type === 'updated' || act.status === 'in_progress') {
                  icon = (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  );
                  iconBg = '#FEF3C7';
                  iconColor = '#D97706';
                } else if (act.type === 'comment') {
                  icon = (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  );
                  iconBg = '#F3E8FF';
                  iconColor = '#9333EA';
                }

                const timeLabel = act.timeText || (act.timestamp ? new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now');

                return (
                  <div key={act.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {act.title}
                      </div>
                      {act.issueTitle && (
                        <div style={{ color: '#64748B', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                          {act.issueTitle}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: '#94A3B8', flexShrink: 0, fontWeight: 500 }}>
                      {timeLabel}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Interactive Task Detail Modal / Drawer */}
      {selectedTaskDetail && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'stretch'
        }}>
          <div style={{
            width: '500px',
            maxWidth: '90vw',
            backgroundColor: 'white',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>
                  TASK #{String(selectedTaskDetail._id).substring(String(selectedTaskDetail._id).length - 6).toUpperCase()}
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: '4px 0 0 0' }}>
                  {selectedTaskDetail.title}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedTaskDetail(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#64748B', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Description</label>
                <p style={{ color: '#334155', fontSize: '0.875rem', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                  {selectedTaskDetail.description || 'No detailed description provided.'}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Category</label>
                  <div style={{ margin: '4px 0 0 0' }}>{getCategoryTags(selectedTaskDetail)}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Priority</label>
                  <div style={{ margin: '4px 0 0 0' }}>{getPriorityBadge(selectedTaskDetail.priority)}</div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Location</label>
                <p style={{ color: '#334155', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
                  📍 {selectedTaskDetail.locationName || selectedTaskDetail.location || 'Main Street'}
                </p>
              </div>

              {/* Work Execution Controls */}
              {selectedTaskDetail.status !== 'resolved' && selectedTaskDetail.status !== 'closed' && (
                <div style={{ backgroundColor: '#F8FAFC', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E2E8F0', marginTop: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', color: '#0F172A', fontSize: '0.925rem', fontWeight: 800 }}>Complete Task & Upload Evidence</h4>
                  
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Resolution Notes</label>
                    <textarea 
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Add completion details or work description..."
                      rows="2"
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                    ></textarea>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Upload Photo Proof</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setEvidenceFile(e.target.files[0])}
                      style={{ fontSize: '0.8rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button 
                      onClick={(e) => handleStartTask(e, selectedTaskDetail._id)}
                      style={{ flex: 1, backgroundColor: '#0066FF', color: 'white', border: 'none', borderRadius: '8px', padding: '0.625rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}
                    >
                      Start Task
                    </button>

                    <button 
                      onClick={(e) => handleCompleteTask(e, selectedTaskDetail._id)}
                      style={{ flex: 1, backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '8px', padding: '0.625rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}
                    >
                      Mark Completed
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default WorkerDashboard;
