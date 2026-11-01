import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

// Helper to auto-fit map bounds
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

// SVG Donut Chart Component
const DonutChart = ({ segments = [], total = 0 }) => {
    let cumulativePercent = 0;

    const getCoordinatesForPercent = (percent) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    return (
        <div style={{ position: 'relative', width: '150px', height: '150px', margin: '0 auto' }}>
            <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                {segments.map((seg, i) => {
                    const startPercent = cumulativePercent;
                    const slicePercent = (seg.percentage || 1) / 100;
                    cumulativePercent += slicePercent;
                    const endPercent = cumulativePercent;

                    const [startX, startY] = getCoordinatesForPercent(startPercent);
                    const [endX, endY] = getCoordinatesForPercent(endPercent);
                    const largeArcFlag = slicePercent > 0.5 ? 1 : 0;

                    const pathData = [
                        `M ${startX} ${startY}`,
                        `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                        `L 0 0`,
                    ].join(' ');

                    return <path key={i} d={pathData} fill={seg.color} />;
                })}
                <circle cx="0" cy="0" r="0.65" fill="#ffffff" />
            </svg>
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
                <span style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>{total}</span>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '500', textTransform: 'uppercase' }}>Active Ops</span>
            </div>
        </div>
    );
};

const LiveOperationsCenter = () => {
    const navigate = useNavigate();

    // Data State
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [workersList, setWorkersList] = useState([]);
    const [lastRefreshed, setLastRefreshed] = useState(new Date());

    // Filters
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [teamFilter, setTeamFilter] = useState('all');
    const [timeRangeFilter, setTimeRangeFilter] = useState('24h');

    // Layer Controls
    const [layers, setLayers] = useState({
        activeOperations: true,
        fieldWorkers: true,
        fieldVehicles: true,
        incidents: true,
        criticalOperations: true,
        teamLocations: true,
        cityBoundary: false
    });

    // Modals
    const [modalState, setModalState] = useState({
        type: null, // 'create', 'dispatch', 'assignVehicle', 'status'
        data: null
    });
    const [formData, setFormData] = useState({});

    // Fetch Backend Data
    const fetchSummary = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const queryParams = new URLSearchParams({
                category: categoryFilter,
                status: statusFilter,
                team: teamFilter,
                timeRange: timeRangeFilter
            }).toString();

            const [summaryRes, workersRes] = await Promise.all([
                api.get(`/admin/live-operations/summary?${queryParams}`),
                api.get('/admin/workers')
            ]);

            if (summaryRes.data && summaryRes.data.data) {
                setData(summaryRes.data.data);
            }
            if (workersRes.data) {
                setWorkersList(workersRes.data);
            }
            setLastRefreshed(new Date());
        } catch (err) {
            console.error('Error loading Live Operations data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [categoryFilter, statusFilter, teamFilter, timeRangeFilter]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    // Quick Action Handlers
    const handleCreateOperation = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/live-operations/create-operation', formData);
            setModalState({ type: null, data: null });
            setFormData({});
            fetchSummary(true);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to create operation');
        }
    };

    const handleDispatchTeam = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/live-operations/dispatch', formData);
            setModalState({ type: null, data: null });
            setFormData({});
            fetchSummary(true);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to dispatch team');
        }
    };

    const handleAssignVehicle = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/live-operations/assign-vehicle', formData);
            setModalState({ type: null, data: null });
            setFormData({});
            fetchSummary(true);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to assign vehicle');
        }
    };

    const handleExport = () => {
        window.open(`/api/admin/command-center/export?format=csv`, '_blank');
    };

    if (loading && !data) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #cbd5e1', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            </div>
        );
    }

    const {
        kpis = {},
        operationStatusDonut = { segments: [], total: 0 },
        teamDeployment = [],
        mapMarkers = [],
        activityFeed = [],
        activeFieldTeams = {},
        activeOperationsBreakdown = {},
        ongoingOperations = [],
        fieldVehicles = [],
        weatherData = {}
    } = data || {};

    // Filter map markers according to active layer checkboxes
    const filteredMarkers = mapMarkers.filter(m => {
        if (m.type === 'operation' && !layers.activeOperations) return false;
        if (m.type === 'worker' && !layers.fieldWorkers) return false;
        if (m.type === 'vehicle' && !layers.fieldVehicles) return false;
        if (m.type === 'incident' && !layers.incidents) return false;
        if (m.type === 'critical' && !layers.criticalOperations) return false;
        return true;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Inter, system-ui, sans-serif', color: '#0f172a', paddingBottom: '40px' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '16px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', color: '#2563eb' }}>
                        ⚡
                    </div>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Live Operations</h1>
                        <p style={{ color: '#64748b', margin: '2px 0 0 0', fontSize: '13px' }}>Real-time monitoring of field operations, resource deployment, and incident response.</p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#475569', fontWeight: '600' }}>
                        📅 {lastRefreshed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <button
                        onClick={() => fetchSummary(true)}
                        disabled={refreshing}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}
                    >
                        🔄 {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <button
                        onClick={handleExport}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#2563eb', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: '#ffffff', cursor: 'pointer' }}
                    >
                        📥 Export
                    </button>
                </div>
            </div>

            {/* KPI Cards Row (5 Cards) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                
                {/* 1. Active Operations */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>✓</div>
                        <Sparkline data={kpis.activeOperations?.sparkline} color="#16a34a" />
                    </div>
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>{kpis.activeOperations?.count || 0}</div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Active Operations</div>
                        <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600', marginTop: '2px' }}>{kpis.activeOperations?.trend}</div>
                    </div>
                </div>

                {/* 2. In Progress */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🕒</div>
                        <Sparkline data={kpis.inProgress?.sparkline} color="#ea580c" />
                    </div>
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>{kpis.inProgress?.count || 0}</div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>In Progress</div>
                        <div style={{ fontSize: '11px', color: '#ea580c', fontWeight: '600', marginTop: '2px' }}>{kpis.inProgress?.trend}</div>
                    </div>
                </div>

                {/* 3. Field Vehicles */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🚚</div>
                        <Sparkline data={kpis.fieldVehicles?.sparkline} color="#0284c7" />
                    </div>
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>{kpis.fieldVehicles?.count || 0}</div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Field Vehicles</div>
                        <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: '600', marginTop: '2px' }}>{kpis.fieldVehicles?.trend}</div>
                    </div>
                </div>

                {/* 4. Active Workers */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>👷</div>
                        <Sparkline data={kpis.activeWorkers?.sparkline} color="#d97706" />
                    </div>
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>{kpis.activeWorkers?.count || 0}</div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Active Workers</div>
                        <div style={{ fontSize: '11px', color: '#d97706', fontWeight: '600', marginTop: '2px' }}>{kpis.activeWorkers?.trend}</div>
                    </div>
                </div>

                {/* 5. Critical Operations */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>⚠️</div>
                        <Sparkline data={kpis.criticalOperations?.sparkline} color="#dc2626" />
                    </div>
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>{kpis.criticalOperations?.count || 0}</div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Critical Operations</div>
                        <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '600', marginTop: '2px' }}>{kpis.criticalOperations?.trend}</div>
                    </div>
                </div>

            </div>

            {/* Middle Section: GIS Map + Status / Team Breakdown + Live Feed / Weather */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px' }}>
                
                {/* 1. GIS Live Map */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#2563eb', fontSize: '18px' }}>📍</span>
                            <div>
                                <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: '#0f172a' }}>Live Operations Map</h3>
                                <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Real-time view of active operations, field teams, vehicles, and incidents.</p>
                            </div>
                        </div>

                        {/* Map Filters Bar */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#334155' }}>
                                <option value="all">All Operations</option>
                                <option value="Roads">Roads</option>
                                <option value="Waste">Waste Management</option>
                                <option value="Water">Water & Sewer</option>
                                <option value="Lighting">Public Lighting</option>
                            </select>
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#334155' }}>
                                <option value="all">All Status</option>
                                <option value="in_progress">In Progress</option>
                                <option value="assigned">Scheduled</option>
                                <option value="verified">On Hold</option>
                            </select>
                            <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#334155' }}>
                                <option value="all">All Teams</option>
                                <option value="Roads">Team A (Roads)</option>
                                <option value="Waste">Team B (Waste)</option>
                                <option value="Water">Team C (Water)</option>
                            </select>
                            <select value={timeRangeFilter} onChange={(e) => setTimeRangeFilter(e.target.value)} style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#334155' }}>
                                <option value="24h">Last 24 Hours</option>
                                <option value="7d">Last 7 Days</option>
                                <option value="30d">Last 30 Days</option>
                            </select>
                        </div>
                    </div>

                    {/* Leaflet Map Container */}
                    <div style={{ height: '420px', width: '100%', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                        <MapContainer center={[12.9716, 77.5946]} zoom={12} style={{ height: '100%', width: '100%' }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                            <MapBoundsComponent markers={filteredMarkers} />
                            {filteredMarkers.map(marker => (
                                <CircleMarker
                                    key={marker.id}
                                    center={[marker.lat, marker.lng]}
                                    radius={marker.type === 'critical' ? 12 : marker.type === 'worker' ? 8 : 10}
                                    pathOptions={{
                                        color: marker.type === 'critical' ? '#dc2626' : marker.type === 'worker' ? '#d97706' : marker.type === 'vehicle' ? '#0284c7' : '#16a34a',
                                        fillColor: marker.type === 'critical' ? '#ef4444' : marker.type === 'worker' ? '#f59e0b' : marker.type === 'vehicle' ? '#38bdf8' : '#22c55e',
                                        fillOpacity: 0.8
                                    }}
                                >
                                    <Popup>
                                        <div style={{ fontSize: '12px', minWidth: '160px' }}>
                                            <strong style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>{marker.title}</strong>
                                            <div>Category: {marker.category}</div>
                                            <div>Status: <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{marker.status}</span></div>
                                            <div>Location: {marker.locationName}</div>
                                            <div>Assigned: {marker.assignedTo}</div>
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            ))}
                        </MapContainer>

                        {/* Map Layers Floating Overlay Box */}
                        <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(4px)',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            zIndex: 1000,
                            fontSize: '11px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                        }}>
                            <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '2px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>Map Layers</div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={layers.activeOperations} onChange={(e) => setLayers({ ...layers, activeOperations: e.target.checked })} />
                                <span style={{ color: '#16a34a' }}>●</span> Active Operations
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={layers.fieldWorkers} onChange={(e) => setLayers({ ...layers, fieldWorkers: e.target.checked })} />
                                <span style={{ color: '#d97706' }}>●</span> Field Workers
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={layers.fieldVehicles} onChange={(e) => setLayers({ ...layers, fieldVehicles: e.target.checked })} />
                                <span style={{ color: '#0284c7' }}>●</span> Field Vehicles
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={layers.criticalOperations} onChange={(e) => setLayers({ ...layers, criticalOperations: e.target.checked })} />
                                <span style={{ color: '#dc2626' }}>●</span> Critical Operations
                            </label>
                        </div>
                    </div>
                </div>

                {/* 2. Operation Status Donut + Team Deployment Progress */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Operation Status */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: '#0f172a' }}>Operation Status</h3>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>Last 24 Hours</span>
                        </div>
                        <DonutChart segments={operationStatusDonut.segments} total={operationStatusDonut.total} />
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px', fontSize: '11px' }}>
                            {operationStatusDonut.segments.map((seg, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: seg.color }}></span>
                                        <span style={{ color: '#334155' }}>{seg.name}</span>
                                    </div>
                                    <span style={{ fontWeight: '700', color: '#0f172a' }}>{seg.count} ({seg.percentage}%)</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Team Deployment */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', flex: 1 }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 12px 0', color: '#0f172a' }}>Team Deployment</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {teamDeployment.map((team, idx) => (
                                <div key={idx} style={{ fontSize: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: '600', color: '#334155' }}>{team.name}</span>
                                        <span style={{ color: '#64748b', fontSize: '11px' }}>{team.count} ({team.percentage}%)</span>
                                    </div>
                                    <div style={{ height: '6px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${team.percentage}%`, backgroundColor: ['#2563eb', '#10b981', '#06b6d4', '#f59e0b', '#8b5cf6', '#64748b'][idx % 6] }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* 3. Live Feed + Weather Conditions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Live Operations Feed */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: '#0f172a' }}>Live Operations Feed</h3>
                            <button onClick={() => navigate('/admin/civic')} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>View All →</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '220px' }}>
                            {activityFeed.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                                        ⚡
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>{item.title}</div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>{item.location}</div>
                                    </div>
                                    <span style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Weather & Live Conditions */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 12px 0', color: '#0f172a' }}>Weather & Live Conditions</h3>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '28px' }}>⛅</span>
                                <div>
                                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{weatherData.temp || '28°C'}</div>
                                    <div style={{ fontSize: '11px', color: '#64748b' }}>{weatherData.condition || 'Partly Cloudy'}</div>
                                </div>
                            </div>
                            <div style={{ fontSize: '11px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                                <div>Humidity: <strong>{weatherData.humidity || '62%'}</strong></div>
                                <div>Wind: <strong>{weatherData.wind || '12 km/h'}</strong></div>
                                <div>Air Quality: <strong style={{ color: '#16a34a' }}>{weatherData.airQuality || 'Good'}</strong></div>
                            </div>
                        </div>
                    </div>

                </div>

            </div>

            {/* Lower Middle Row: Active Field Teams, Active Operations, Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                
                {/* 1. Active Field Teams */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: '#0f172a' }}>Active Field Teams</h3>
                        <button onClick={() => navigate('/admin/workers')} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>View All →</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
                        <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a' }}>{activeFieldTeams.onDuty || 0}</div>
                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>On Duty</div>
                        </div>
                        <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#d97706' }}>{activeFieldTeams.onBreak || 0}</div>
                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>On Break</div>
                        </div>
                        <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#64748b' }}>{activeFieldTeams.offDuty || 0}</div>
                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>Off Duty</div>
                        </div>
                        <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#dc2626' }}>{activeFieldTeams.delayed || 0}</div>
                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>Delayed</div>
                        </div>
                    </div>
                </div>

                {/* 2. Active Operations */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: '#0f172a' }}>Active Operations</h3>
                        <button onClick={() => navigate('/admin/civic')} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>View All →</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
                        <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#2563eb' }}>{activeOperationsBreakdown.total || 0}</div>
                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>Total</div>
                        </div>
                        <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#ea580c' }}>{activeOperationsBreakdown.inProgress || 0}</div>
                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>In Progress</div>
                        </div>
                        <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a' }}>{activeOperationsBreakdown.completed || 0}</div>
                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>Completed</div>
                        </div>
                        <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#dc2626' }}>{activeOperationsBreakdown.critical || 0}</div>
                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>Critical</div>
                        </div>
                    </div>
                </div>

                {/* 3. Quick Actions */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 12px 0', color: '#0f172a' }}>Quick Actions</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button onClick={() => setModalState({ type: 'create', data: null })} style={{ padding: '8px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '11px', fontWeight: '600', color: '#1e293b', cursor: 'pointer', textAlign: 'left' }}>
                            ➕ Create Operation
                        </button>
                        <button onClick={() => setModalState({ type: 'dispatch', data: null })} style={{ padding: '8px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '11px', fontWeight: '600', color: '#1e293b', cursor: 'pointer', textAlign: 'left' }}>
                            ⚡ Dispatch Team
                        </button>
                        <button onClick={() => setModalState({ type: 'assignVehicle', data: null })} style={{ padding: '8px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '11px', fontWeight: '600', color: '#1e293b', cursor: 'pointer', textAlign: 'left' }}>
                            🚚 Assign Vehicle
                        </button>
                        <button onClick={() => navigate('/admin/live-map')} style={{ padding: '8px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '11px', fontWeight: '600', color: '#1e293b', cursor: 'pointer', textAlign: 'left' }}>
                            👁 View Live Map
                        </button>
                        <button onClick={handleExport} style={{ padding: '8px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '11px', fontWeight: '600', color: '#1e293b', cursor: 'pointer', textAlign: 'left' }}>
                            📊 Generate Report
                        </button>
                        <button onClick={() => setModalState({ type: 'status', data: null })} style={{ padding: '8px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '11px', fontWeight: '600', color: '#1e293b', cursor: 'pointer', textAlign: 'left' }}>
                            ⚙ System Status
                        </button>
                    </div>
                </div>

            </div>

            {/* Bottom Row: Ongoing Operations Table + Field Vehicles Table */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                {/* 1. Ongoing Operations Table */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                            <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: '#0f172a' }}>Ongoing Operations</h3>
                            <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Operations currently in progress.</p>
                        </div>
                        <button onClick={() => navigate('/admin/civic')} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>View All →</button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                                    <th style={{ padding: '8px' }}>ID</th>
                                    <th style={{ padding: '8px' }}>Operation</th>
                                    <th style={{ padding: '8px' }}>Category</th>
                                    <th style={{ padding: '8px' }}>Location</th>
                                    <th style={{ padding: '8px' }}>Team</th>
                                    <th style={{ padding: '8px' }}>Status</th>
                                    <th style={{ padding: '8px' }}>ETA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ongoingOperations.map((op, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '8px', color: '#2563eb', fontWeight: '600' }}>{op.id}</td>
                                        <td style={{ padding: '8px', fontWeight: '600', color: '#0f172a' }}>{op.operation}</td>
                                        <td style={{ padding: '8px', color: '#64748b' }}>{op.category}</td>
                                        <td style={{ padding: '8px', color: '#64748b' }}>{op.location}</td>
                                        <td style={{ padding: '8px', color: '#64748b' }}>{op.team}</td>
                                        <td style={{ padding: '8px' }}>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '700',
                                                backgroundColor: op.status === 'In Progress' ? '#ffedd5' : '#e0f2fe',
                                                color: op.status === 'In Progress' ? '#ea580c' : '#0284c7'
                                            }}>
                                                {op.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '8px', color: '#64748b' }}>{op.eta}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. Field Vehicles Table */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                            <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: '#0f172a' }}>Field Vehicles</h3>
                            <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Real-time status of municipal vehicles.</p>
                        </div>
                        <button onClick={() => navigate('/admin/workers')} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>View All →</button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                                    <th style={{ padding: '8px' }}>Vehicle ID</th>
                                    <th style={{ padding: '8px' }}>Type</th>
                                    <th style={{ padding: '8px' }}>Team</th>
                                    <th style={{ padding: '8px' }}>Status</th>
                                    <th style={{ padding: '8px' }}>Location</th>
                                    <th style={{ padding: '8px' }}>Last Update</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fieldVehicles.map((v, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '8px', color: '#0f172a', fontWeight: '700' }}>{v.vehicleId}</td>
                                        <td style={{ padding: '8px', color: '#64748b' }}>{v.type}</td>
                                        <td style={{ padding: '8px', color: '#64748b' }}>{v.team}</td>
                                        <td style={{ padding: '8px' }}>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '700',
                                                backgroundColor: v.status === 'Active' ? '#dcfce7' : v.status === 'Idle' ? '#f1f5f9' : '#fef3c7',
                                                color: v.status === 'Active' ? '#16a34a' : v.status === 'Idle' ? '#64748b' : '#d97706'
                                            }}>
                                                {v.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '8px', color: '#64748b' }}>{v.location}</td>
                                        <td style={{ padding: '8px', color: '#64748b' }}>{v.lastUpdate}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Quick Action Modals */}
            {modalState.type && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#0f172a' }}>
                                {modalState.type === 'create' && '➕ Create New Operation'}
                                {modalState.type === 'dispatch' && '⚡ Dispatch Field Team'}
                                {modalState.type === 'assignVehicle' && '🚚 Assign Field Vehicle'}
                                {modalState.type === 'status' && '⚙ System Status Overview'}
                            </h3>
                            <button onClick={() => setModalState({ type: null, data: null })} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                        </div>

                        {modalState.type === 'create' && (
                            <form onSubmit={handleCreateOperation} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Operation Title</label>
                                    <input required type="text" onChange={(e) => setFormData({ ...formData, title: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} placeholder="e.g. Drainage Pipe Repair" />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Description</label>
                                    <textarea required onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', height: '60px' }} placeholder="Provide operational instructions..." />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Location</label>
                                    <input required type="text" onChange={(e) => setFormData({ ...formData, location: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} placeholder="e.g. Riverside District, Gate 4" />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Department</label>
                                        <select onChange={(e) => setFormData({ ...formData, department: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}>
                                            <option value="Roads">Roads</option>
                                            <option value="Waste">Waste</option>
                                            <option value="Water">Water</option>
                                            <option value="Parks">Parks</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Priority</label>
                                        <select onChange={(e) => setFormData({ ...formData, priority: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}>
                                            <option value="normal">Normal</option>
                                            <option value="high">High</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                    </div>
                                </div>
                                <button type="submit" style={{ marginTop: '12px', padding: '10px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Create & Launch Operation</button>
                            </form>
                        )}

                        {modalState.type === 'dispatch' && (
                            <form onSubmit={handleDispatchTeam} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Select Operation</label>
                                    <select required onChange={(e) => setFormData({ ...formData, issueId: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}>
                                        <option value="">-- Choose Operation --</option>
                                        {ongoingOperations.map(op => (
                                            <option key={op.issueId} value={op.issueId}>{op.id}: {op.operation}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Dispatch Worker/Leader</label>
                                    <select required onChange={(e) => setFormData({ ...formData, workerId: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}>
                                        <option value="">-- Select Field Worker --</option>
                                        {workersList.map(w => (
                                            <option key={w._id} value={w._id}>{w.name} ({w.department || 'General'})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Dispatch Instructions / Notes</label>
                                    <textarea onChange={(e) => setFormData({ ...formData, notes: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', height: '60px' }} placeholder="Urgent response needed..." />
                                </div>
                                <button type="submit" style={{ marginTop: '12px', padding: '10px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Confirm Dispatch</button>
                            </form>
                        )}

                        {modalState.type === 'assignVehicle' && (
                            <form onSubmit={handleAssignVehicle} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Select Vehicle</label>
                                    <select required onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}>
                                        <option value="">-- Choose Vehicle --</option>
                                        {fieldVehicles.map(v => (
                                            <option key={v.vehicleId} value={v.vehicleId}>{v.vehicleId} ({v.type}) - {v.team}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Assign To Operation</label>
                                    <select required onChange={(e) => setFormData({ ...formData, issueId: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}>
                                        <option value="">-- Select Operation --</option>
                                        {ongoingOperations.map(op => (
                                            <option key={op.issueId} value={op.issueId}>{op.id}: {op.operation}</option>
                                        ))}
                                    </select>
                                </div>
                                <button type="submit" style={{ marginTop: '12px', padding: '10px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Assign Vehicle</button>
                            </form>
                        )}

                        {modalState.type === 'status' && (
                            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                                    <span>Database Engine:</span> <strong style={{ color: '#16a34a' }}>Healthy (MongoDB)</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                                    <span>GIS Map Services:</span> <strong style={{ color: '#16a34a' }}>Online (OpenStreetMap)</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                                    <span>Live Data Feed Stream:</span> <strong style={{ color: '#16a34a' }}>Active (Polling)</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                                    <span>System Latency:</span> <strong>24 ms</strong>
                                </div>
                                <button onClick={() => setModalState({ type: null, data: null })} style={{ marginTop: '8px', padding: '8px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Close Overview</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveOperationsCenter;
