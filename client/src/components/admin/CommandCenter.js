import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

import {
    AdminReportIssueModal,
    AdminAssignWorkerModal,
    AdminCreateInterventionModal,
    AdminSystemStatusModal
} from './CommandCenterModals';

// Leaflet helper to adjust bounds dynamically
const MapBoundsComponent = ({ markers }) => {
    const map = useMap();
    useEffect(() => {
        if (markers && markers.length > 0) {
            const validCoords = markers
                .filter(m => m.lat && m.lng)
                .map(m => [m.lat, m.lng]);
            if (validCoords.length > 0) {
                map.fitBounds(validCoords, { padding: [40, 40] });
            }
        }
    }, [markers, map]);
    return null;
};

// SVG Sparkline Component
const Sparkline = ({ data = [10, 15, 12, 18, 22, 25, 30], color = '#2563eb' }) => {
    const min = Math.min(...data);
    const max = Math.max(...data) || 1;
    const points = data.map((val, idx) => {
        const x = (idx / (data.length - 1)) * 80;
        const y = 30 - ((val - min) / (max - min || 1)) * 24;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width="85" height="32" viewBox="0 0 80 30" style={{ overflow: 'visible' }}>
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
            />
        </svg>
    );
};

// SVG Donut Chart for Issue Overview
const IssueOverviewDonut = ({ categories = [], total = 0 }) => {
    const colors = ['#2563eb', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#64748b', '#94a3b8'];
    let cumulativeAngle = 0;

    return (
        <div style={{ position: 'relative', width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="130" height="130" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="6" />
                {categories.map((cat, idx) => {
                    const strokeDasharray = `${cat.percentage} ${100 - cat.percentage}`;
                    const strokeDashoffset = 100 - cumulativeAngle + 25;
                    cumulativeAngle += cat.percentage;
                    return (
                        <circle
                            key={cat.name}
                            cx="21"
                            cy="21"
                            r="15.915"
                            fill="none"
                            stroke={colors[idx % colors.length]}
                            strokeWidth="6"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                        />
                    );
                })}
            </svg>
            <div style={{ position: 'absolute', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', lineHeight: '1' }}>{total}</div>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '500', marginTop: '2px' }}>Total Issues</div>
            </div>
        </div>
    );
};

// SVG Gauge Chart for SLA Compliance
const SlaGaugeChart = ({ percentage = 88 }) => {
    const strokeDasharray = `${percentage} ${100 - percentage}`;

    return (
        <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="120" height="120" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="5.5" />
                <circle
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="5.5"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset="25"
                    strokeLinecap="round"
                />
            </svg>
            <div style={{ position: 'absolute', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', lineHeight: '1' }}>{percentage}%</div>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '500', marginTop: '2px' }}>Within SLA</div>
            </div>
        </div>
    );
};

// Main Command Center Component
const CommandCenter = ({ issues = [], workers = [], onRefresh }) => {
    const navigate = useNavigate();

    // Command Center State
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [period, setPeriod] = useState('30d');
    const [lastRefreshed, setLastRefreshed] = useState(new Date());

    // Map filters and layer states
    const [mapIssueFilter, setMapIssueFilter] = useState('all');
    const [mapPriorityFilter, setMapPriorityFilter] = useState('all');
    const [mapStatusFilter, setMapStatusFilter] = useState('all');
    const [layers, setLayers] = useState({
        civicIssues: true,
        fieldWorkers: true,
        vehicles: true,
        interventions: true,
        highPriority: true,
        slaRisk: true,
        cityBoundary: false
    });
    const [layersOpen, setLayersOpen] = useState(true);

    // Modal Control States
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [interventionModalOpen, setInterventionModalOpen] = useState(false);
    const [systemStatusModalOpen, setSystemStatusModalOpen] = useState(false);

    // Fetch Command Center summary data from API
    const fetchSummaryData = useCallback(async (isManualRefresh = false) => {
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const res = await api.get(`/admin/command-center?period=${period}`);
            if (res.data && res.data.data) {
                setSummary(res.data.data);
            }
            setLastRefreshed(new Date());
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error('Error fetching command center data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [period, onRefresh]);

    useEffect(() => {
        fetchSummaryData();
    }, [fetchSummaryData]);

    // Export handler
    const handleExport = async () => {
        try {
            window.open(`http://localhost:5000/api/admin/command-center/export?format=csv`, '_blank');
        } catch (err) {
            console.error('Export failed:', err);
            alert('Failed to generate export file.');
        }
    };

    // Derived counts or fallback values
    const kpis = summary?.kpis || {
        totalIssues: { value: issues.length || 248, trend: 12, sparkline: [180, 195, 210, 225, 230, 240, 248] },
        highPriority: { value: issues.filter(i => i.priority === 'high' || i.priority === 'urgent').length || 36, trend: 8, sparkline: [25, 28, 30, 32, 34, 35, 36] },
        resolved: { value: issues.filter(i => i.status === 'resolved' || i.status === 'closed').length || 182, trend: 25, sparkline: [120, 135, 150, 165, 172, 178, 182] },
        activeWorkers: { value: workers.filter(w => w.dutyStatus === 'on_duty').length || 78, trend: 5, sparkline: [70, 72, 74, 75, 76, 77, 78] },
        slaAtRisk: { value: 28, trend: -18, sparkline: [40, 38, 35, 32, 30, 29, 28] }
    };

    const categoriesList = summary?.issueOverview?.categories?.length > 0 ? summary.issueOverview.categories : [
        { name: 'Roads', count: 78, percentage: 31 },
        { name: 'Waste', count: 62, percentage: 25 },
        { name: 'Water', count: 41, percentage: 17 },
        { name: 'Drainage', count: 28, percentage: 11 },
        { name: 'Lighting', count: 21, percentage: 8 },
        { name: 'Parks', count: 11, percentage: 4 },
        { name: 'Other', count: 7, percentage: 3 }
    ];

    const slaData = summary?.slaCompliance || { overallPercentage: 88, withinSla: 218, atRisk: 28, breached: 12 };
    const fieldOps = summary?.fieldOperations || { activeWorkers: 78, onBreak: 12, offDuty: 6, fieldVehicles: 24 };
    const activityFeed = summary?.liveActivity?.length > 0 ? summary.liveActivity : [
        { id: 1, icon: '🚨', title: 'New issue reported', subtitle: 'Pothole on Main Street', timestamp: new Date(Date.now() - 2 * 60000) },
        { id: 2, icon: '👤', title: 'Worker assigned', subtitle: 'Drainage cleaning - Riverside Area', timestamp: new Date(Date.now() - 5 * 60000) },
        { id: 3, icon: '⚡', title: 'Intervention started', subtitle: 'Street light upgrade - West End', timestamp: new Date(Date.now() - 12 * 60000) },
        { id: 4, icon: '✅', title: 'Issue resolved', subtitle: 'Garbage collection - Central District', timestamp: new Date(Date.now() - 18 * 60000) },
        { id: 5, icon: '💬', title: 'Citizen comment', subtitle: '#CC-1042 - Water supply issue', timestamp: new Date(Date.now() - 25 * 60000) },
        { id: 6, icon: '⚠️', title: 'SLA risk alert', subtitle: '8 issues approaching SLA breach', timestamp: new Date(Date.now() - 32 * 60000) }
    ];

    const weatherData = summary?.weather || { temp: '28°C', condition: 'Partly Cloudy', humidity: '62%', wind: '12 km/h', airQuality: 'Good', rainChance: '10%' };

    const recentIssuesList = summary?.recentIssues?.length > 0 ? summary.recentIssues : [
        { id: '#CC-1045', title: 'Pothole on Main Street', category: 'Roads', location: 'Central District', priority: 'high', status: 'reported', createdAt: new Date(Date.now() - 2 * 60000) },
        { id: '#CC-1044', title: 'Garbage collection missed', category: 'Waste', location: 'Riverside Area', priority: 'medium', status: 'assigned', createdAt: new Date(Date.now() - 18 * 60000) },
        { id: '#CC-1043', title: 'Street light not working', category: 'Lighting', location: 'West End', priority: 'high', status: 'in_progress', createdAt: new Date(Date.now() - 60 * 60000) },
        { id: '#CC-1042', title: 'Water supply interruption', category: 'Water', location: 'Eastwood', priority: 'medium', status: 'reported', createdAt: new Date(Date.now() - 120 * 60000) },
        { id: '#CC-1041', title: 'Drainage overflow', category: 'Drainage', location: 'Green Park', priority: 'high', status: 'assigned', createdAt: new Date(Date.now() - 180 * 60000) }
    ];

    const activeWorkersList = summary?.activeWorkers?.length > 0 ? summary.activeWorkers : [
        { id: '1', name: 'Rajesh Kumar', role: 'Field Supervisor', status: 'On Duty', rawStatus: 'on_duty', location: 'Central District' },
        { id: '2', name: 'Priya Sharma', role: 'Sanitation Worker', status: 'On Duty', rawStatus: 'on_duty', location: 'Riverside Area' },
        { id: '3', name: 'Amit Singh', role: 'Maintenance', status: 'On Duty', rawStatus: 'on_duty', location: 'West End' },
        { id: '4', name: 'Sunita Devi', role: 'Technician', status: 'On Break', rawStatus: 'on_break', location: 'Eastwood' },
        { id: '5', name: 'Vikram Patel', role: 'Driver', status: 'On Duty', rawStatus: 'on_duty', location: 'Green Park' }
    ];

    const mapMarkers = summary?.mapMarkers || [];

    // Filter map markers
    const filteredMapMarkers = mapMarkers.filter(m => {
        if (mapPriorityFilter !== 'all' && m.priority.toLowerCase() !== mapPriorityFilter.toLowerCase()) return false;
        if (mapStatusFilter !== 'all' && m.status.toLowerCase() !== mapStatusFilter.toLowerCase()) return false;
        if (mapIssueFilter !== 'all' && m.category.toLowerCase() !== mapIssueFilter.toLowerCase()) return false;
        return true;
    });

    const formatRelativeTime = (dateStr) => {
        if (!dateStr) return 'just now';
        const diffMs = new Date() - new Date(dateStr);
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins} min ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} hr ago`;
        return `${Math.floor(hours / 24)} d ago`;
    };

    if (loading && !summary) {
        return (
            <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ height: '60px', backgroundColor: '#f1f5f9', borderRadius: '12px' }}></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
                    {[...Array(5)].map((_, i) => <div key={i} style={{ height: '90px', backgroundColor: '#f1f5f9', borderRadius: '12px' }}></div>)}
                </div>
                <div style={{ height: '400px', backgroundColor: '#f1f5f9', borderRadius: '12px' }}></div>
            </div>
        );
    }

    return (
        <div style={{ padding: '4px 0 24px 0', color: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif' }}>
            
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        backgroundColor: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4" />
                        </svg>
                    </div>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#0f172a', tracking: '-0.02em' }}>Command Center</h1>
                        <p style={{ color: '#64748b', margin: '2px 0 0 0', fontSize: '13px' }}>Real-time overview of civic operations, issues, field activities, and city performance.</p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Date / Period Control */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            style={{ border: 'none', background: 'transparent', fontSize: '12px', fontWeight: '600', color: '#0f172a', cursor: 'pointer', outline: 'none' }}
                        >
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days (Default)</option>
                            <option value="90d">Last 90 Days</option>
                            <option value="all">All Time</option>
                        </select>
                        <span style={{ fontSize: '11px', color: '#94a3b8', borderLeft: '1px solid #cbd5e1', paddingLeft: '8px' }}>
                            {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={() => fetchSummaryData(true)}
                        disabled={refreshing}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            padding: '8px 14px',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#0f172a',
                            cursor: refreshing ? 'wait' : 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>
                            <polyline points="23 4 23 10 17 10"/>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                        </svg>
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>

                    {/* Export Button */}
                    <button
                        onClick={handleExport}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            padding: '8px 14px',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#0f172a',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Export
                    </button>
                </div>
            </div>

            {/* Row 1: 5 KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '20px' }}>
                
                {/* Card 1: Total Issues */}
                <div 
                    onClick={() => navigate('/admin/civic')}
                    style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Total Issues</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                            <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', lineHeight: '1.1' }}>{kpis.totalIssues.value}</div>
                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#16a34a', marginTop: '4px' }}>↑ {kpis.totalIssues.trend}% vs last week</div>
                        </div>
                        <Sparkline data={kpis.totalIssues.sparkline} color="#2563eb" />
                    </div>
                </div>

                {/* Card 2: High Priority */}
                <div 
                    onClick={() => navigate('/admin/civic?priority=high')}
                    style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>High Priority</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                            <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', lineHeight: '1.1' }}>{kpis.highPriority.value}</div>
                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#dc2626', marginTop: '4px' }}>↑ {kpis.highPriority.trend}% vs last week</div>
                        </div>
                        <Sparkline data={kpis.highPriority.sparkline} color="#ef4444" />
                    </div>
                </div>

                {/* Card 3: Resolved */}
                <div 
                    onClick={() => navigate('/admin/civic?status=resolved')}
                    style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Resolved</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                            <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', lineHeight: '1.1' }}>{kpis.resolved.value}</div>
                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#16a34a', marginTop: '4px' }}>↑ {kpis.resolved.trend}% vs last week</div>
                        </div>
                        <Sparkline data={kpis.resolved.sparkline} color="#10b981" />
                    </div>
                </div>

                {/* Card 4: Active Workers */}
                <div 
                    onClick={() => navigate('/admin/workers')}
                    style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Active Workers</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                            <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', lineHeight: '1.1' }}>{kpis.activeWorkers.value}</div>
                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#16a34a', marginTop: '4px' }}>↑ {kpis.activeWorkers.trend}% vs last week</div>
                        </div>
                        <Sparkline data={kpis.activeWorkers.sparkline} color="#f59e0b" />
                    </div>
                </div>

                {/* Card 5: SLA At Risk */}
                <div 
                    onClick={() => navigate('/admin/civic?slaRisk=true')}
                    style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>SLA At Risk</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                            <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', lineHeight: '1.1' }}>{kpis.slaAtRisk.value}</div>
                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#dc2626', marginTop: '4px' }}>↓ {Math.abs(kpis.slaAtRisk.trend)}% vs last week</div>
                        </div>
                        <Sparkline data={kpis.slaAtRisk.sparkline} color="#ef4444" />
                    </div>
                </div>
            </div>

            {/* Row 2: Live City Map + Issue Overview + Live Activity Feed */}
            <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                
                {/* 1. Live City Map Card */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '480px', position: 'relative' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: '#2563eb' }}>📍</span>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Live City Map</h3>
                            </div>
                            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>Real-time view of civic issues, field operations, and interventions.</p>
                        </div>

                        {/* Map Filter Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <select
                                value={mapIssueFilter}
                                onChange={(e) => setMapIssueFilter(e.target.value)}
                                style={{ padding: '4px 8px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white' }}
                            >
                                <option value="all">All Issues</option>
                                <option value="roads">Roads</option>
                                <option value="waste">Waste</option>
                                <option value="water">Water</option>
                                <option value="drainage">Drainage</option>
                                <option value="lighting">Lighting</option>
                            </select>

                            <select
                                value={mapPriorityFilter}
                                onChange={(e) => setMapPriorityFilter(e.target.value)}
                                style={{ padding: '4px 8px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white' }}
                            >
                                <option value="all">All Priorities</option>
                                <option value="high">High Priority</option>
                                <option value="normal">Normal Priority</option>
                                <option value="low">Low Priority</option>
                            </select>

                            <select
                                value={mapStatusFilter}
                                onChange={(e) => setMapStatusFilter(e.target.value)}
                                style={{ padding: '4px 8px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white' }}
                            >
                                <option value="all">All Status</option>
                                <option value="reported">Reported</option>
                                <option value="assigned">Assigned</option>
                                <option value="in_progress">In Progress</option>
                                <option value="resolved">Resolved</option>
                            </select>
                        </div>
                    </div>

                    {/* Leaflet Map Canvas */}
                    <div style={{ flex: 1, position: 'relative', zIndex: 0 }}>
                        <MapContainer center={[40.7128, -74.0060]} zoom={12} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                attribution='&copy; OpenStreetMap'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <MapBoundsComponent markers={filteredMapMarkers} />
                            
                            {filteredMapMarkers.map((marker) => {
                                const color = marker.status === 'resolved' || marker.status === 'closed' 
                                    ? '#10b981' 
                                    : (marker.priority === 'urgent' || marker.priority === 'high' ? '#ef4444' : '#f59e0b');
                                return (
                                    <CircleMarker
                                        key={marker.id}
                                        center={[marker.lat, marker.lng]}
                                        radius={7}
                                        pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 2 }}
                                    >
                                        <Popup>
                                            <div style={{ fontSize: '12px', padding: '2px' }}>
                                                <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>{marker.title}</div>
                                                <div><strong>Category:</strong> {marker.category}</div>
                                                <div><strong>Priority:</strong> <span style={{ textTransform: 'capitalize', color }}>{marker.priority}</span></div>
                                                <div><strong>Status:</strong> {marker.status}</div>
                                                <div><strong>Location:</strong> {marker.location}</div>
                                                <button
                                                    onClick={() => navigate(`/admin/civic?highlight=${marker.id}`)}
                                                    style={{
                                                        marginTop: '8px',
                                                        width: '100%',
                                                        backgroundColor: '#2563eb',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '11px',
                                                        fontWeight: '600'
                                                    }}
                                                >
                                                    View Issue Details
                                                </button>
                                            </div>
                                        </Popup>
                                    </CircleMarker>
                                );
                            })}
                        </MapContainer>

                        {/* Map Layers Overlay Box */}
                        <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            zIndex: 999,
                            width: '160px',
                            fontSize: '11px'
                        }}>
                            <div 
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '700', color: '#0f172a', marginBottom: '8px', cursor: 'pointer' }}
                                onClick={() => setLayersOpen(!layersOpen)}
                            >
                                <span>Map Layers</span>
                                <span>{layersOpen ? '▲' : '▼'}</span>
                            </div>

                            {layersOpen && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={layers.civicIssues} onChange={(e) => setLayers(p => ({ ...p, civicIssues: e.target.checked }))} />
                                        <span>🔴 Civic Issues</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={layers.fieldWorkers} onChange={(e) => setLayers(p => ({ ...p, fieldWorkers: e.target.checked }))} />
                                        <span>👤 Field Workers</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={layers.vehicles} onChange={(e) => setLayers(p => ({ ...p, vehicles: e.target.checked }))} />
                                        <span>🚚 Vehicles</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={layers.interventions} onChange={(e) => setLayers(p => ({ ...p, interventions: e.target.checked }))} />
                                        <span>⚡ Interventions</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={layers.highPriority} onChange={(e) => setLayers(p => ({ ...p, highPriority: e.target.checked }))} />
                                        <span>⚠️ High Priority</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={layers.slaRisk} onChange={(e) => setLayers(p => ({ ...p, slaRisk: e.target.checked }))} />
                                        <span>🕒 SLA Risk</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#94a3b8' }}>
                                        <input type="checkbox" checked={layers.cityBoundary} onChange={(e) => setLayers(p => ({ ...p, cityBoundary: e.target.checked }))} />
                                        <span>🗺️ City Boundary</span>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Middle Column: Issue Overview + SLA Compliance */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    
                    {/* Issue Overview Donut Card */}
                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: '#2563eb' }}>🎯</span>
                                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Issue Overview</h3>
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>Last 30 Days</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                            <IssueOverviewDonut categories={categoriesList} total={kpis.totalIssues.value} />
                            
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                                {categoriesList.map((cat, i) => {
                                    const dotColors = ['#2563eb', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#64748b', '#94a3b8'];
                                    return (
                                        <div 
                                            key={cat.name}
                                            onClick={() => navigate(`/admin/civic?category=${encodeURIComponent(cat.name)}`)}
                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '2px 0' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dotColors[i % dotColors.length] }}></span>
                                                <span style={{ color: '#334155', fontWeight: '500' }}>{cat.name}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', fontWeight: '600', color: '#0f172a' }}>
                                                <span>{cat.count}</span>
                                                <span style={{ color: '#94a3b8', width: '28px', textAlign: 'right' }}>{cat.percentage}%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* SLA Compliance Ring Card */}
                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: '#10b981' }}>⏱️</span>
                                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>SLA Compliance</h3>
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>Last 30 Days</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                            <SlaGaugeChart percentage={slaData.overallPercentage} />

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                                <div onClick={() => navigate('/admin/civic?slaStatus=within')} style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                                        <span style={{ color: '#334155', fontWeight: '500' }}>Within SLA</span>
                                    </div>
                                    <span style={{ fontWeight: '700', color: '#0f172a' }}>{slaData.withinSla}</span>
                                </div>

                                <div onClick={() => navigate('/admin/civic?slaStatus=risk')} style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
                                        <span style={{ color: '#334155', fontWeight: '500' }}>At Risk</span>
                                    </div>
                                    <span style={{ fontWeight: '700', color: '#0f172a' }}>{slaData.atRisk}</span>
                                </div>

                                <div onClick={() => navigate('/admin/civic?slaStatus=breached')} style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
                                        <span style={{ color: '#334155', fontWeight: '500' }}>Breached</span>
                                    </div>
                                    <span style={{ fontWeight: '700', color: '#0f172a' }}>{slaData.breached}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Right Column: Live Activity Feed + Weather */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    
                    {/* Live Activity Feed */}
                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', flex: 1.4, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: '#2563eb' }}>⚡</span>
                                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Live Activity Feed</h3>
                            </div>
                            <span 
                                onClick={() => navigate('/admin/notifications')} 
                                style={{ fontSize: '11px', color: '#2563eb', fontWeight: '600', cursor: 'pointer' }}
                            >
                                View All →
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '250px' }}>
                            {activityFeed.map((act) => (
                                <div key={act.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '11px' }}>
                                    <div style={{
                                        width: '26px',
                                        height: '26px',
                                        borderRadius: '50%',
                                        backgroundColor: '#f1f5f9',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        flexShrink: 0
                                    }}>
                                        {act.icon}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{act.title}</div>
                                        <div style={{ color: '#64748b', marginTop: '1px' }}>{act.subtitle}</div>
                                    </div>
                                    <div style={{ color: '#94a3b8', fontSize: '10px', whiteSpace: 'nowrap' }}>
                                        {formatRelativeTime(act.timestamp)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Weather & City Conditions */}
                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                            <span style={{ color: '#f59e0b' }}>🌤️</span>
                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Weather & City Conditions</h3>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '28px' }}>☀️</span>
                                <div>
                                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', lineHeight: '1' }}>{weatherData.temp}</div>
                                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', marginTop: '2px' }}>{weatherData.condition}</div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'x 12px y 4px', fontSize: '10px', color: '#64748b' }}>
                                <div>Humidity: <strong style={{ color: '#0f172a' }}>{weatherData.humidity}</strong></div>
                                <div>Wind: <strong style={{ color: '#0f172a' }}>{weatherData.wind}</strong></div>
                                <div>Air Quality: <strong style={{ color: '#16a34a' }}>🟢 {weatherData.airQuality}</strong></div>
                                <div>Rain Chance: <strong style={{ color: '#0f172a' }}>{weatherData.rainChance}</strong></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 3: Field Operations + Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                
                {/* Field Operations Card */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: '#2563eb' }}>👷</span>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Field Operations</h3>
                            </div>
                            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>Real-time status of municipal workers and teams.</p>
                        </div>
                        <span 
                            onClick={() => navigate('/admin/workers')} 
                            style={{ fontSize: '12px', color: '#2563eb', fontWeight: '600', cursor: 'pointer' }}
                        >
                            View All →
                        </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                        <div 
                            onClick={() => navigate('/admin/workers?status=on_duty')}
                            style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', cursor: 'pointer', textAlign: 'center' }}
                        >
                            <span style={{ fontSize: '18px' }}>👤</span>
                            <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '4px 0 2px 0' }}>{fieldOps.activeWorkers}</div>
                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>Active Workers</div>
                        </div>

                        <div 
                            onClick={() => navigate('/admin/workers?status=on_break')}
                            style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '10px', cursor: 'pointer', textAlign: 'center' }}
                        >
                            <span style={{ fontSize: '18px' }}>🟡</span>
                            <div style={{ fontSize: '20px', fontWeight: '800', color: '#b45309', margin: '4px 0 2px 0' }}>{fieldOps.onBreak}</div>
                            <div style={{ fontSize: '10px', color: '#b45309', fontWeight: '600' }}>On Break</div>
                        </div>

                        <div 
                            onClick={() => navigate('/admin/workers?status=off_duty')}
                            style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', cursor: 'pointer', textAlign: 'center' }}
                        >
                            <span style={{ fontSize: '18px' }}>⚪</span>
                            <div style={{ fontSize: '20px', fontWeight: '800', color: '#475569', margin: '4px 0 2px 0' }}>{fieldOps.offDuty}</div>
                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>Off Duty</div>
                        </div>

                        <div 
                            onClick={() => navigate('/admin/live')}
                            style={{ backgroundColor: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '8px', padding: '10px', cursor: 'pointer', textAlign: 'center' }}
                        >
                            <span style={{ fontSize: '18px' }}>🚚</span>
                            <div style={{ fontSize: '20px', fontWeight: '800', color: '#1d4ed8', margin: '4px 0 2px 0' }}>{fieldOps.fieldVehicles}</div>
                            <div style={{ fontSize: '10px', color: '#1d4ed8', fontWeight: '600' }}>Field Vehicles</div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions Card */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                        <span style={{ color: '#2563eb' }}>⚡</span>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Quick Actions</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        <button
                            onClick={() => setReportModalOpen(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                padding: '10px 8px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#0f172a',
                                cursor: 'pointer'
                            }}
                        >
                            <span style={{ color: '#2563eb', fontWeight: '800' }}>+</span> Report Issue
                        </button>

                        <button
                            onClick={() => setAssignModalOpen(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                padding: '10px 8px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#0f172a',
                                cursor: 'pointer'
                            }}
                        >
                            <span style={{ color: '#2563eb', fontWeight: '800' }}>+</span> Assign Worker
                        </button>

                        <button
                            onClick={() => setInterventionModalOpen(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                padding: '10px 8px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#0f172a',
                                cursor: 'pointer'
                            }}
                        >
                            <span style={{ color: '#2563eb', fontWeight: '800' }}>+</span> Create Intervention
                        </button>

                        <button
                            onClick={() => window.scrollTo({ top: 150, behavior: 'smooth' })}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                padding: '10px 8px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#0f172a',
                                cursor: 'pointer'
                            }}
                        >
                            <span>📍</span> View Live Map
                        </button>

                        <button
                            onClick={handleExport}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                padding: '10px 8px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#0f172a',
                                cursor: 'pointer'
                            }}
                        >
                            <span>📄</span> Generate Report
                        </button>

                        <button
                            onClick={() => setSystemStatusModalOpen(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                padding: '10px 8px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#0f172a',
                                cursor: 'pointer'
                            }}
                        >
                            <span>⚙️</span> System Status
                        </button>
                    </div>
                </div>
            </div>

            {/* Row 4: Recent Civic Issues + Active Workers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '16px' }}>
                
                {/* Recent Civic Issues Table */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: '#2563eb' }}>📋</span>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Recent Civic Issues</h3>
                            </div>
                            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>Latest issues reported by citizens.</p>
                        </div>
                        <span 
                            onClick={() => navigate('/admin/civic')} 
                            style={{ fontSize: '12px', color: '#2563eb', fontWeight: '600', cursor: 'pointer' }}
                        >
                            View All →
                        </span>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600' }}>
                                    <th style={{ padding: '10px 14px' }}>ID</th>
                                    <th style={{ padding: '10px 14px' }}>Issue</th>
                                    <th style={{ padding: '10px 14px' }}>Category</th>
                                    <th style={{ padding: '10px 14px' }}>Location</th>
                                    <th style={{ padding: '10px 14px' }}>Priority</th>
                                    <th style={{ padding: '10px 14px' }}>Status</th>
                                    <th style={{ padding: '10px 14px' }}>Reported</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentIssuesList.map((issue) => {
                                    const isHigh = issue.priority === 'high' || issue.priority === 'urgent';
                                    const isResolved = issue.status === 'resolved' || issue.status === 'closed';
                                    const isInProgress = issue.status === 'in_progress';
                                    
                                    return (
                                        <tr 
                                            key={issue.id} 
                                            onClick={() => navigate(`/admin/civic?highlight=${issue.rawId || ''}`)}
                                            style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background-color 0.15s' }}
                                        >
                                            <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: '600', color: '#2563eb' }}>{issue.id}</td>
                                            <td style={{ padding: '10px 14px', fontWeight: '600', color: '#0f172a' }}>{issue.title}</td>
                                            <td style={{ padding: '10px 14px', color: '#475569' }}>{issue.category}</td>
                                            <td style={{ padding: '10px 14px', color: '#64748b' }}>{issue.location}</td>
                                            <td style={{ padding: '10px 14px' }}>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    backgroundColor: isHigh ? '#fef2f2' : '#fffbeb',
                                                    color: isHigh ? '#dc2626' : '#b45309'
                                                }}>
                                                    {issue.priority}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 14px' }}>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    backgroundColor: isResolved ? '#ecfdf5' : isInProgress ? '#eff6ff' : '#f8fafc',
                                                    color: isResolved ? '#047857' : isInProgress ? '#1d4ed8' : '#475569'
                                                }}>
                                                    {issue.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{formatRelativeTime(issue.createdAt)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Active Workers Table */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: '#2563eb' }}>👷</span>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Active Workers</h3>
                            </div>
                            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>Field workers currently on duty.</p>
                        </div>
                        <span 
                            onClick={() => navigate('/admin/workers')} 
                            style={{ fontSize: '12px', color: '#2563eb', fontWeight: '600', cursor: 'pointer' }}
                        >
                            View All →
                        </span>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600' }}>
                                    <th style={{ padding: '10px 14px' }}>Name</th>
                                    <th style={{ padding: '10px 14px' }}>Role</th>
                                    <th style={{ padding: '10px 14px' }}>Status</th>
                                    <th style={{ padding: '10px 14px' }}>Location</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeWorkersList.map((worker) => {
                                    const initials = worker.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                                    const isOnDuty = worker.rawStatus === 'on_duty' || worker.status === 'On Duty';
                                    const isOnBreak = worker.rawStatus === 'on_break' || worker.status === 'On Break';

                                    return (
                                        <tr 
                                            key={worker.id}
                                            onClick={() => navigate(`/admin/workers`)}
                                            style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                                        >
                                            <td style={{ padding: '10px 14px', fontWeight: '600', color: '#0f172a' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{
                                                        width: '26px',
                                                        height: '26px',
                                                        borderRadius: '50%',
                                                        backgroundColor: '#e2e8f0',
                                                        color: '#334155',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '10px',
                                                        fontWeight: '700'
                                                    }}>
                                                        {initials}
                                                    </div>
                                                    <span>{worker.name}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '10px 14px', color: '#475569' }}>{worker.role}</td>
                                            <td style={{ padding: '10px 14px' }}>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    backgroundColor: isOnDuty ? '#ecfdf5' : isOnBreak ? '#fffbeb' : '#f8fafc',
                                                    color: isOnDuty ? '#047857' : isOnBreak ? '#b45309' : '#475569'
                                                }}>
                                                    {worker.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 14px', color: '#64748b' }}>{worker.location}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Quick Action Modals */}
            <AdminReportIssueModal
                isOpen={reportModalOpen}
                onClose={() => setReportModalOpen(false)}
                onSuccess={() => fetchSummaryData(true)}
                workers={workers}
            />

            <AdminAssignWorkerModal
                isOpen={assignModalOpen}
                onClose={() => setAssignModalOpen(false)}
                onSuccess={() => fetchSummaryData(true)}
                issues={issues}
                workers={workers}
            />

            <AdminCreateInterventionModal
                isOpen={interventionModalOpen}
                onClose={() => setInterventionModalOpen(false)}
                onSuccess={() => fetchSummaryData(true)}
                issues={issues}
            />

            <AdminSystemStatusModal
                isOpen={systemStatusModalOpen}
                onClose={() => setSystemStatusModalOpen(false)}
            />
        </div>
    );
};

export default CommandCenter;
