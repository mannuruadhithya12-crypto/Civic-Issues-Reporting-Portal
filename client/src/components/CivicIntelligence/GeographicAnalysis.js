import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Card from '../common/Card';
import { MapContainer, TileLayer, CircleMarker, Circle, Polygon, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../services/api';

// Map pan/zoom controller
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom, { animate: true, duration: 0.8 });
    }
  }, [center, zoom, map]);
  return null;
}

const SEVERITY_COLORS = {
  CRITICAL: { border: '#b91c1c', fill: '#ef4444', bg: '#fef2f2', text: '#991b1b' },
  HIGH: { border: '#c2410c', fill: '#f97316', bg: '#fff7ed', text: '#9a3412' },
  MEDIUM: { border: '#b45309', fill: '#f59e0b', bg: '#fffbeb', text: '#92400e' },
  LOW: { border: '#1d4ed8', fill: '#3b82f6', bg: '#eff6ff', text: '#1e40af' }
};

function GeographicAnalysis({ intelligence }) {
  // Configurable filter state
  const [radiusMeters, setRadiusMeters] = useState(200);
  const [minPoints, setMinPoints] = useState(3);
  const [department, setDepartment] = useState('all');
  const [priority, setPriority] = useState('all');
  const [status, setStatus] = useState('all');
  const [timeRange, setTimeRange] = useState('30d');

  // Hotspot API data state
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHotspot, setSelectedHotspot] = useState(null);

  // Map view state
  const [mapZoom, setMapZoom] = useState(13);

  // Fetch real DBSCAN hotspots from the API
  const fetchHotspots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        radiusMeters,
        minPoints
      };

      if (department !== 'all') params.department = department;
      if (priority !== 'all') params.priority = priority;
      if (status !== 'all') params.status = status;

      if (timeRange === '7d') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        params.from = d.toISOString();
      } else if (timeRange === '30d') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        params.from = d.toISOString();
      } else if (timeRange === '90d') {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        params.from = d.toISOString();
      }

      const res = await api.get('/admin/intelligence/hotspots', { params });
      setData(res.data);

      if (res.data?.hotspots?.length > 0) {
        setSelectedHotspot(res.data.hotspots[0]);
      } else {
        setSelectedHotspot(null);
      }
    } catch (err) {
      console.error('Failed to fetch hotspot intelligence:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to fetch hotspots';
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [radiusMeters, minPoints, department, priority, status, timeRange]);

  useEffect(() => {
    fetchHotspots();
  }, [fetchHotspots]);

  const hotspots = useMemo(() => data?.hotspots || [], [data]);
  const summary = useMemo(() => data?.summary || { totalHotspots: 0, totalIssuesInHotspots: 0, totalPointsAnalyzed: 0 }, [data]);

  // Compute map center from real hotspot coordinates, never London or NYC
  const mapCenter = useMemo(() => {
    if (selectedHotspot?.center) {
      return [selectedHotspot.center.latitude, selectedHotspot.center.longitude];
    }
    if (hotspots.length > 0 && hotspots[0]?.center) {
      return [hotspots[0].center.latitude, hotspots[0].center.longitude];
    }
    // Default to genuine Bangalore civic center if no clusters present
    return [12.9716, 77.5946];
  }, [selectedHotspot, hotspots]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* KPI Summary Header Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <Card style={{ padding: '16px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Detected Hotspots
          </div>
          <div data-testid="kpi-total-hotspots" style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
            {loading ? '...' : summary.totalHotspots}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            DBSCAN clusters (radius: {radiusMeters}m)
          </div>
        </Card>

        <Card style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Issues in Hotspots
          </div>
          <div data-testid="kpi-issues-in-hotspots" style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
            {loading ? '...' : summary.totalIssuesInHotspots}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            {summary.totalPointsAnalyzed > 0 
              ? `${Math.round((summary.totalIssuesInHotspots / summary.totalPointsAnalyzed) * 100)}% of geo-tagged volume`
              : '0% concentration'}
          </div>
        </Card>

        <Card style={{ padding: '16px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Analyzed Geo-Tagged Records
          </div>
          <div data-testid="kpi-total-points-analyzed" style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
            {loading ? '...' : summary.totalPointsAnalyzed}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            Isolated points: {summary.noisePointsCount || 0}
          </div>
        </Card>

        <Card style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Active / Resolved Ratio
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>
            {selectedHotspot ? `${selectedHotspot.activeCount} / ${selectedHotspot.resolvedCount}` : '—'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            {selectedHotspot ? `In selected hotspot ${selectedHotspot.id}` : 'Select a hotspot below'}
          </div>
        </Card>
      </div>

      {/* Interactive Filter Control Bar */}
      <Card style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            {/* Radius Filter */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '3px' }}>
                Radius (DBSCAN ε)
              </label>
              <select
                data-testid="filter-radius"
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(Number(e.target.value))}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '600' }}
              >
                <option value={100}>100 meters</option>
                <option value={200}>200 meters (Default)</option>
                <option value={350}>350 meters</option>
                <option value={500}>500 meters</option>
                <option value={1000}>1,000 meters</option>
              </select>
            </div>

            {/* Min Points Filter */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '3px' }}>
                Min Issues (MinPts)
              </label>
              <select
                data-testid="filter-minpoints"
                value={minPoints}
                onChange={(e) => setMinPoints(Number(e.target.value))}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '600' }}
              >
                <option value={2}>2 issues</option>
                <option value={3}>3 issues (Default)</option>
                <option value={5}>5 issues</option>
                <option value={8}>8 issues</option>
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '3px' }}>
                Department
              </label>
              <select
                data-testid="filter-department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '600' }}
              >
                <option value="all">All Departments</option>
                <option value="Roads">Roads</option>
                <option value="Waste">Waste</option>
                <option value="Water">Water</option>
                <option value="Electricity">Electricity</option>
                <option value="Sanitation">Sanitation</option>
                <option value="Parks">Parks</option>
                <option value="Public Safety">Public Safety</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '3px' }}>
                Priority
              </label>
              <select
                data-testid="filter-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '600' }}
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Timeframe Filter */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '3px' }}>
                Timeframe
              </label>
              <select
                data-testid="filter-timerange"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '600' }}
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            data-testid="btn-refresh-hotspots"
            onClick={fetchHotspots}
            disabled={loading}
            style={{
              backgroundColor: '#1d61f2',
              color: 'white',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(29, 97, 242, 0.25)'
            }}
          >
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Computing...' : 'Refresh'}
          </button>

        </div>
      </Card>

      {/* Visible Error Banner if Request Fails */}
      {error && (
        <div data-testid="hotspot-error-banner" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px 18px', color: '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <strong>Error loading hotspots:</strong> {error}
          </div>
          <button
            onClick={fetchHotspots}
            style={{ background: '#dc2626', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Map & Detail Panel Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '20px' }}>
        
        {/* Left: Interactive Map Card */}
        <Card style={{ padding: '0', overflow: 'hidden', minHeight: '560px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
              Spatial Hotspot Density Map
            </span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Showing {hotspots.length} density clusters
            </span>
          </div>

          <div style={{ flex: 1, minHeight: '500px', width: '100%', position: 'relative' }}>
            {loading && !data ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                Computing DBSCAN geographic clusters...
              </div>
            ) : (
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: '100%', width: '100%', zIndex: 1 }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <MapController center={mapCenter} zoom={mapZoom} />

                {/* Render Each Hotspot as a Density Circle and Bounding Boundary */}
                {hotspots.map((hs) => {
                  if (!hs.center || isNaN(hs.center.latitude) || isNaN(hs.center.longitude)) return null;

                  const isSelected = selectedHotspot?.id === hs.id;
                  const colors = SEVERITY_COLORS[hs.severityLevel] || SEVERITY_COLORS.MEDIUM;

                  return (
                    <React.Fragment key={hs.id}>
                      {/* Bounding Polygon (Convex Hull of Actual Incident Coordinates) */}
                      {hs.boundingPolygon?.coordinates?.[0]?.length >= 3 && (
                        <Polygon
                          positions={hs.boundingPolygon.coordinates[0].map(([lng, lat]) => [lat, lng])}
                          pathOptions={{
                            color: colors.border,
                            fillColor: colors.fill,
                            fillOpacity: isSelected ? 0.25 : 0.08,
                            weight: isSelected ? 2 : 1,
                            dashArray: '3, 4'
                          }}
                        />
                      )}

                      {/* Density Circle showing actual radius approximation */}
                      <Circle
                        center={[hs.center.latitude, hs.center.longitude]}
                        radius={hs.radiusMeters || 150}
                        pathOptions={{
                          color: colors.border,
                          fillColor: colors.fill,
                          fillOpacity: isSelected ? 0.35 : 0.20,
                          weight: isSelected ? 3 : 1.5,
                          dashArray: isSelected ? '4, 4' : null
                        }}
                        eventHandlers={{
                          click: () => {
                            setSelectedHotspot(hs);
                            setMapZoom(15);
                          }
                        }}
                      />

                      {/* Center Anchor Marker */}
                      <CircleMarker
                        center={[hs.center.latitude, hs.center.longitude]}
                        radius={Math.max(10, Math.min(24, hs.issueCount * 2.5))}
                        pathOptions={{
                          color: '#ffffff',
                          fillColor: colors.fill,
                          fillOpacity: 0.9,
                          weight: 2
                        }}
                        eventHandlers={{
                          click: () => {
                            setSelectedHotspot(hs);
                            setMapZoom(15);
                          }
                        }}
                      >
                        <Popup>
                          <div style={{ minWidth: '180px', padding: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '800', color: colors.text }}>
                                {hs.severityLevel} Hotspot
                              </span>
                              <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>
                                Score: {hs.severityScore}
                              </span>
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
                              {hs.dominantDepartment}
                            </div>
                            <div style={{ fontSize: '12px', color: '#475569', marginBottom: '2px' }}>
                              <strong>{hs.issueCount}</strong> issues in {hs.radiusMeters}m radius
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              Active: {hs.activeCount} | Resolved: {hs.resolvedCount}
                            </div>
                          </div>
                        </Popup>
                      </CircleMarker>
                    </React.Fragment>
                  );
                })}
              </MapContainer>
            )}

            {/* Map Boundary vs Radius Legend */}
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                zIndex: 1000,
                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                padding: '6px 12px',
                borderRadius: '8px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                fontSize: '11px',
                color: '#475569',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                pointerEvents: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', border: '1.5px solid #ef4444', backgroundColor: 'rgba(239, 68, 68, 0.2)' }} />
                <span>Circle: DBSCAN Radius Approximation (ε = {radiusMeters}m)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '8px', border: '1.5px dashed #c2410c', backgroundColor: 'rgba(249, 115, 22, 0.15)' }} />
                <span>Dashed Hull: Actual Incident Bounding Polygon</span>
              </div>
            </div>

            {/* Zero Hotspots Empty Overlay inside map */}
            {!loading && hotspots.length === 0 && !error && (
              <div
                data-testid="hotspot-empty-banner"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  padding: '24px 32px',
                  borderRadius: '16px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                  textAlign: 'center',
                  zIndex: 1000,
                  maxWidth: '360px'
                }}
              >
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📍</div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
                  No Hotspots Detected
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
                  No incident clusters meet the density threshold (MinPts: {minPoints}, Radius: {radiusMeters}m). Try expanding the radius or lowering the issue threshold.
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Right: Selected Hotspot Details & Leaderboard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {selectedHotspot ? (
            <Card data-testid="hotspot-detail-panel" style={{ padding: '20px' }}>
              {/* Detail Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>
                    {selectedHotspot.id}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                    {selectedHotspot.dominantDepartment} Cluster
                  </div>
                </div>

                <span
                  style={{
                    backgroundColor: SEVERITY_COLORS[selectedHotspot.severityLevel]?.bg || '#f1f5f9',
                    color: SEVERITY_COLORS[selectedHotspot.severityLevel]?.text || '#334155',
                    border: `1px solid ${SEVERITY_COLORS[selectedHotspot.severityLevel]?.border || '#cbd5e1'}`,
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: '800'
                  }}
                >
                  {selectedHotspot.severityLevel} • {selectedHotspot.severityScore}
                </span>
              </div>

              {/* Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Total Issues</span>
                  <strong style={{ fontSize: '16px', color: '#0f172a' }}>{selectedHotspot.issueCount}</strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Cluster Radius</span>
                  <strong style={{ fontSize: '16px', color: '#0f172a' }}>{selectedHotspot.radiusMeters}m</strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Spatial Density</span>
                  <strong style={{ fontSize: '16px', color: '#0f172a' }}>{selectedHotspot.densityPerSqKm} <span style={{ fontSize: '10px', fontWeight: '500' }}>/km²</span></strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Dominant Category</span>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>{selectedHotspot.dominantCategory || selectedHotspot.dominantDepartment}</strong>
                </div>
              </div>

              {/* Active vs Resolved Ratio Bar */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>
                  <span style={{ color: '#ef4444' }}>Active ({selectedHotspot.activeCount})</span>
                  <span style={{ color: '#16a34a' }}>Resolved ({selectedHotspot.resolvedCount})</span>
                </div>
                <div style={{ height: '8px', width: '100%', backgroundColor: '#dcfce7', borderRadius: '9999px', overflow: 'hidden', display: 'flex' }}>
                  <div
                    style={{
                      height: '100%',
                      backgroundColor: '#ef4444',
                      width: selectedHotspot.issueCount > 0
                        ? `${(selectedHotspot.activeCount / selectedHotspot.issueCount) * 100}%`
                        : '0%'
                    }}
                  />
                </div>
              </div>

              {/* Priority Breakdown Pills */}
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                  Priority Breakdown
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {Object.entries(selectedHotspot.priorityBreakdown || {}).map(([p, cnt]) => (
                    <span
                      key={p}
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: p === 'urgent' ? '#fee2e2' : p === 'high' ? '#ffedd5' : '#f1f5f9',
                        color: p === 'urgent' ? '#991b1b' : p === 'high' ? '#9a3412' : '#475569',
                        fontWeight: '700',
                        textTransform: 'capitalize'
                      }}
                    >
                      {p}: {cnt}
                    </span>
                  ))}
                </div>
              </div>

              {/* First & Last Reported Timestamps */}
              <div style={{ fontSize: '11px', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <div>First incident: <strong>{selectedHotspot.firstReportedAt ? new Date(selectedHotspot.firstReportedAt).toLocaleString() : 'N/A'}</strong> (cluster origin)</div>
                <div>Latest incident: <strong>{selectedHotspot.lastReportedAt ? new Date(selectedHotspot.lastReportedAt).toLocaleString() : 'N/A'}</strong> (most recent activity)</div>
              </div>

              {/* Methodology Explanation */}
              <div style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '10px', fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '2px' }}>Severity Methodology</div>
                <div>Calculated using DBSCAN spatial density, volume ({selectedHotspot.issueCount} pts), priority ratio, and active unresolved incidents.</div>
              </div>

              {/* Constituent Issues List */}
              {selectedHotspot.issues && selectedHotspot.issues.length > 0 && (
                <div style={{ marginTop: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                    Clustered Issues ({selectedHotspot.issues.length})
                  </span>
                  <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedHotspot.issues.slice(0, 10).map((iss) => (
                      <div
                        key={iss.id}
                        style={{
                          fontSize: '12px',
                          padding: '6px 10px',
                          background: '#f8fafc',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ fontWeight: '600', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                          {iss.title}
                        </span>
                        <a
                          href={`/issues/${iss.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#1d61f2', fontSize: '11px', fontWeight: '700', textDecoration: 'none' }}
                        >
                          View →
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
              Select a cluster on the map to inspect density metrics.
            </Card>
          )}

          {/* Hotspot Leaderboard */}
          <Card style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: '0 0 10px 0' }}>
              All Hotspots Leaderboard ({hotspots.length})
            </h4>

            {hotspots.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>No clusters found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                {hotspots.map((h, i) => {
                  const isSel = selectedHotspot?.id === h.id;
                  return (
                    <div
                      key={h.id}
                      data-testid={`hotspot-leaderboard-item-${h.id}`}
                      onClick={() => {
                        setSelectedHotspot(h);
                        setMapZoom(15);
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        background: isSel ? '#eff6ff' : '#f8fafc',
                        border: isSel ? '1px solid #93c5fd' : '1px solid #f1f5f9',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#64748b' }}>#{i + 1}</span>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{h.dominantDepartment}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{h.issueCount} issues • {h.radiusMeters}m radius</div>
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: SEVERITY_COLORS[h.severityLevel]?.bg || '#f1f5f9',
                          color: SEVERITY_COLORS[h.severityLevel]?.text || '#334155'
                        }}
                      >
                        {h.severityLevel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

        </div>

      </div>

    </div>
  );
}

export default GeographicAnalysis;
