import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

// Helper to adjust map viewport dynamically
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

const LiveMapCenter = ({ onRefreshParent }) => {
    const navigate = useNavigate();

    // Map & Data States
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [period, setPeriod] = useState('30d');
    const [lastRefreshed, setLastRefreshed] = useState(new Date());

    // Tile Layer Toggle (Map vs Satellite)
    const [mapTileType, setMapTileType] = useState('map'); // 'map' or 'satellite'

    // Map Filters
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [timeRangeFilter, setTimeRangeFilter] = useState('24h');
    const [searchAreaInput, setSearchAreaInput] = useState('');

    // Fetch Live Map Summary Data
    const fetchLiveMapData = useCallback(async (isManualRefresh = false) => {
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const queryParams = new URLSearchParams({
                category: categoryFilter,
                priority: priorityFilter,
                status: statusFilter,
                department: departmentFilter,
                timeRange: timeRangeFilter,
                searchArea: searchAreaInput.trim()
            }).toString();

            const res = await api.get(`/admin/live-map/summary?${queryParams}`);
            if (res.data && res.data.data) {
                setSummary(res.data.data);
            }
            setLastRefreshed(new Date());
        } catch (err) {
            console.error('Error fetching Live Map data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [categoryFilter, priorityFilter, statusFilter, departmentFilter, timeRangeFilter, searchAreaInput]);

    useEffect(() => {
        fetchLiveMapData();
    }, [fetchLiveMapData]);

    // Export handler
    const handleExport = () => {
        window.open(`/api/admin/command-center/export?format=csv`, '_blank');
    };

    // Format relative timestamp helper
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

    // Derived values (honest zero defaults, no fabricated KPIs)
    const kpis = summary?.kpis || {
        totalIssues: { value: 0, trend: 0, sparkline: [] },
        highPriority: { value: 0, trend: 0, sparkline: [] },
        resolved: { value: 0, trend: 0, sparkline: [] },
        activeWorkers: { value: 0, trend: 0, sparkline: [] },
        slaAtRisk: { value: 0, trend: 0, sparkline: [] }
    };

    const markersList = summary?.markers || [];
    const activityFeedList = summary?.activityFeed || [];
    const nearbyIssuesList = summary?.nearbyIssues || [];
    const activeWorkersList = summary?.activeWorkers || [];
    const fieldVehiclesList = summary?.fieldVehicles || [];

    // Tile URLs
    const streetTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const satelliteTileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    if (loading && !summary) {
        return (
            <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ height: '60px', backgroundColor: '#f1f5f9', borderRadius: '12px' }}></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
                    {[...Array(5)].map((_, i) => <div key={i} style={{ height: '90px', backgroundColor: '#f1f5f9', borderRadius: '12px' }}></div>)}
                </div>
                <div style={{ height: '480px', backgroundColor: '#f1f5f9', borderRadius: '12px' }}></div>
            </div>
        );
    }

    return (
        <div style={{ padding: '4px 0 24px 0', color: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif' }}>
            
            {/* Page Header */}
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
                            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                            <line x1="8" y1="2" x2="8" y2="18"/>
                            <line x1="16" y1="6" x2="16" y2="22"/>
                        </svg>
                    </div>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>Live Map</h1>
                        <p style={{ color: '#64748b', margin: '2px 0 0 0', fontSize: '13px' }}>Real-time view of civic issues, field operations, and municipal assets.</p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Period Control */}
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
                            <option value="24h">Last 24 Hours</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="all">All Time</option>
                        </select>
                        <span style={{ fontSize: '11px', color: '#94a3b8', borderLeft: '1px solid #cbd5e1', paddingLeft: '8px' }}>
                            {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={() => fetchLiveMapData(true)}
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

            {/* KPI ROW (5 Cards) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '16px' }}>
                
                {/* Total Issues */}
                <div onClick={() => navigate('/admin/civic')} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
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

                {/* High Priority */}
                <div onClick={() => navigate('/admin/civic?priority=high')} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
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

                {/* Resolved */}
                <div onClick={() => navigate('/admin/civic?status=resolved')} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
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

                {/* Active Workers */}
                <div onClick={() => navigate('/admin/workers')} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
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

                {/* SLA At Risk */}
                <div onClick={() => navigate('/admin/civic?slaRisk=true')} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
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

            {/* FILTER BAR ABOVE MAP */}
            <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    
                    {/* Category Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>🏢</span>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', fontWeight: '500' }}
                        >
                            <option value="all">All Categories</option>
                            <option value="roads">Roads</option>
                            <option value="waste">Waste</option>
                            <option value="water">Water</option>
                            <option value="drainage">Drainage</option>
                            <option value="lighting">Lighting</option>
                            <option value="parks">Parks</option>
                        </select>
                    </div>

                    {/* Priority Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>⚠️</span>
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', fontWeight: '500' }}
                        >
                            <option value="all">All Priorities</option>
                            <option value="high">High Priority</option>
                            <option value="normal">Normal Priority</option>
                            <option value="low">Low Priority</option>
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>⚙️</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', fontWeight: '500' }}
                        >
                            <option value="all">All Status</option>
                            <option value="reported">Reported</option>
                            <option value="assigned">Assigned</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                        </select>
                    </div>

                    {/* Department Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>🏬</span>
                        <select
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', fontWeight: '500' }}
                        >
                            <option value="all">All Departments</option>
                            <option value="roads">Roads Dept</option>
                            <option value="sanitation">Sanitation Dept</option>
                            <option value="water">Water Board</option>
                            <option value="electrical">Electrical Grid</option>
                        </select>
                    </div>

                    {/* Time Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>🕒</span>
                        <select
                            value={timeRangeFilter}
                            onChange={(e) => setTimeRangeFilter(e.target.value)}
                            style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', fontWeight: '500' }}
                        >
                            <option value="24h">Last 24 Hours</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                        </select>
                    </div>
                </div>

                {/* Search Area input & locate button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ position: 'relative' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '9px' }}>
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <input
                            type="text"
                            placeholder="Search this area..."
                            value={searchAreaInput}
                            onChange={(e) => setSearchAreaInput(e.target.value)}
                            style={{ padding: '6px 10px 6px 30px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', width: '160px', outline: 'none' }}
                        />
                    </div>
                    <button
                        onClick={() => fetchLiveMapData(true)}
                        style={{ padding: '6px 10px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                        title="Re-center / Locate area"
                    >
                        🎯
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT GRID: MAP (LEFT 70%) + SIDE PANELS (RIGHT 30%) */}
            <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr', gap: '16px', marginBottom: '20px' }}>
                
                {/* LARGE INTERACTIVE MAP CANVAS */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', height: '520px', position: 'relative' }}>
                    <MapContainer center={[40.7128, -74.0060]} zoom={12} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            attribution='&copy; OpenStreetMap & Esri'
                            url={mapTileType === 'satellite' ? satelliteTileUrl : streetTileUrl}
                        />
                        <MapBoundsComponent markers={markersList} />

                        {/* Render GIS Markers */}
                        {markersList.map((m) => {
                            const color = m.status === 'resolved' || m.status === 'closed'
                                ? '#10b981'
                                : (m.priority === 'urgent' || m.priority === 'high' ? '#ef4444' : '#f59e0b');

                            return (
                                <CircleMarker
                                    key={m.id}
                                    center={[m.lat, m.lng]}
                                    radius={8}
                                    pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 2 }}
                                >
                                    <Popup>
                                        <div style={{ fontSize: '12px', padding: '2px' }}>
                                            <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>{m.title}</div>
                                            <div><strong>Category:</strong> {m.category}</div>
                                            <div><strong>Priority:</strong> <span style={{ textTransform: 'capitalize', color }}>{m.priority}</span></div>
                                            <div><strong>Status:</strong> {m.status}</div>
                                            <div><strong>Location:</strong> {m.location}</div>
                                            <button
                                                onClick={() => navigate(`/admin/civic?highlight=${m.id}`)}
                                                style={{
                                                    marginTop: '8px',
                                                    width: '100%',
                                                    backgroundColor: '#2563eb',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '5px 10px',
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

                    {/* MAP LEGEND OVERLAY (Bottom-Left) */}
                    <div style={{
                        position: 'absolute',
                        bottom: '16px',
                        left: '16px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 999,
                        fontSize: '11px',
                        lineHeight: '1.6'
                    }}>
                        <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>Map Legend</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
                                <span>High Priority Issue</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
                                <span>Medium Priority Issue</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3b82f6' }}></span>
                                <span>Low Priority Issue</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                                <span>Resolved Issue</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '12px' }}>👤</span>
                                <span>Field Worker</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '12px' }}>🚚</span>
                                <span>Field Vehicle</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '12px' }}>⚡</span>
                                <span>Active Intervention</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#dc2626', color: 'white', fontSize: '8px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>12</span>
                                <span>Issue Cluster</span>
                            </div>
                        </div>
                    </div>

                    {/* MAP / SATELLITE TOGGLE BUTTONS (Bottom-Right) */}
                    <div style={{
                        position: 'absolute',
                        bottom: '16px',
                        right: '16px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '3px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 999,
                        display: 'flex',
                        gap: '2px'
                    }}>
                        <button
                            onClick={() => setMapTileType('map')}
                            style={{
                                padding: '6px 14px',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '700',
                                backgroundColor: mapTileType === 'map' ? '#2563eb' : 'transparent',
                                color: mapTileType === 'map' ? '#ffffff' : '#64748b',
                                cursor: 'pointer'
                            }}
                        >
                            Map
                        </button>
                        <button
                            onClick={() => setMapTileType('satellite')}
                            style={{
                                padding: '6px 14px',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '700',
                                backgroundColor: mapTileType === 'satellite' ? '#2563eb' : 'transparent',
                                color: mapTileType === 'satellite' ? '#ffffff' : '#64748b',
                                cursor: 'pointer'
                            }}
                        >
                            Satellite
                        </button>
                    </div>
                </div>

                {/* RIGHT SIDE PANELS: Live Activity Feed + Nearby Issues */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Live Activity Feed */}
                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: '#2563eb' }}>⚡</span>
                                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Live Activity Feed</h3>
                            </div>
                            <span onClick={() => navigate('/admin/notifications')} style={{ fontSize: '11px', color: '#2563eb', fontWeight: '600', cursor: 'pointer' }}>View All →</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '200px' }}>
                            {activityFeedList.map((act) => (
                                <div key={act.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '11px' }}>
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>
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

                    {/* Nearby Issues */}
                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: '#2563eb' }}>📍</span>
                                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Nearby Issues</h3>
                            </div>
                            <span onClick={() => navigate('/admin/civic')} style={{ fontSize: '11px', color: '#2563eb', fontWeight: '600', cursor: 'pointer' }}>View All →</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '200px' }}>
                            {nearbyIssuesList.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => navigate(`/admin/civic?highlight=${item.id}`)}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '6px', border: '1px solid #f1f5f9', cursor: 'pointer' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '14px' }}>{item.priority === 'high' || item.priority === 'urgent' ? '🚨' : '🟡'}</span>
                                        <div>
                                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>{item.title}</div>
                                            <div style={{ fontSize: '10px', color: '#64748b' }}>{item.category} • <span style={{ textTransform: 'capitalize' }}>{item.priority}</span> • {item.status}</div>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                                        {item.distanceKm} km
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* BOTTOM TABLES ROW: ACTIVE FIELD WORKERS + FIELD VEHICLES */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                
                {/* Active Field Workers Table */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: '#2563eb' }}>👷</span>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Active Field Workers</h3>
                            </div>
                        </div>
                        <span onClick={() => navigate('/admin/workers')} style={{ fontSize: '12px', color: '#2563eb', fontWeight: '600', cursor: 'pointer' }}>View All →</span>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600' }}>
                                    <th style={{ padding: '10px 14px' }}>Name</th>
                                    <th style={{ padding: '10px 14px' }}>Role</th>
                                    <th style={{ padding: '10px 14px' }}>Status</th>
                                    <th style={{ padding: '10px 14px' }}>Location</th>
                                    <th style={{ padding: '10px 14px' }}>Last Update</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeWorkersList.map((worker) => {
                                    const initials = worker.name ? worker.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'FW';
                                    const isOnDuty = worker.rawStatus === 'on_duty' || worker.status === 'On Duty';

                                    return (
                                        <tr key={worker.id} onClick={() => navigate('/admin/workers')} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                                            <td style={{ padding: '10px 14px', fontWeight: '600', color: '#0f172a' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#e2e8f0', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700' }}>
                                                        {initials}
                                                    </div>
                                                    <span>{worker.name}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '10px 14px', color: '#475569' }}>{worker.role}</td>
                                            <td style={{ padding: '10px 14px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', backgroundColor: isOnDuty ? '#ecfdf5' : '#fffbeb', color: isOnDuty ? '#047857' : '#b45309' }}>
                                                    {worker.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 14px', color: '#64748b' }}>{worker.location}</td>
                                            <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{formatRelativeTime(worker.lastUpdate)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Field Vehicles Table */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: '#2563eb' }}>🚚</span>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Field Vehicles</h3>
                            </div>
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600' }}>
                                    <th style={{ padding: '10px 14px' }}>Vehicle ID</th>
                                    <th style={{ padding: '10px 14px' }}>Type</th>
                                    <th style={{ padding: '10px 14px' }}>Status</th>
                                    <th style={{ padding: '10px 14px' }}>Location</th>
                                    <th style={{ padding: '10px 14px' }}>Last Update</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fieldVehiclesList.map((v) => {
                                    const isActive = v.status === 'Active';
                                    const isIdle = v.status === 'Idle';

                                    return (
                                        <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: '700', color: '#2563eb' }}>{v.vehicleId}</td>
                                            <td style={{ padding: '10px 14px', color: '#475569' }}>{v.type}</td>
                                            <td style={{ padding: '10px 14px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', backgroundColor: isActive ? '#ecfdf5' : isIdle ? '#eff6ff' : '#fffbeb', color: isActive ? '#047857' : isIdle ? '#1d4ed8' : '#b45309' }}>
                                                    {v.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 14px', color: '#64748b' }}>{v.location}</td>
                                            <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{formatRelativeTime(v.lastUpdate)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveMapCenter;
