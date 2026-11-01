import React, { useContext, useEffect, useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useDataMode } from "../context/DataModeContext";
import api from "../services/api";

// Leaflet map imports
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Category Icon Helper
const CategoryBadgeIcon = ({ category }) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('road') || cat.includes('pothole')) {
    return (
      <svg width="14" height="14" fill="none" stroke="#475569" viewBox="0 0 24 24" strokeWidth="2">
        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  }
  if (cat.includes('garbage') || cat.includes('waste')) {
    return (
      <svg width="14" height="14" fill="none" stroke="#16a34a" viewBox="0 0 24 24" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    );
  }
  if (cat.includes('street') || cat.includes('light') || cat.includes('electric')) {
    return (
      <svg width="14" height="14" fill="none" stroke="#f59e0b" viewBox="0 0 24 24" strokeWidth="2">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    );
  }
  if (cat.includes('water') || cat.includes('drain') || cat.includes('leak')) {
    return (
      <svg width="14" height="14" fill="none" stroke="#2563eb" viewBox="0 0 24 24" strokeWidth="2">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" fill="none" stroke="#9333ea" viewBox="0 0 24 24" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
};

const getRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 30) return date.toLocaleDateString();
  if (diffDay > 7) {
    const weeks = Math.floor(diffDay / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffMin > 0) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  return 'Just now';
};

const formatStatusText = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'in_progress') return 'In Progress';
  if (s === 'reported') return 'Reported';
  if (s === 'verified') return 'Verified';
  if (s === 'assigned') return 'Assigned';
  if (s === 'resolved') return 'Resolved';
  if (s === 'closed') return 'Closed';
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Reported';
};

function Home() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { isDemo } = useDataMode();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [stats, setStats] = useState({
    issuesReported: 0,
    issuesResolved: 0,
    activeCitizens: 0,
    avgResolutionTime: '0.0 days',
    reportedPercentChange: null
  });

  const [recentIssues, setRecentIssues] = useState([]);
  const [mapIssues, setMapIssues] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

const FALLBACK_DEMO_ISSUES = [
  {
    _id: "demo_issue_101",
    title: "Hazardous Deep Pothole on MG Road Junction",
    description: "Large deep pothole creating severe traffic congestion and danger for commuters.",
    locationName: "MG Road, Central Sector",
    location: "MG Road, Central Sector",
    department: "Roads & Maintenance",
    category: "Pothole",
    status: "in_progress",
    priority: "high",
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    images: ["https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80"],
    coordinates: [77.5946, 12.9716]
  },
  {
    _id: "demo_issue_102",
    title: "Overflowing Garbage Bin & Littering",
    description: "Community waste container overflowing near public park entrance.",
    locationName: "Indiranagar 100ft Road",
    location: "Indiranagar 100ft Road",
    department: "Sanitation & Waste",
    category: "Garbage",
    status: "resolved",
    priority: "medium",
    createdAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    images: ["https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=80"],
    coordinates: [77.6412, 12.9784]
  },
  {
    _id: "demo_issue_103",
    title: "Broken Streetlight Near Pedestrian Crossing",
    description: "Streetlight fixture broken and dark at night near high school.",
    locationName: "Koramangala 5th Block",
    location: "Koramangala 5th Block",
    department: "Electrical & Lighting",
    category: "Streetlight",
    status: "reported",
    priority: "medium",
    createdAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    images: ["https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80"],
    coordinates: [77.6245, 12.9352]
  },
  {
    _id: "demo_issue_104",
    title: "Major Water Pipe Leakage on Main Avenue",
    description: "Main supply pipe ruptured causing water logging across two lanes.",
    locationName: "Jayanagar 4th Block",
    location: "Jayanagar 4th Block",
    department: "Water Supply & Drainage",
    category: "Water Leakage",
    status: "assigned",
    priority: "high",
    createdAt: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
    images: ["https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?w=600&auto=format&fit=crop&q=80"],
    coordinates: [77.5810, 12.9250]
  },
  {
    _id: "demo_issue_105",
    title: "Blocked Storm Drain Damaging Road Surface",
    description: "Stormwater drain choked with fallen branches and plastic debris.",
    locationName: "Whitefield Inner Circle",
    location: "Whitefield Inner Circle",
    department: "Water Supply & Drainage",
    category: "Drainage",
    status: "verified",
    priority: "normal",
    createdAt: new Date(Date.now() - 52 * 3600 * 1000).toISOString(),
    images: ["https://images.unsplash.com/photo-1584467735815-f778f274e296?w=600&auto=format&fit=crop&q=80"],
    coordinates: [77.7499, 12.9698]
  }
];

const FALLBACK_DEMO_ANNOUNCEMENTS = [
  {
    _id: "demo_ann_101",
    title: "Annual Citywide Cleanliness Drive 2026",
    content: "Join municipal teams and citizen volunteers this weekend for the community cleanliness initiative.",
    date: new Date().toISOString(),
    category: "Community Event"
  },
  {
    _id: "demo_ann_102",
    title: "Scheduled Utility & Water Supply Maintenance",
    content: "Upgrades to water pipelines scheduled for Sunday from 10:00 AM to 2:00 PM in Central Sector.",
    date: new Date(Date.now() - 86400000).toISOString(),
    category: "Utility Update"
  },
  {
    _id: "demo_ann_103",
    title: "AI Issue Dup Detection System Deployed",
    content: "Citizens get instant notification if an issue in their vicinity has already been reported.",
    date: new Date(Date.now() - 172800000).toISOString(),
    category: "Platform Notice"
  }
];

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/issues/dashboard').catch(() => null);

      if (res && res.data && res.data.stats) {
        setStats({
          issuesReported: res.data.stats.issuesReported ?? 0,
          issuesResolved: res.data.stats.issuesResolved ?? 0,
          activeCitizens: res.data.stats.activeCitizens ?? 0,
          avgResolutionTime: res.data.stats.avgResolutionTime || 'N/A',
          reportedPercentChange: res.data.stats.reportedPercentChange ?? 0
        });
        const rIssues = (res.data.recentIssues && res.data.recentIssues.length > 0) ? res.data.recentIssues : (isDemo ? FALLBACK_DEMO_ISSUES : []);
        const mIssues = (res.data.nearbyIssues && res.data.nearbyIssues.length > 0) ? res.data.nearbyIssues : (isDemo ? FALLBACK_DEMO_ISSUES : []);
        const aList = (res.data.announcements && res.data.announcements.length > 0) ? res.data.announcements : (isDemo ? FALLBACK_DEMO_ANNOUNCEMENTS : []);
        
        setRecentIssues(rIssues);
        setMapIssues(mIssues);
        setAnnouncements(aList);
      } else {
        const [issuesRes, annRes] = await Promise.all([
          api.get('/issues').catch(() => ({ data: [] })),
          api.get('/announcements').catch(() => ({ data: [] }))
        ]);

        const rawIssues = Array.isArray(issuesRes.data) ? issuesRes.data : [];
        const rawAnnouncements = Array.isArray(annRes.data) ? annRes.data : [];

        const allIssues = rawIssues.length > 0 ? rawIssues : (isDemo ? FALLBACK_DEMO_ISSUES : []);
        const allAnnouncements = rawAnnouncements.length > 0 ? rawAnnouncements : (isDemo ? FALLBACK_DEMO_ANNOUNCEMENTS : []);

        const reportedCount = rawIssues.length;
        const resolvedIssues = rawIssues.filter(i => i.status === 'resolved' || i.status === 'closed');
        const resolvedCount = resolvedIssues.length;

        let avgDays = 'N/A';
        if (resolvedIssues.length > 0) {
          const totalMs = resolvedIssues.reduce((sum, issue) => {
            const end = issue.resolvedAt || issue.closedAt || new Date();
            const start = new Date(issue.createdAt);
            return sum + Math.max(0, new Date(end) - start);
          }, 0);
          const avgMs = totalMs / resolvedIssues.length;
          avgDays = `${(avgMs / (1000 * 60 * 60 * 24)).toFixed(1)} days`;
        }

        const uniqueUserIds = new Set();
        rawIssues.forEach(i => {
          if (i.createdBy) {
            const uid = typeof i.createdBy === 'object' ? i.createdBy._id : i.createdBy;
            if (uid) uniqueUserIds.add(uid.toString());
          }
        });

        setStats({
          issuesReported: reportedCount,
          issuesResolved: resolvedCount,
          activeCitizens: uniqueUserIds.size,
          avgResolutionTime: avgDays,
          reportedPercentChange: 0
        });

        const sorted = [...allIssues].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setRecentIssues(sorted.slice(0, 5));
        setMapIssues(allIssues);
        setAnnouncements(allAnnouncements.slice(0, 3));
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Unable to load latest dashboard statistics.");
      setStats({
        issuesReported: 0,
        issuesResolved: 0,
        activeCitizens: 0,
        avgResolutionTime: 'N/A',
        reportedPercentChange: 0
      });
      if (isDemo) {
        setRecentIssues(FALLBACK_DEMO_ISSUES);
        setMapIssues(FALLBACK_DEMO_ISSUES);
        setAnnouncements(FALLBACK_DEMO_ANNOUNCEMENTS);
      } else {
        setRecentIssues([]);
        setMapIssues([]);
        setAnnouncements([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user, isDemo]);

  if (user && user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  if (user && user.role === 'worker') {
    return <Navigate to="/worker" replace />;
  }

  const defaultCenter = [12.9716, 77.5946];
  const firstCoords = mapIssues.length > 0
    ? (Array.isArray(mapIssues[0].coordinates)
        ? [mapIssues[0].coordinates[1], mapIssues[0].coordinates[0]]
        : [mapIssues[0].coordinates.coordinates[1], mapIssues[0].coordinates.coordinates[0]])
    : defaultCenter;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '14px', fontSize: '13px', color: '#991b1b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {error}</span>
          <button onClick={loadDashboardData} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      {/* 1. HERO BANNER */}
      <section className="citizen-hero-card">
        <div className="citizen-hero-left">
          <h1 className="citizen-hero-title">
            Together for <br />
            <span>Cleaner Communities</span>
          </h1>

          <p className="citizen-hero-subtitle">
            Report issues. Track progress. Be the change in your community.
          </p>

          <button className="citizen-hero-cta" onClick={() => navigate('/submit')}>
            <span style={{ fontSize: '16px' }}>＋</span> Report an Issue
          </button>
        </div>

        <div className="citizen-hero-right">
          <div className="citizen-hero-badge-box">
            <div className="citizen-hero-quote-tag">
              <div className="citizen-hero-leaf-pill">
                <span>🍃</span> A cleaner city today, a better tomorrow.
              </div>
              <button style={{ background: '#f1f5f9', border: 'none', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer' }}>›</button>
            </div>

            <div className="citizen-hero-graphic-container">
              <svg width="300" height="120" viewBox="0 0 300 120" fill="currentColor" style={{ color: 'rgba(255,255,255,0.9)' }}>
                <ellipse cx="60" cy="20" rx="30" ry="10" fill="#ffffff" opacity="0.3" />
                <ellipse cx="220" cy="25" rx="40" ry="12" fill="#ffffff" opacity="0.3" />
                <circle cx="260" cy="20" r="14" fill="#fde047" />
                <rect x="25" y="35" width="30" height="85" rx="2" fill="#1e293b" />
                <rect x="32" y="45" width="5" height="7" fill="#fef08a" />
                <rect x="42" y="45" width="5" height="7" fill="#fef08a" />
                <rect x="65" y="15" width="40" height="105" rx="2" fill="#334155" />
                <rect x="73" y="25" width="6" height="8" fill="#60a5fa" />
                <rect x="87" y="25" width="6" height="8" fill="#60a5fa" />
                <rect x="115" y="45" width="35" height="75" rx="2" fill="#0f172a" />
                <rect x="160" y="25" width="45" height="95" rx="2" fill="#1e293b" />
                <rect x="170" y="35" width="6" height="8" fill="#fef08a" />
                <rect x="186" y="35" width="6" height="8" fill="#fef08a" />
                <rect x="215" y="50" width="40" height="70" rx="2" fill="#334155" />
                <circle cx="15" cy="95" r="18" fill="#16a34a" />
                <rect x="13" y="105" width="4" height="20" fill="#78350f" />
                <circle cx="285" cy="90" r="20" fill="#15803d" />
                <rect x="283" y="102" width="4" height="22" fill="#78350f" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STATISTICS ROW */}
      <section className="citizen-stats-row">
        
        {/* Card 1: Issues Reported */}
        <div className="citizen-stat-card">
          <div className="citizen-stat-icon-wrapper green">
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div className="citizen-stat-info">
            <div className="citizen-stat-header">
              <span className="citizen-stat-value">{loading ? '...' : stats.issuesReported}</span>
              {stats.reportedPercentChange !== null ? (
                <span className="citizen-stat-trend up">↑ {stats.reportedPercentChange}% <span className="citizen-stat-trend-sub">This month</span></span>
              ) : (
                <span className="citizen-stat-trend-sub">Total</span>
              )}
            </div>
            <div className="citizen-stat-label">Issues Reported</div>
          </div>
        </div>

        {/* Card 2: Issues Resolved */}
        <div className="citizen-stat-card">
          <div className="citizen-stat-icon-wrapper blue">
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="citizen-stat-info">
            <div className="citizen-stat-header">
              <span className="citizen-stat-value">{loading ? '...' : stats.issuesResolved}</span>
              <span className="citizen-stat-trend-sub">Total</span>
            </div>
            <div className="citizen-stat-label">Issues Resolved</div>
          </div>
        </div>

        {/* Card 3: Active Citizens */}
        <div className="citizen-stat-card">
          <div className="citizen-stat-icon-wrapper purple">
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="citizen-stat-info">
            <div className="citizen-stat-header">
              <span className="citizen-stat-value">{loading ? '...' : stats.activeCitizens}</span>
              <span className="citizen-stat-trend-sub">Citizens</span>
            </div>
            <div className="citizen-stat-label">Active Citizens</div>
          </div>
        </div>

        {/* Card 4: Avg. Resolution Time */}
        <div className="citizen-stat-card">
          <div className="citizen-stat-icon-wrapper orange">
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="citizen-stat-info">
            <div className="citizen-stat-header">
              <span className="citizen-stat-value">{loading ? '...' : stats.avgResolutionTime}</span>
            </div>
            <div className="citizen-stat-label">Avg. Resolution Time</div>
          </div>
        </div>

      </section>

      {/* 3. MAIN 2-COLUMN GRID */}
      <div className="citizen-main-grid">
        
        {/* LEFT COLUMN */}
        <div className="citizen-left-col">
          
          {/* QUICK ACTIONS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Quick Actions</h3>
            
            <div className="citizen-quick-actions-grid">
              
              <div className="citizen-quick-action-card blue" onClick={() => navigate('/submit')}>
                <div className="citizen-action-icon-circle">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <div>
                  <div className="citizen-action-title">Report an Issue</div>
                  <div className="citizen-action-desc">Take a photo and report a problem</div>
                </div>
              </div>

              <div className="citizen-quick-action-card green" onClick={() => navigate('/map')}>
                <div className="citizen-action-icon-circle">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div>
                  <div className="citizen-action-title">View on Map</div>
                  <div className="citizen-action-desc">Explore issues in your area</div>
                </div>
              </div>

              <div className="citizen-quick-action-card purple" onClick={() => navigate('/issues')}>
                <div className="citizen-action-icon-circle">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                  </svg>
                </div>
                <div>
                  <div className="citizen-action-title">My Issues</div>
                  <div className="citizen-action-desc">Track your reported issues</div>
                </div>
              </div>

              <div className="citizen-quick-action-card orange" onClick={() => navigate('/notifications')}>
                <div className="citizen-action-icon-circle">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <div>
                  <div className="citizen-action-title">Notifications</div>
                  <div className="citizen-action-desc">Stay updated on progress</div>
                </div>
              </div>

            </div>
          </div>

          {/* RECENT ISSUES */}
          <div className="citizen-card-box">
            <div className="citizen-card-header">
              <span className="citizen-card-title">Recent Issues</span>
              <Link to="/issues" className="citizen-card-link">View All →</Link>
            </div>

            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Loading recent issues...</div>
            ) : recentIssues.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '24px' }}>📋</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>No recent issues</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>You haven't reported any civic issues yet.</div>
                <button onClick={() => navigate('/submit')} style={{ background: '#1d61f2', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', marginTop: '8px', fontSize: '12px' }}>＋ Report an Issue</button>
              </div>
            ) : (
              <div className="recent-issue-list">
                {recentIssues.map((issue) => (
                  <div 
                    key={issue._id} 
                    className="recent-issue-row"
                    onClick={() => navigate(`/issues/${issue._id}`)}
                  >
                    <div className="recent-issue-left">
                      <div className="recent-issue-thumb">
                        {issue.images && issue.images.length > 0 ? (
                          <img src={issue.images[0]} alt={issue.title} />
                        ) : (
                          <CategoryBadgeIcon category={issue.department} />
                        )}
                      </div>
                      <div className="recent-issue-details">
                        <span className="recent-issue-title">{issue.title}</span>
                        <span className="recent-issue-location">
                          <svg width="12" height="12" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {issue.locationName || issue.location || 'Municipal Area'}
                        </span>
                      </div>
                    </div>

                    <div className="recent-issue-right">
                      <span className={`status-badge ${(issue.status || 'reported').toLowerCase()}`}>
                        {formatStatusText(issue.status)}
                      </span>
                      <span className="category-tag">
                        <CategoryBadgeIcon category={issue.department} />
                        {issue.department || 'General'}
                      </span>
                      <span className="recent-issue-time">{getRelativeTime(issue.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="citizen-right-col">
          
          {/* MAP */}
          <div className="citizen-card-box">
            <div className="citizen-card-header">
              <span className="citizen-card-title">Issues Near You</span>
              <Link to="/map" className="citizen-card-link">View Map →</Link>
            </div>

            <div className="map-container-box">
              {loading ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px' }}>Loading Map...</div>
              ) : mapIssues.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '12px' }}>
                  <span style={{ fontSize: '20px', marginBottom: '4px' }}>🗺️</span>
                  <span>No nearby issues with valid coordinates.</span>
                </div>
              ) : (
                <MapContainer 
                  center={firstCoords} 
                  zoom={12} 
                  style={{ height: '100%', width: '100%', zIndex: 0 }}
                  scrollWheelZoom={false}
                >
                  <TileLayer 
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {mapIssues.map(issue => {
                    const coords = Array.isArray(issue.coordinates) 
                      ? [issue.coordinates[1], issue.coordinates[0]] 
                      : [issue.coordinates.coordinates[1], issue.coordinates.coordinates[0]];
                    return (
                      <Marker key={issue._id} position={coords}>
                        <Popup>
                          <div style={{ padding: '4px', fontSize: '12px' }}>
                            <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>{issue.title}</div>
                            <div style={{ color: '#64748b', marginBottom: '8px' }}>{issue.department} • {formatStatusText(issue.status)}</div>
                            <button 
                              onClick={() => navigate(`/issues/${issue._id}`)}
                              style={{ background: '#1d61f2', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', width: '100%', cursor: 'pointer' }}
                            >
                              View Issue
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              )}
            </div>
          </div>

          {/* HOW IT WORKS */}
          <div className="citizen-card-box">
            <div className="citizen-card-header">
              <span className="citizen-card-title">How It Works</span>
              <Link to="/help" className="citizen-card-link">Learn More →</Link>
            </div>

            <div className="how-it-works-row">
              <div className="how-step">
                <div className="how-number">1</div>
                <div className="how-label">Report</div>
                <div className="how-sub">Take a photo and report an Issue</div>
              </div>

              <div style={{ color: '#cbd5e1', fontWeight: '700' }}>→</div>

              <div className="how-step">
                <div className="how-number">2</div>
                <div className="how-label">Track</div>
                <div className="how-sub">Follow real-time progress</div>
              </div>

              <div style={{ color: '#cbd5e1', fontWeight: '700' }}>→</div>

              <div className="how-step">
                <div className="how-number">3</div>
                <div className="how-label">Resolve</div>
                <div className="how-sub">Authorities take action</div>
              </div>
            </div>
          </div>

          {/* ANNOUNCEMENTS */}
          <div className="citizen-card-box">
            <div className="citizen-card-header">
              <span className="citizen-card-title">Latest Announcements</span>
              <Link to="/help" className="citizen-card-link">View All →</Link>
            </div>

            {loading ? (
              <div style={{ padding: '16px', color: '#94a3b8', fontSize: '12px', textAlign: 'center' }}>Loading announcements...</div>
            ) : announcements.length === 0 ? (
              <div style={{ padding: '20px', color: '#94a3b8', fontSize: '12px', textAlign: 'center' }}>No community announcements yet.</div>
            ) : (
              <div className="announcements-list">
                {announcements.map((ann) => (
                  <div key={ann._id} className="announcement-card">
                    <div className="announcement-icon-box">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path d="M11 5L6 9H2v6h4l5 4V5z" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                      </svg>
                    </div>
                    <div className="announcement-content">
                      <div className="announcement-title-row">
                        <span className="announcement-title">{ann.title}</span>
                        <span className="announcement-date">
                          {new Date(ann.date || ann.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="announcement-body">{ann.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}

export default Home;
