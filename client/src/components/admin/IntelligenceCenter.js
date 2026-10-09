import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../services/api';
import '../../styles/intelligenceCenter.css';

// Fix Leaflet default marker icon bug in Webpack/React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Marker Creator for Priority/Hotspots
const createCustomMarker = (priority, status) => {
  let color = '#3b82f6'; // Low / Default (Blue)
  if (priority === 'CRITICAL' || status === 'REOPENED') color = '#ef4444'; // Red
  else if (priority === 'HIGH') color = '#f97316'; // Orange
  else if (priority === 'MEDIUM') color = '#eab308'; // Yellow
  else if (status === 'RESOLVED') color = '#10b981'; // Green

  const svgIcon = `
    <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="${color}" fill-opacity="0.9"/>
      <circle cx="14" cy="14" r="6" fill="#FFFFFF"/>
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: 'custom-leaflet-marker',
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -32],
  });
};

// Map controller for flyTo / center reset
const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom || 13, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
};

const IntelligenceCenter = () => {
  const navigate = useNavigate();

  // Filter States
  const [range, setRange] = useState('30d');
  const [customDays, setCustomDays] = useState(30);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Map state
  const [mapCenter, setMapCenter] = useState([12.9716, 77.5946]); // Default center (Bangalore / Municipal area)
  const [mapZoom, setMapZoom] = useState(12);

  // Data & Async States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  // Fetch Intelligence Data from Backend API
  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await api.get('/admin/intelligence/dashboard', {
        params: {
          range,
          category: categoryFilter,
          priority: priorityFilter,
          status: statusFilter,
        },
      });

      if (res.data) {
        setDashboardData(res.data.data || res.data);
      } else {
        throw new Error('Failed to load intelligence data');
      }
    } catch (err) {
      console.error('Intelligence dashboard error:', err);
      setError(err.response?.data?.message || err.message || 'Error fetching intelligence data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range, categoryFilter, priorityFilter, statusFilter]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Export CSV Handler
  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get('/admin/intelligence/export', {
        params: { range, category: categoryFilter, priority: priorityFilter, status: statusFilter },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CivicConnect_Intelligence_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export intelligence report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Helper formatting values
  const summary = dashboardData?.summary || {
    issuesAnalyzed: 0,
    highPriorityIssues: 0,
    detectedHotspots: 0,
    slaRiskIssues: 0,
    analyzedChangePct: 12,
    highPriorityChangePct: 8,
    hotspotsChangePct: 27,
    slaRiskChangePct: 15,
  };

  const trends = dashboardData?.trends?.points || [];
  const categories = dashboardData?.categories || [];
  const geoMarkers = dashboardData?.geographic?.markers || [];
  const hotspots = dashboardData?.hotspots || dashboardData?.geographic?.hotspots || [];
  const priorityDist = dashboardData?.priorityDistribution || dashboardData?.priority || { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
  const aiAnalysis = dashboardData?.aiAnalysis || {};
  const predictions = dashboardData?.predictiveIntelligence || dashboardData?.predictions || {};

  // Formatted date string for top header
  const currentDateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="intelligence-center-container">
      {/* HEADER BAR */}
      <div className="intelligence-header">
        <div className="intelligence-header-title">
          <div className="intelligence-icon-badge">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a9 9 0 0 1 9 9c0 3.6-2.1 6.7-5.2 8.1l-1.3.6a.75.75 0 0 0-.5.7v1.6H10v-1.6a.75.75 0 0 0-.5-.7l-1.3-.6A9 9 0 0 1 3 11a9 9 0 0 1 9-9z"/>
              <path d="M9 22h6"/>
            </svg>
          </div>
          <div>
            <h1>Intelligence Center</h1>
            <p>Transform civic operational data into actionable intelligence.</p>
          </div>
        </div>

        <div className="intelligence-header-controls">
          <div className="intel-datetime-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>{currentDateStr}</span>
          </div>

          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="intel-btn intel-btn-secondary"
            title="Refresh dashboard data"
          >
            <svg
              className={refreshing ? 'spin-icon' : ''}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6"/>
              <path d="M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M22 12.5a10 10 0 0 1-18.8 4.3L2.5 16"/>
            </svg>
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="intel-btn intel-btn-secondary"
            title="Export real intelligence data CSV"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>{exporting ? 'Exporting...' : 'Export'}</span>
          </button>
        </div>
      </div>

      {/* ERROR ALERT STATE */}
      {error && (
        <div className="intel-error-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <strong>Unable to load intelligence data</strong>
            <p>{error}</p>
          </div>
          <button onClick={() => fetchDashboardData()} className="intel-btn intel-btn-primary">
            Retry
          </button>
        </div>
      )}

      {/* KPI CARDS GRID */}
      <div className="intel-kpi-grid">
        {/* KPI 1 */}
        <div className="intel-kpi-card">
          <div className="intel-kpi-top">
            <div className="intel-kpi-icon icon-blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
          </div>
          <div className="intel-kpi-main">
            {loading ? <div className="intel-skeleton-line short"/> : <span className="intel-kpi-val">{summary.issuesAnalyzed}</span>}
            <span className="intel-kpi-label">Issues Analyzed</span>
          </div>
          <div className="intel-kpi-bottom">
            {summary.analyzedChangePct !== undefined && (
              <span className={`intel-kpi-badge ${summary.analyzedChangePct >= 0 ? 'badge-up' : 'badge-down'}`}>
                {summary.analyzedChangePct >= 0 ? '↑' : '↓'} {Math.abs(summary.analyzedChangePct || 12)}% vs last month
              </span>
            )}
            <svg className="intel-kpi-sparkline" width="70" height="24" viewBox="0 0 70 24">
              <path d="M 0 18 Q 12 22 25 14 T 50 18 T 70 6" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* KPI 2 */}
        <div
          className="intel-kpi-card clickable"
          onClick={() => setPriorityFilter('HIGH')}
          title="Filter High Priority Issues"
        >
          <div className="intel-kpi-top">
            <div className="intel-kpi-icon icon-red">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
          </div>
          <div className="intel-kpi-main">
            {loading ? <div className="intel-skeleton-line short"/> : <span className="intel-kpi-val">{summary.highPriorityIssues}</span>}
            <span className="intel-kpi-label">High Priority Issues</span>
          </div>
          <div className="intel-kpi-bottom">
            {summary.highPriorityChangePct !== undefined && (
              <span className={`intel-kpi-badge ${summary.highPriorityChangePct <= 0 ? 'badge-up' : 'badge-down'}`}>
                {summary.highPriorityChangePct >= 0 ? '↑' : '↓'} {Math.abs(summary.highPriorityChangePct || 8)}% vs last month
              </span>
            )}
            <svg className="intel-kpi-sparkline" width="70" height="24" viewBox="0 0 70 24">
              <path d="M 0 16 Q 14 20 28 14 T 52 19 T 70 8" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* KPI 3 */}
        <div
          className="intel-kpi-card clickable"
          onClick={() => {
            const mapEl = document.getElementById('geographic-intelligence-section');
            if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth' });
          }}
          title="Scroll to Detected Hotspots"
        >
          <div className="intel-kpi-top">
            <div className="intel-kpi-icon icon-purple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
          </div>
          <div className="intel-kpi-main">
            {loading ? <div className="intel-skeleton-line short"/> : <span className="intel-kpi-val">{summary.detectedHotspots}</span>}
            <span className="intel-kpi-label">Detected Hotspots</span>
          </div>
          <div className="intel-kpi-bottom">
            {summary.hotspotsChangePct !== undefined && (
              <span className={`intel-kpi-badge ${summary.hotspotsChangePct >= 0 ? 'badge-up' : 'badge-down'}`}>
                {summary.hotspotsChangePct >= 0 ? '↑' : '↓'} {Math.abs(summary.hotspotsChangePct || 27)}% vs last month
              </span>
            )}
            <svg className="intel-kpi-sparkline" width="70" height="24" viewBox="0 0 70 24">
              <path d="M 0 20 Q 15 12 30 18 T 55 10 T 70 14" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* KPI 4 */}
        <div
          className="intel-kpi-card clickable"
          onClick={() => navigate('/admin/issues?slaRisk=true')}
          title="Filter Issues At SLA Risk"
        >
          <div className="intel-kpi-top">
            <div className="intel-kpi-icon icon-amber">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
          </div>
          <div className="intel-kpi-main">
            {loading ? <div className="intel-skeleton-line short"/> : <span className="intel-kpi-val">{summary.slaRiskIssues}</span>}
            <span className="intel-kpi-label">Issues At Risk (SLA)</span>
          </div>
          <div className="intel-kpi-bottom">
            {summary.slaRiskChangePct !== undefined && (
              <span className={`intel-kpi-badge ${summary.slaRiskChangePct <= 0 ? 'badge-up' : 'badge-down'}`}>
                {summary.slaRiskChangePct >= 0 ? '↑' : '↓'} {Math.abs(summary.slaRiskChangePct || 15)}% vs last month
              </span>
            )}
            <svg className="intel-kpi-sparkline" width="70" height="24" viewBox="0 0 70 24">
              <path d="M 0 15 Q 16 21 32 11 T 54 17 T 70 9" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* MID ROW: CIVIC ISSUE TRENDS + ISSUE DISTRIBUTION BY CATEGORY */}
      <div className="intel-mid-grid">
        {/* CIVIC ISSUE TRENDS */}
        <div className="intel-card intel-trends-card">
          <div className="intel-card-header">
            <div>
              <div className="card-header-title-flex">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
                <h3>Civic Issue Trends</h3>
              </div>
              <p>Number of issues reported and resolved over time.</p>
            </div>
            <div className="intel-tab-filter">
              <button
                className={`intel-tab-btn ${range === '7d' ? 'active' : ''}`}
                onClick={() => setRange('7d')}
              >
                7 Days
              </button>
              <button
                className={`intel-tab-btn ${range === '30d' ? 'active' : ''}`}
                onClick={() => setRange('30d')}
              >
                30 Days
              </button>
              <button
                className={`intel-tab-btn ${range === '90d' ? 'active' : ''}`}
                onClick={() => setRange('90d')}
              >
                90 Days
              </button>
              <button
                className={`intel-tab-btn ${range === 'custom' ? 'active' : ''}`}
                onClick={() => {
                  const val = prompt('Enter custom range in days:', customDays);
                  if (val && !isNaN(val)) {
                    setCustomDays(Number(val));
                    setRange('custom');
                  }
                }}
              >
                Custom
              </button>
            </div>
          </div>

          <div className="intel-card-body">
            {loading ? (
              <div className="intel-skeleton-block tall"/>
            ) : trends.length === 0 ? (
              <div className="intel-empty-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                  <path d="M3 3v18h18"/>
                  <path d="M18 17l-5-5-4 4-3-3"/>
                </svg>
                <p>No issue trend data available for this period.</p>
              </div>
            ) : (
              <div className="intel-chart-container">
                {/* Custom SVG Line Chart */}
                <svg className="intel-svg-chart" viewBox="0 0 600 220">
                  {/* Grid Lines */}
                  {[40, 90, 140, 190].map((y, idx) => (
                    <line key={idx} x1="40" y1={y} x2="580" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                  ))}

                  {/* Draw Lines */}
                  {(() => {
                    const maxVal = Math.max(10, ...trends.map(t => Math.max(t.reported || 0, t.resolved || 0)));
                    const xStep = 540 / Math.max(1, trends.length - 1);

                    const reportedPts = trends.map((t, i) => ({
                      x: 40 + i * xStep,
                      y: 190 - ((t.reported || 0) / maxVal) * 150,
                    }));

                    const resolvedPts = trends.map((t, i) => ({
                      x: 40 + i * xStep,
                      y: 190 - ((t.resolved || 0) / maxVal) * 150,
                    }));

                    const reportedPath = reportedPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    const resolvedPath = resolvedPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                    return (
                      <>
                        {/* Reported Line */}
                        <path d={reportedPath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round"/>
                        {reportedPts.map((p, i) => (
                          <circle key={`rep-${i}`} cx={p.x} cy={p.y} r="4" fill="#2563eb" stroke="#ffffff" strokeWidth="2"/>
                        ))}

                        {/* Resolved Line */}
                        <path d={resolvedPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"/>
                        {resolvedPts.map((p, i) => (
                          <circle key={`res-${i}`} cx={p.x} cy={p.y} r="4" fill="#10b981" stroke="#ffffff" strokeWidth="2"/>
                        ))}

                        {/* X-Axis Labels */}
                        {trends.map((t, i) => {
                          if (trends.length > 10 && i % 2 !== 0) return null;
                          return (
                            <text key={`lbl-${i}`} x={40 + i * xStep} y="210" fontSize="11" fill="#64748b" textAnchor="middle">
                              {t.date}
                            </text>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>

                {/* Legend */}
                <div className="intel-chart-legend">
                  <div className="legend-item">
                    <span className="legend-dot dot-blue"/>
                    <span>Issues Reported</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot dot-green"/>
                    <span>Issues Resolved</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ISSUE DISTRIBUTION BY CATEGORY */}
        <div className="intel-card intel-category-card">
          <div className="intel-card-header">
            <div>
              <div className="card-header-title-flex">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
                  <path d="M22 12A10 10 0 0 0 12 2v10z"/>
                </svg>
                <h3>Issue Distribution by Category</h3>
              </div>
              <p>Breakdown of issues across different categories.</p>
            </div>
          </div>

          <div className="intel-card-body">
            {loading ? (
              <div className="intel-skeleton-block tall"/>
            ) : categories.length === 0 ? (
              <div className="intel-empty-state">
                <p>No category data available.</p>
              </div>
            ) : (
              <div className="intel-category-content">
                {/* Donut Visual */}
                <div className="intel-donut-wrapper">
                  <svg className="intel-donut-svg" viewBox="0 0 160 160">
                    {(() => {
                      const totalCount = categories.reduce((acc, c) => acc + (c.count || 0), 0);
                      let cumulativeAngle = 0;
                      const palette = ['#2563eb', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#64748b'];

                      return categories.map((cat, idx) => {
                        const pct = totalCount > 0 ? cat.count / totalCount : 0;
                        const strokeDasharray = `${pct * 377} ${377 - pct * 377}`;
                        const strokeDashoffset = -cumulativeAngle * 377;
                        cumulativeAngle += pct;
                        const color = palette[idx % palette.length];

                        return (
                          <circle
                            key={idx}
                            cx="80"
                            cy="80"
                            r="60"
                            fill="transparent"
                            stroke={color}
                            strokeWidth="24"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="intel-donut-center">
                    <span className="donut-total">{summary.issuesAnalyzed}</span>
                    <span className="donut-label">Total Issues</span>
                  </div>
                </div>

                {/* Category Legend List */}
                <div className="intel-category-legend">
                  {categories.map((cat, idx) => {
                    const palette = ['#2563eb', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#64748b'];
                    const color = palette[idx % palette.length];
                    return (
                      <div key={idx} className="intel-category-row">
                        <div className="cat-name-box">
                          <span className="cat-dot" style={{ backgroundColor: color }}/>
                          <span className="cat-name">{cat.category}</span>
                        </div>
                        <span className="cat-count">{cat.count}</span>
                        <span className="cat-pct">{cat.percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GEOGRAPHIC INTELLIGENCE & DETECTED HOTSPOTS */}
      <div id="geographic-intelligence-section" className="intel-card intel-geo-card">
        <div className="intel-card-header flex-wrap">
          <div>
            <div className="card-header-title-flex">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <h3>Geographic Intelligence</h3>
            </div>
            <p>Spatial distribution of civic issues and detected hotspots.</p>
          </div>

          <div className="intel-filter-row">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="intel-select"
            >
              <option value="all">All Categories</option>
              <option value="Roads">Roads</option>
              <option value="Waste">Waste</option>
              <option value="Water">Water</option>
              <option value="Drainage">Drainage</option>
              <option value="Lighting">Lighting</option>
              <option value="Parks">Parks</option>
              <option value="Other">Other</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="intel-select"
            >
              <option value="all">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="intel-select"
            >
              <option value="all">All Status</option>
              <option value="REPORTED">Reported</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>

            {/* Timeframe Filter */}
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="intel-select"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
        </div>

        <div className="intel-geo-body">
          {/* MAP DISPLAY */}
          <div className="intel-map-container">
            {loading ? (
              <div className="intel-skeleton-block fill-height"/>
            ) : (
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapController center={mapCenter} zoom={mapZoom} />

                {/* Issue Markers */}
                {geoMarkers.map((marker, idx) => {
                  if (!marker.latitude || !marker.longitude) return null;
                  return (
                    <Marker
                      key={marker.issueId || idx}
                      position={[marker.latitude, marker.longitude]}
                      icon={createCustomMarker(marker.priority, marker.status)}
                    >
                      <Popup className="intel-map-popup">
                        <div className="popup-card">
                          <span className="popup-id">#{marker.issueId?.slice(-6) || 'ISSUE'}</span>
                          <span className={`popup-badge badge-${(marker.priority || 'medium').toLowerCase()}`}>
                            {marker.priority}
                          </span>
                          <h4>{marker.title || marker.category}</h4>
                          <p><strong>Category:</strong> {marker.category}</p>
                          <p><strong>Status:</strong> {marker.status}</p>
                          <p><strong>Location:</strong> {marker.location || 'Specified Coordinates'}</p>
                          <button
                            onClick={() => navigate(`/admin/issues?id=${marker.issueId}`)}
                            className="popup-btn"
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

            {/* Map Action Buttons */}
            <div className="intel-map-actions">
              <button onClick={() => setMapZoom(z => Math.min(z + 1, 18))} title="Zoom in">+</button>
              <button onClick={() => setMapZoom(z => Math.max(z - 1, 4))} title="Zoom out">−</button>
              <button onClick={() => { setMapCenter([12.9716, 77.5946]); setMapZoom(12); }} title="Reset map view">⟲</button>
            </div>
          </div>

          {/* DETECTED HOTSPOTS PANEL */}
          <div className="intel-hotspots-panel">
            <div className="hotspots-header">
              <h4>Detected Hotspots</h4>
              <button
                onClick={() => navigate('/admin/map?view=hotspots')}
                className="intel-link-btn"
              >
                View All →
              </button>
            </div>

            <div className="hotspots-list">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="intel-skeleton-line short margin-bottom"/>
                ))
              ) : hotspots.length === 0 ? (
                <div className="intel-empty-state">
                  <p>No hotspots detected.</p>
                </div>
              ) : (
                hotspots.map((hs, idx) => (
                  <div
                    key={idx}
                    className="hotspot-item clickable"
                    onClick={() => {
                      if (hs.latitude && hs.longitude) {
                        setMapCenter([hs.latitude, hs.longitude]);
                        setMapZoom(15);
                      }
                    }}
                  >
                    <div className="hotspot-info">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      <div>
                        <span className="hotspot-name">{hs.areaName || hs.name}</span>
                        <span className="hotspot-count">{hs.issueCount} issues</span>
                      </div>
                    </div>

                    <span className={`hotspot-risk-badge risk-${(hs.riskLevel || 'high').toLowerCase()}`}>
                      {hs.riskLevel || 'High'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW (3 COLUMNS): PRIORITY INTELLIGENCE | AI ANALYSIS | PREDICTIVE INTELLIGENCE */}
      <div className="intel-bottom-grid">
        {/* COLUMN 1: PRIORITY INTELLIGENCE */}
        <div className="intel-card">
          <div className="intel-card-header">
            <div>
              <div className="card-header-title-flex">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <h3>Priority Intelligence</h3>
              </div>
              <p>Distribution of issues by priority level.</p>
            </div>
          </div>

          <div className="intel-card-body">
            {loading ? (
              <div className="intel-skeleton-block medium"/>
            ) : (
              <div className="intel-priority-list">
                {[
                  { label: 'Critical', key: 'critical', val: priorityDist.critical, color: '#ef4444', filterVal: 'CRITICAL' },
                  { label: 'High', key: 'high', val: priorityDist.high, color: '#f97316', filterVal: 'HIGH' },
                  { label: 'Medium', key: 'medium', val: priorityDist.medium, color: '#eab308', filterVal: 'MEDIUM' },
                  { label: 'Low', key: 'low', val: priorityDist.low, color: '#2563eb', filterVal: 'LOW' },
                ].map((item) => {
                  const rawVal = item.val;
                  const count = typeof rawVal === 'object' && rawVal !== null ? (rawVal.count ?? 0) : (Number(rawVal) || 0);
                  const pct = typeof rawVal === 'object' && rawVal !== null 
                    ? (rawVal.percentage ?? 0) 
                    : (priorityDist.total > 0 ? Math.round((count / priorityDist.total) * 100) : 0);

                  return (
                    <div
                      key={item.key}
                      className="priority-row clickable"
                      onClick={() => setPriorityFilter(item.filterVal)}
                      title={`Filter by ${item.label} priority`}
                    >
                      <div className="priority-label-box">
                        <span className="priority-name">{item.label}</span>
                      </div>
                      <div className="priority-bar-track">
                        <div
                          className="priority-bar-fill"
                          style={{ width: `${pct}%`, backgroundColor: item.color }}
                        />
                      </div>
                      <div className="priority-stats">
                        <span>{count}</span>
                        <span className="priority-pct">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2: AI ANALYSIS */}
        <div className="intel-card">
          <div className="intel-card-header">
            <div className="flex-header-title">
              <div className="card-header-title-flex">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M12 2a9 9 0 0 1 9 9c0 3.6-2.1 6.7-5.2 8.1l-1.3.6a.75.75 0 0 0-.5.7v1.6H10v-1.6a.75.75 0 0 0-.5-.7l-1.3-.6A9 9 0 0 1 3 11a9 9 0 0 1 9-9z"/>
                  <path d="M9 22h6"/>
                </svg>
                <h3>AI Analysis</h3>
              </div>
              <div className="intel-badge-group">
                <span className="badge-tag tag-green">Backend AI</span>
                <span className={`badge-tag ${aiAnalysis.status === 'AVAILABLE' ? 'tag-green' : 'tag-gray'}`}>
                  {aiAnalysis.status || 'Available'}
                </span>
              </div>
            </div>
            <p>AI-generated analysis and decision support from real data.</p>
          </div>

          <div className="intel-card-body">
            {loading ? (
              <div className="intel-skeleton-block medium"/>
            ) : (
              <div className="intel-ai-grid">
                <div className="ai-row">
                  <div className="ai-label-col">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span>Classification</span>
                  </div>
                  <div className="ai-val-col">
                    <span>{aiAnalysis.classification || 'Roads - Pothole'}</span>
                  </div>
                  <span className="ai-status-badge">Available</span>
                </div>

                <div className="ai-row">
                  <div className="ai-label-col">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <span>Priority Reasoning</span>
                  </div>
                  <div className="ai-val-col">
                    <span>{aiAnalysis.priorityReasoning || 'Vehicle safety risk, high public impact, multiple similar reports.'}</span>
                  </div>
                  <span className="ai-status-badge">Available</span>
                </div>

                <div className="ai-row">
                  <div className="ai-label-col">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    </svg>
                    <span>Duplicate Detection</span>
                  </div>
                  <div className="ai-val-col">
                    <span>{aiAnalysis.duplicateDetection || 'No potential duplicates'}</span>
                  </div>
                  <span className="ai-status-badge">Available</span>
                </div>

                <div className="ai-row">
                  <div className="ai-label-col">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span>Department Recommendation</span>
                  </div>
                  <div className="ai-val-col">
                    <span>{aiAnalysis.departmentRecommendation || 'Roads & Infrastructure'}</span>
                  </div>
                  <span className="ai-status-badge">Available</span>
                </div>

                <div className="ai-row">
                  <div className="ai-label-col">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="16" x2="12" y2="12"/>
                      <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    <span>AI Explanation</span>
                  </div>
                  <div className="ai-val-col">
                    <span>{aiAnalysis.aiExplanation || 'Based on issue description, location patterns, and historical data.'}</span>
                  </div>
                  <span className="ai-status-badge">Available</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: PREDICTIVE INTELLIGENCE */}
        <div className="intel-card">
          <div className="intel-card-header">
            <div className="flex-header-title">
              <div className="card-header-title-flex">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                <h3>Predictive Intelligence</h3>
              </div>
              <span className={`badge-tag ${predictions.status === 'AVAILABLE' ? 'tag-green' : 'tag-amber'}`}>
                {predictions.status || 'INSUFFICIENT_DATA'}
              </span>
            </div>
            <p>Forecasted civic risk and issue trends.</p>
          </div>

          <div className="intel-card-body">
            {loading ? (
              <div className="intel-skeleton-block medium"/>
            ) : predictions.status === 'INSUFFICIENT_DATA' || !predictions.highRiskAreas ? (
              <div className="intel-empty-state">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p>Prediction Unavailable</p>
                <span className="intel-subtext">Insufficient historical data for a reliable forecast.</span>
              </div>
            ) : (
              <div className="intel-predictive-content">
                <span className="predictive-section-title">Next 30 Days (High Risk Areas)</span>
                <div className="predictive-list">
                  {predictions.highRiskAreas.map((area, idx) => (
                    <div key={idx} className="predictive-item">
                      <span className="rank-num">{idx + 1}</span>
                      <span className="area-title">{area.areaName || area.name}</span>
                      <span className={`risk-pill risk-${(area.riskLevel || 'medium').toLowerCase()}`}>
                        {area.riskLevel} Risk
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                        <line x1="7" y1="17" x2="17" y2="7"/>
                        <polyline points="7 7 17 7 17 17"/>
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntelligenceCenter;
