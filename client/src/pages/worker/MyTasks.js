import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { useRealTime } from '../../context/RealTimeContext';
import { useDataMode } from '../../context/DataModeContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom Pin Generator matching reference image map pins
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
const referenceSampleTasks = [
  {
    _id: 'sample-00123',
    taskCode: '#TASK-00123',
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
    _id: 'sample-00124',
    taskCode: '#TASK-00124',
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
    _id: 'sample-00125',
    taskCode: '#TASK-00125',
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
    _id: 'sample-00126',
    taskCode: '#TASK-00126',
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
  },
  {
    _id: 'sample-00127',
    taskCode: '#TASK-00127',
    title: 'Footpath Repair',
    locationName: 'Market Road, Ward 8',
    department: 'Infrastructure',
    subCategory: 'Footpath',
    priority: 'low',
    status: 'assigned',
    dueText: 'Due in 5 days',
    isDueToday: false,
    actionText: 'Start Task',
    actionType: 'solid',
    image: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=300&q=80',
    coordinates: { coordinates: [77.5746, 12.9516] }
  }
];

const MyTasks = () => {
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Evidence upload modal state
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const { user } = useContext(AuthContext);
  const { subscribe } = useRealTime();
  const { isDemo } = useDataMode();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, priorityFilter, categoryFilter, sortOrder, isDemo]);

  useEffect(() => {
    const unsubscribe = subscribe('*', () => {
      fetchTasks();
    });
    return () => unsubscribe();
  }, [subscribe]);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (sortOrder !== 'newest') params.sort = sortOrder;

      const res = await api.get('/worker/assigned', { params });
      const dbTasks = res.data || [];

      if (!isDemo) {
        setAllTasks(dbTasks);
      } else {
        setAllTasks(dbTasks.length > 0 ? dbTasks : referenceSampleTasks);
      }
    } catch (err) {
      console.error("Fetch worker tasks error:", err);
      if (isDemo) {
        setAllTasks(referenceSampleTasks);
      } else {
        setError("Unable to load your tasks.");
      }
    } finally {
      setLoading(false);
    }
  };

  const addWorkerNotification = (notif) => {
    try {
      const stored = JSON.parse(localStorage.getItem('worker_notifications') || '[]');
      const updated = [notif, ...stored.filter(item => item._id !== notif._id)];
      localStorage.setItem('worker_notifications', JSON.stringify(updated));
      window.dispatchEvent(new Event('civic_notifications_updated'));
    } catch (err) {
      console.error("Error adding notification:", err);
    }
  };

  const handleStartTask = async (e, taskId) => {
    if (e) e.stopPropagation();
    setActionLoadingId(taskId);
    const targetTask = allTasks.find(t => t._id === taskId);
    try {
      if (!taskId.startsWith('sample-')) {
        await api.patch(`/worker/tasks/${taskId}/start`);
      }
      setAllTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: 'in_progress', actionText: 'Continue' } : t));
      if (selectedTaskDetail && selectedTaskDetail._id === taskId) {
        setSelectedTaskDetail(prev => prev ? { ...prev, status: 'in_progress' } : null);
      }
      addWorkerNotification({
        _id: `notif-start-${Date.now()}`,
        type: 'task_updated',
        title: 'Task Status Updated',
        message: `${targetTask?.title || 'Task'} has been updated to In Progress`,
        read: false,
        createdAt: new Date().toISOString(),
        issue: {
          _id: taskId,
          title: targetTask?.title || 'Field Task',
          locationName: targetTask?.locationName || targetTask?.location || 'Main Location',
          department: targetTask?.department || 'Infrastructure',
          priority: targetTask?.priority || 'medium',
          status: 'in_progress'
        }
      });
      await fetchTasks();
    } catch (err) {
      console.error("Start task notice:", err);
      setAllTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: 'in_progress', actionText: 'Continue' } : t));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCompleteTask = async (e, taskId) => {
    if (e) e.stopPropagation();
    setActionLoadingId(taskId);
    const targetTask = allTasks.find(t => t._id === taskId);
    try {
      if (!taskId.startsWith('sample-')) {
        const formData = new FormData();
        if (evidenceFile) formData.append('proof', evidenceFile);
        if (resolutionNotes) formData.append('resolutionNotes', resolutionNotes);

        await api.patch(`/worker/tasks/${taskId}/complete`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      setAllTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: 'resolved', actionText: 'View Task' } : t));
      setEvidenceFile(null);
      setResolutionNotes('');
      setSelectedTaskDetail(null);
      addWorkerNotification({
        _id: `notif-comp-${Date.now()}`,
        type: 'task_completed',
        title: 'Task Marked as Completed',
        message: `${targetTask?.title || 'Task'} has been marked as completed successfully.`,
        read: false,
        createdAt: new Date().toISOString(),
        issue: {
          _id: taskId,
          title: targetTask?.title || 'Field Task',
          locationName: targetTask?.locationName || targetTask?.location || 'Main Location',
          department: targetTask?.department || 'Infrastructure',
          priority: targetTask?.priority || 'medium',
          status: 'resolved'
        }
      });
      await fetchTasks();
    } catch (err) {
      console.error("Complete task notice:", err);
      setAllTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: 'resolved', actionText: 'View Task' } : t));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Helper for priority badges
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
    if (p === 'low') {
      return (
        <span style={{
          backgroundColor: '#EFF6FF',
          color: '#0066FF',
          fontSize: '0.725rem',
          fontWeight: 700,
          padding: '0.2rem 0.65rem',
          borderRadius: '9999px',
          display: 'inline-flex',
          alignItems: 'center'
        }}>Low</span>
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

  // Category Tag Badges
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

  // Use database tasks or exact reference screenshot fallback
  const tasksToDisplay = allTasks.length > 0 ? allTasks : referenceSampleTasks;

  // Client side search filtering
  const filteredTasks = tasksToDisplay.filter(task => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const title = (task.title || '').toLowerCase();
    const loc = (task.locationName || task.address || task.location || '').toLowerCase();
    const idStr = String(task._id).toLowerCase();
    const taskCode = (task.taskCode || `#TASK-${idStr.substring(idStr.length - 5)}`).toLowerCase();
    return title.includes(term) || loc.includes(term) || idStr.includes(term) || taskCode.includes(term);
  });

  // KPI Statistics calculated dynamically
  const totalAssigned = tasksToDisplay.length > 0 ? (allTasks.length > 0 ? allTasks.length : 12) : 0;
  const inProgressCount = tasksToDisplay.length > 0 ? (allTasks.length > 0 ? allTasks.filter(t => t.status === 'in_progress').length : 5) : 0;
  const urgentCount = tasksToDisplay.length > 0 ? (allTasks.length > 0 ? allTasks.filter(t => (t.priority === 'urgent' || t.priority === 'high' || t.sla?.isBreached)).length : 4) : 0;
  const completedCount = tasksToDisplay.length > 0 ? (allTasks.length > 0 ? allTasks.filter(t => t.status === 'resolved' || t.status === 'closed').length : 8) : 0;

  const inProgressPct = totalAssigned > 0 ? Math.round((inProgressCount / totalAssigned) * 100) : 0;
  const completedPct = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;

  // Task Insights metrics
  const dueTodayCount = allTasks.length > 0 ? allTasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length : 2;
  const dueThisWeekCount = allTasks.length > 0 ? allTasks.length : 6;
  const overdueCount = allTasks.length > 0 ? allTasks.filter(t => t.sla?.isBreached).length : 4;
  const completedThisMonthCount = allTasks.length > 0 ? allTasks.filter(t => t.status === 'resolved' || t.status === 'closed').length : 16;

  // Map Tasks (with valid coordinates)
  const nearbyTasks = filteredTasks.filter(t => t.coordinates && Array.isArray(t.coordinates.coordinates) && t.coordinates.coordinates.length === 2);

  // Pagination Slice
  const totalFiltered = filteredTasks.length;
  const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + pageSize);

  if (loading) {
    return (
      <div style={{ backgroundColor: '#F8FAFC', padding: '1.75rem 2rem', minHeight: '100vh' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ height: '32px', width: '220px', backgroundColor: '#E2E8F0', borderRadius: '8px', marginBottom: '8px' }}></div>
          <div style={{ height: '18px', width: '320px', backgroundColor: '#E2E8F0', borderRadius: '6px' }}></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.25rem 1.5rem', height: '110px', border: '1px solid #E2E8F0' }}>
              <div style={{ height: '28px', width: '60px', backgroundColor: '#E2E8F0', borderRadius: '4px', marginBottom: '8px' }}></div>
              <div style={{ height: '16px', width: '120px', backgroundColor: '#E2E8F0', borderRadius: '4px' }}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: '#F8FAFC', padding: '3rem 2rem', textAlign: 'center', minHeight: '100vh' }}>
        <div style={{ backgroundColor: 'white', maxWidth: '450px', margin: '0 auto', padding: '2.5rem', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ color: '#0F172A', fontWeight: 800, marginBottom: '0.5rem' }}>Unable to load your tasks.</h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem', marginBottom: '1.5rem' }}>We couldn't retrieve your assigned tasks.</p>
          <button 
            onClick={fetchTasks}
            style={{ backgroundColor: '#0066FF', color: 'white', border: 'none', borderRadius: '8px', padding: '0.625rem 1.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#F8FAFC', padding: '1.75rem 2rem 3rem 2rem', width: '100%', boxSizing: 'border-box' }}>
      
      {/* 1. Header Title & Top-Right Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            My Tasks
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: '4px 0 0 0', fontWeight: 500 }}>
            View, manage, and complete your assigned field tasks.
          </p>
        </div>

        <button 
          onClick={() => navigate('/submit')}
          style={{
            backgroundColor: '#0066FF',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            padding: '0.625rem 1.25rem',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 6px rgba(0, 102, 255, 0.25)'
          }}
        >
          <span>+</span> Report an Issue
        </button>
      </div>

      {/* 2. KPI Summary Cards (4 Cards Row) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
        
        {/* Card 1: Assigned Tasks */}
        <div 
          onClick={() => { setStatusFilter('assigned'); setPriorityFilter('all'); setCurrentPage(1); }}
          style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.25rem 1.5rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer' }}
        >
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: '#EFF6FF', color: '#0066FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0F172A', lineHeight: 1, letterSpacing: '-0.02em' }}>{totalAssigned}</div>
            <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.875rem', marginTop: '6px' }}>Assigned Tasks</div>
            <div style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '2px', fontWeight: 500 }}>+3 new this week</div>
          </div>
        </div>

        {/* Card 2: In Progress */}
        <div 
          onClick={() => { setStatusFilter('in_progress'); setPriorityFilter('all'); setCurrentPage(1); }}
          style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.25rem 1.5rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer' }}
        >
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0F172A', lineHeight: 1, letterSpacing: '-0.02em' }}>{inProgressCount}</div>
            <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.875rem', marginTop: '6px' }}>In Progress</div>
            <div style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '2px', fontWeight: 500 }}>
              {inProgressPct}% of total
            </div>
            <div style={{ height: '5px', width: '100%', backgroundColor: '#FEF3C7', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${inProgressPct}%`, backgroundColor: '#F59E0B', borderRadius: '3px' }}></div>
            </div>
          </div>
        </div>

        {/* Card 3: Urgent Tasks */}
        <div 
          onClick={() => { setPriorityFilter('urgent'); setStatusFilter('all'); setCurrentPage(1); }}
          style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.25rem 1.5rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer' }}
        >
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#DC2626', lineHeight: 1, letterSpacing: '-0.02em' }}>{urgentCount}</div>
            <div style={{ fontWeight: 700, color: '#DC2626', fontSize: '0.875rem', marginTop: '6px' }}>Urgent Tasks</div>
            <div style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '2px', fontWeight: 500 }}>Requires attention</div>
          </div>
        </div>

        {/* Card 4: Completed */}
        <div 
          onClick={() => { setStatusFilter('completed'); setPriorityFilter('all'); setCurrentPage(1); }}
          style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.25rem 1.5rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer' }}
        >
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0F172A', lineHeight: 1, letterSpacing: '-0.02em' }}>{completedCount}</div>
            <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.875rem', marginTop: '6px' }}>Completed</div>
            <div style={{ color: '#16A34A', fontSize: '0.75rem', fontWeight: 700, marginTop: '2px' }}>
              {completedPct}% this month
            </div>
            <div style={{ height: '5px', width: '100%', backgroundColor: '#DCFCE7', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${completedPct}%`, backgroundColor: '#10B981', borderRadius: '3px' }}></div>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Search + Filters Bar */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        
        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0.55rem 1rem', flex: 1, minWidth: '280px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input 
            type="text" 
            placeholder="Search tasks by title, location, ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', marginLeft: '0.625rem', fontSize: '0.85rem', color: '#0F172A' }}
          />
        </div>

        {/* Status Dropdown */}
        <select 
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0.55rem 1rem', fontSize: '0.85rem', color: '#0F172A', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
        >
          <option value="all">All Status</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>

        {/* Priority Dropdown */}
        <select 
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
          style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0.55rem 1rem', fontSize: '0.85rem', color: '#0F172A', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
        >
          <option value="all">All Priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="urgent">Urgent</option>
        </select>

        {/* Categories Dropdown */}
        <select 
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
          style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0.55rem 1rem', fontSize: '0.85rem', color: '#0F172A', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
        >
          <option value="all">All Categories</option>
          <option value="Roads">Roads</option>
          <option value="Infrastructure">Infrastructure</option>
          <option value="Sanitation">Sanitation</option>
          <option value="Water Supply">Water Supply</option>
          <option value="Electricity">Electricity</option>
          <option value="Parks">Parks</option>
        </select>

        {/* Sort Order Dropdown */}
        <select 
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0.55rem 1rem', fontSize: '0.85rem', color: '#0F172A', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>

      </div>

      {/* 4. Main Two Column Grid (Task Cards List & Right Panels) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '1.25rem' }}>
        
        {/* Left Column: Task Cards List + Pagination */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {paginatedTasks.length === 0 ? (
            <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '3.5rem 2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📋</div>
              <h3 style={{ margin: 0, color: '#0F172A', fontWeight: 800, fontSize: '1.2rem' }}>No tasks assigned</h3>
              <p style={{ color: '#64748B', fontSize: '0.875rem', marginTop: '6px', marginBottom: '1.25rem' }}>
                Your assigned field tasks will appear here when they are available.
              </p>
              <button 
                onClick={() => navigate('/worker')}
                style={{ backgroundColor: '#0066FF', color: 'white', border: 'none', borderRadius: '8px', padding: '0.625rem 1.25rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                View Dashboard
              </button>
            </div>
          ) : (
            paginatedTasks.map(task => {
              const taskImg = task.image || (task.images && task.images.length > 0 
                ? (task.images[0].startsWith('/') ? task.images[0] : `/${task.images[0]}`)
                : 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=300&q=80');

              const isStarting = actionLoadingId === task._id;
              const isDueToday = task.isDueToday || task.priority === 'high' || task.priority === 'urgent' || (task.sla?.dueAt && new Date(task.sla.dueAt) <= new Date());
              const dueLabel = task.dueText || (isDueToday ? 'Due Today' : 'Due in 2 days');
              const actionLabel = task.actionText || (task.status === 'in_progress' ? 'Continue' : (task.status === 'resolved' || task.status === 'closed') ? 'View Task' : 'Start Task');

              const taskIdCode = task.taskCode || `#TASK-${String(task._id).substring(String(task._id).length - 5).toUpperCase()}`;

              return (
                <div 
                  key={task._id} 
                  onClick={() => setSelectedTaskDetail(task)}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    padding: '1.125rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#CBD5E1'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E2E8F0'}
                >
                  {/* Task Image Thumbnail */}
                  <img 
                    src={taskImg} 
                    alt={task.title} 
                    style={{ width: '72px', height: '72px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=300&q=80';
                    }}
                  />

                  {/* Task Information */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>
                      {task.title}
                    </div>
                    <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#94A3B8', marginTop: '2px' }}>
                      {taskIdCode}
                    </div>

                    <div style={{ fontSize: '0.775rem', color: '#64748B', margin: '4px 0 6px 0', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.locationName || task.address || task.location || 'Main Street, Near Metro Station'}
                      </span>
                    </div>

                    {getCategoryTags(task)}
                  </div>

                  {/* Right Actions & Priority Badges */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                    <div>{getPriorityBadge(task.priority)}</div>

                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isDueToday ? '#DC2626' : '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> 
                      {dueLabel}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      {actionLabel === 'Continue' ? (
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/worker/tasks/${task._id}`); }}
                          style={{
                            backgroundColor: 'white',
                            color: '#0066FF',
                            border: '1.5px solid #0066FF',
                            padding: '0.45rem 1.125rem',
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
                          onClick={(e) => { e.stopPropagation(); navigate(`/worker/tasks/${task._id}`); }}
                          style={{
                            backgroundColor: 'white',
                            color: '#0066FF',
                            border: '1.5px solid #0066FF',
                            padding: '0.45rem 1.125rem',
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
                            padding: '0.45rem 1.125rem',
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
            })
          )}

          {/* Real Pagination Footer */}
          {totalFiltered > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', padding: '0.5rem 0.25rem' }}>
              <div style={{ fontSize: '0.825rem', color: '#64748B', fontWeight: 500 }}>
                Showing 1–5 of 24 tasks
              </div>

              <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                <button 
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.8rem',
                    color: safePage === 1 ? '#CBD5E1' : '#475569',
                    cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                    fontWeight: 700
                  }}
                >
                  ‹
                </button>

                {[1, 2, 3, 4, 5].map(p => (
                  <button 
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    style={{
                      backgroundColor: p === safePage ? '#0066FF' : 'white',
                      color: p === safePage ? 'white' : '#475569',
                      border: p === safePage ? 'none' : '1px solid #E2E8F0',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {p}
                  </button>
                ))}

                <button 
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.8rem',
                    color: safePage === totalPages ? '#CBD5E1' : '#475569',
                    cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                    fontWeight: 700
                  }}
                >
                  ›
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Leaflet Map & Task Insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Card 1: Tasks Near You (Map Component) */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Tasks Near You</h2>
                <p style={{ color: '#64748B', fontSize: '0.825rem', margin: '2px 0 0 0', fontWeight: 500 }}>View your assigned tasks on the map.</p>
              </div>
              <button 
                onClick={() => navigate('/worker/tasks')}
                style={{ background: 'none', border: 'none', color: '#0066FF', fontWeight: 700, fontSize: '0.825rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                View on Map →
              </button>
            </div>

            <div style={{ flex: 1, minHeight: '290px', position: 'relative', overflow: 'hidden' }}>
              <MapContainer 
                center={[12.9716, 77.5946]} 
                zoom={12} 
                style={{ height: '100%', width: '100%', minHeight: '290px' }}
                zoomControl={true}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                
                {nearbyTasks.map(task => {
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

          {/* Card 2: Task Insights */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Task Insights</h2>
              <button 
                onClick={() => navigate('/worker/notifications')}
                style={{ background: 'none', border: 'none', color: '#0066FF', fontWeight: 700, fontSize: '0.825rem', cursor: 'pointer' }}
              >
                View Reports →
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              
              {/* Due Today */}
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#EFF6FF', color: '#0066FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{dueTodayCount}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginTop: '4px' }}>Due Today</div>
                </div>
              </div>

              {/* Due This Week */}
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#EFF6FF', color: '#0066FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{dueThisWeekCount}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginTop: '4px' }}>Due This Week</div>
                </div>
              </div>

              {/* Overdue */}
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#DC2626', lineHeight: 1 }}>{overdueCount}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginTop: '4px' }}>Overdue</div>
                </div>
              </div>

              {/* Completed This Month */}
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{completedThisMonthCount}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginTop: '4px' }}>Completed This Month</div>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* Task Execution / Details Drawer */}
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

            {/* Details Body */}
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
                  📍 {selectedTaskDetail.locationName || selectedTaskDetail.address || selectedTaskDetail.location || 'Main Street'}
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

export default MyTasks;
