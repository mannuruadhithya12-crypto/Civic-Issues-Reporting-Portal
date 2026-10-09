import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Spinner from '../components/common/Spinner';

// Helper to calculate relative time string (e.g. "2 days ago")
const getRelativeTime = (dateString) => {
  if (!dateString) return 'Recently';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 4) return `${diffWeek} ${diffWeek === 1 ? 'week' : 'weeks'} ago`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth} ${diffMonth === 1 ? 'month' : 'months'} ago`;
};

// Category SVG Path icons
const getCategoryIconSvg = (categoryName) => {
  const cat = (categoryName || '').toLowerCase();
  if (cat.includes('road') || cat.includes('pothole')) {
    return `<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`;
  }
  if (cat.includes('waste') || cat.includes('garbage')) {
    return `<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
  }
  if (cat.includes('electr') || cat.includes('light')) {
    return `<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
  }
  if (cat.includes('water') || cat.includes('drain')) {
    return `<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`;
  }
  if (cat.includes('park') || cat.includes('tree')) {
    return `<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path d="M12 2L4 12h4v8h8v-8h4L12 2z"/></svg>`;
  }
  if (cat.includes('sanitat') || cat.includes('clean')) {
    return `<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/></svg>`;
  }
  if (cat.includes('safety') || cat.includes('hazard')) {
    return `<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
  }
  return `<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="12" r="2"/></svg>`;
};

// Status Colors Config
const getStatusMeta = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'resolved') {
    return { name: 'Resolved', color: '#16a34a', bg: '#dcfce7', border: '#86efac' };
  }
  if (s === 'in_progress' || s === 'assigned' || s === 'in progress') {
    return { name: 'In Progress', color: '#1d61f2', bg: '#dbeafe', border: '#93c5fd' };
  }
  if (s === 'under_review' || s === 'verified' || s === 'under review') {
    return { name: 'Under Review', color: '#9333ea', bg: '#f3e8ff', border: '#d8b4fe' };
  }
  if (s === 'closed' || s === 'rejected') {
    return { name: 'Closed', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' };
  }
  return { name: 'Reported', color: '#f59e0b', bg: '#fef3c7', border: '#fde047' };
};

// Custom Leaflet Marker Icon Generator
const createCustomMarkerIcon = (issue, isSelected) => {
  const statusMeta = getStatusMeta(issue.status);
  const iconSvg = getCategoryIconSvg(issue.department || issue.category);

  const html = `
    <div style="
      position: relative;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background-color: ${statusMeta.color};
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: ${isSelected ? `0 0 0 4px ${statusMeta.color}44, 0 8px 16px rgba(0,0,0,0.25)` : '0 4px 10px rgba(0,0,0,0.18)'};
      border: 2px solid #ffffff;
      transition: transform 0.2s ease;
      transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
    ">
      ${iconSvg}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20]
  });
};

// Custom Cluster Marker Icon Generator
const createClusterIcon = (count, primaryColor = '#1d61f2') => {
  const html = `
    <div style="
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background-color: ${primaryColor}e6;
      color: #ffffff;
      font-weight: 800;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid #ffffff;
      box-shadow: 0 4px 14px ${primaryColor}66;
    ">
      ${count}
    </div>
  `;
  return L.divIcon({
    html,
    className: 'custom-leaflet-cluster',
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  });
};

// Map View Controller Subcomponent (Handles Pan/Zoom Programmatically)
function MapViewController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
}

function CivicMap() {
  const navigate = useNavigate();

  // State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [status, setStatus] = useState('All Status');
  const [timeRange, setTimeRange] = useState('All Time');

  const [tileLayerType, setTileLayerType] = useState('street'); // 'street' | 'satellite' | 'terrain'
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  const [issues, setIssues] = useState([]);
  const [nearbyIssues, setNearbyIssues] = useState([]);
  const [statistics, setStatistics] = useState({ total: 0, resolved: 0, inProgress: 0, activeAreas: 0 });
  const [loading, setLoading] = useState(true);

  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [mapCenter, setMapCenter] = useState([12.9716, 77.5946]);
  const [mapZoom, setMapZoom] = useState(12);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch Map Data from API
  const fetchMapData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (category && category !== 'All Categories') params.category = category;
      if (status && status !== 'All Status') params.status = status;
      if (timeRange && timeRange !== 'All Time') params.timeRange = timeRange;
      if (userLocation) {
        params.lat = userLocation.lat;
        params.lng = userLocation.lng;
      }

      const res = await api.get('/issues/map-data', { params });

      if (res.data && res.data.success) {
        const fetchedIssues = res.data.issues || [];
        setIssues(fetchedIssues);
        setNearbyIssues(res.data.nearbyIssues || fetchedIssues);
        setStatistics(res.data.statistics || { total: 0, resolved: 0, inProgress: 0, activeAreas: 0 });

        if (fetchedIssues.length > 0 && fetchedIssues[0].lat && fetchedIssues[0].lng) {
          setMapCenter([fetchedIssues[0].lat, fetchedIssues[0].lng]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch map data:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, status, timeRange, userLocation]);

  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  // Get User Geolocation
  const handleMyClickLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setMapCenter([loc.lat, loc.lng]);
        setMapZoom(14);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        alert('Could not retrieve your current location.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handle Nearby Card Click
  const handleIssueCardClick = (issue) => {
    setSelectedIssueId(issue._id);
    const itemLat = issue.lat ?? (Array.isArray(issue.coordinates) ? issue.coordinates[1] : (issue.coordinates?.coordinates ? issue.coordinates.coordinates[1] : null));
    const itemLng = issue.lng ?? (Array.isArray(issue.coordinates) ? issue.coordinates[0] : (issue.coordinates?.coordinates ? issue.coordinates.coordinates[0] : null));
    if (itemLat && itemLng) {
      setMapCenter([itemLat, itemLng]);
      setMapZoom(15);
    }
  };

  // Tile URL resolver
  const getTileUrl = () => {
    if (tileLayerType === 'satellite') {
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    }
    if (tileLayerType === 'terrain') {
      return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
    }
    return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  };

  const getTileAttribution = () => {
    if (tileLayerType === 'satellite') {
      return '&copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics';
    }
    if (tileLayerType === 'terrain') {
      return '&copy; OpenTopoMap contributors';
    }
    return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
      
      {/* ================= PAGE TITLE HEADER ================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.4px' }}>
            City Issues Map
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, fontWeight: '500' }}>
            Explore reported issues across the city. Click on a marker to view details.
          </p>
        </div>

        {/* Top-Right CTA */}
        <button
          type="button"
          onClick={() => navigate('/report')}
          style={{
            backgroundColor: '#1d61f2',
            color: '#ffffff',
            border: 'none',
            borderRadius: '9999px',
            padding: '10px 22px',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(29, 97, 242, 0.25)',
            transition: 'all 0.2s ease'
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Report an Issue
        </button>
      </div>

      {/* ================= SEARCH & FILTER TOOLBAR ================= */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <svg
            style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by location, issue, or ID..."
            style={{
              width: '100%',
              padding: '10px 16px 10px 40px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              fontSize: '13px',
              color: '#0f172a',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Category Dropdown */}
        <div style={{ position: 'relative' }}>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              padding: '10px 36px 10px 16px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              fontSize: '13px',
              fontWeight: '600',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
          >
            <option value="All Categories">All Categories</option>
            <option value="Roads">Roads</option>
            <option value="Waste">Waste</option>
            <option value="Electricity">Electricity</option>
            <option value="Water">Water</option>
            <option value="Parks">Parks</option>
            <option value="Sanitation">Sanitation</option>
            <option value="Public Safety">Public Safety</option>
            <option value="Other">Other</option>
          </select>
          <svg style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Status Dropdown */}
        <div style={{ position: 'relative' }}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{
              padding: '10px 36px 10px 16px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              fontSize: '13px',
              fontWeight: '600',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
          >
            <option value="All Status">All Status</option>
            <option value="Reported">Reported</option>
            <option value="Under Review">Under Review</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
          <svg style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Time Filter */}
        <div style={{ position: 'relative' }}>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={{
              padding: '10px 36px 10px 16px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              fontSize: '13px',
              fontWeight: '600',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
          >
            <option value="All Time">All Time</option>
            <option value="Today">Today</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
            <option value="Last 3 Months">Last 3 Months</option>
          </select>
          <svg style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* My Location Button */}
        <button
          type="button"
          onClick={handleMyClickLocation}
          disabled={isLocating}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: '700',
            color: '#1d61f2',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <crosshair />
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
          </svg>
          {isLocating ? 'Locating...' : 'My Location'}
        </button>
      </div>

      {/* ================= MAIN CONTENT SECTION (2 COLUMNS) ================= */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        
        {/* LEFT COLUMN: INTERACTIVE LEAFLET MAP */}
        <div 
          style={{
            position: 'relative',
            height: '620px',
            borderRadius: '24px',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}
        >
          {loading && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(248, 250, 252, 0.5)', backdropFilter: 'blur(2px)' }}>
              <Spinner />
            </div>
          )}
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
            zoomControl={false}
          >
            <MapViewController center={mapCenter} zoom={mapZoom} />

            <TileLayer
              key={tileLayerType}
              url={getTileUrl()}
              attribution={getTileAttribution()}
            />

              {/* Render User Location Marker */}
              {userLocation && (
                <Marker
                  position={[userLocation.lat, userLocation.lng]}
                  icon={L.divIcon({
                    html: `
                      <div style="width:20px;height:20px;border-radius:50%;background:#1d61f2;border:3px solid white;box-shadow:0 0 0 6px rgba(29,97,242,0.3);animation:pulse 2s infinite;"></div>
                    `,
                    className: 'user-loc-marker',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                  })}
                >
                  <Popup>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#1d61f2' }}>Your Current Location</div>
                  </Popup>
                </Marker>
              )}

              {/* Render Issue Markers */}
              {issues.map((issue) => {
                const itemLat = issue.lat ?? (Array.isArray(issue.coordinates) ? issue.coordinates[1] : (issue.coordinates?.coordinates ? issue.coordinates.coordinates[1] : null));
                const itemLng = issue.lng ?? (Array.isArray(issue.coordinates) ? issue.coordinates[0] : (issue.coordinates?.coordinates ? issue.coordinates.coordinates[0] : null));

                if (!itemLat || !itemLng || isNaN(itemLat) || isNaN(itemLng)) return null;

                const isSelected = selectedIssueId === issue._id;
                const statusMeta = getStatusMeta(issue.status);
                const issueIdStr = `#CC-${(issue._id || '').substring((issue._id || '').length - 6).toUpperCase()}`;

                return (
                  <Marker
                    key={issue._id}
                    position={[itemLat, itemLng]}
                    icon={createCustomMarkerIcon(issue, isSelected)}
                    eventHandlers={{
                      click: () => setSelectedIssueId(issue._id)
                    }}
                  >
                    <Popup className="cit-map-popup">
                      <div style={{ width: '230px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span 
                            style={{
                              backgroundColor: statusMeta.bg,
                              color: statusMeta.color,
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '10px',
                              fontWeight: '800',
                              textTransform: 'uppercase'
                            }}
                          >
                            {statusMeta.name}
                          </span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {getRelativeTime(issue.createdAt)}
                          </span>
                        </div>

                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', lineHeight: '1.2' }}>
                          {issue.title}
                        </div>

                        <div style={{ fontSize: '11px', color: '#1d61f2', fontWeight: '700', fontFamily: 'monospace' }}>
                          {issueIdStr}
                        </div>

                        <div style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {issue.locationName || issue.location || 'Municipal Area'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => navigate(`/issues/${issue._id}`)}
                          style={{
                            marginTop: '6px',
                            backgroundColor: '#1d61f2',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '8px 12px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            width: '100%'
                          }}
                        >
                          View Details
                          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>

                      </div>
                    </Popup>
                  </Marker>
                );
              })}

            </MapContainer>

          {/* FLOATING MAP LAYER SELECTOR (TOP RIGHT) */}
          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              borderRadius: '16px',
              padding: '12px 16px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
              border: '1px solid rgba(226,232,240,0.8)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }}>
              <input
                type="radio"
                name="mapTileType"
                checked={tileLayerType === 'street'}
                onChange={() => setTileLayerType('street')}
                style={{ accentColor: '#1d61f2' }}
              />
              Street Map
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }}>
              <input
                type="radio"
                name="mapTileType"
                checked={tileLayerType === 'satellite'}
                onChange={() => setTileLayerType('satellite')}
                style={{ accentColor: '#1d61f2' }}
              />
              Satellite View
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }}>
              <input
                type="radio"
                name="mapTileType"
                checked={tileLayerType === 'terrain'}
                onChange={() => setTileLayerType('terrain')}
                style={{ accentColor: '#1d61f2' }}
              />
              Terrain View
            </label>
          </div>

          {/* FLOATING LEGEND (BOTTOM LEFT) */}
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              borderRadius: '16px',
              padding: '14px 18px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
              border: '1px solid rgba(226,232,240,0.8)',
              zIndex: 1000
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
              Issue Status
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 16px', fontSize: '11px', fontWeight: '700', color: '#334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
                Reported
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#1d61f2' }}></span>
                In Progress
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#9333ea' }}></span>
                Under Review
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span>
                Resolved
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#dc2626' }}></span>
                Closed
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: NEARBY ISSUES & STATISTICS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* NEARBY ISSUES CARD */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '410px'
            }}
          >
            {/* Nearby Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                Nearby Issues <span style={{ color: '#64748b', fontWeight: '600' }}>({nearbyIssues.length})</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/issues')}
                style={{ background: 'transparent', border: 'none', color: '#1d61f2', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
              >
                View All &rarr;
              </button>
            </div>

            {/* Scrollable Issues List */}
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
              {nearbyIssues.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b', fontSize: '13px' }}>
                  <div style={{ marginBottom: '8px', fontSize: '24px' }}>📍</div>
                  No issues found in this area.
                </div>
              ) : (
                nearbyIssues.map((issue) => {
                  const statusMeta = getStatusMeta(issue.status);
                  const isSelected = selectedIssueId === issue._id;

                  return (
                    <div
                      key={issue._id}
                      onClick={() => handleIssueCardClick(issue)}
                      style={{
                        padding: '12px',
                        borderRadius: '16px',
                        border: isSelected ? '2px solid #1d61f2' : '1px solid #f1f5f9',
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center'
                      }}
                    >
                      {/* Thumbnail or Fallback Icon */}
                      <div
                        style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          backgroundColor: '#f1f5f9',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {issue.images && issue.images.length > 0 ? (
                          <img src={issue.images[0]} alt={issue.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div dangerouslySetInnerHTML={{ __html: getCategoryIconSvg(issue.department || issue.category) }} style={{ color: '#64748b' }} />
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                            {issue.title}
                          </span>
                          <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: statusMeta.bg, color: statusMeta.color, padding: '2px 8px', borderRadius: '9999px' }}>
                            {statusMeta.name}
                          </span>
                        </div>

                        <div style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
                          {issue.locationName || issue.location || 'Municipal Area'}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8' }}>
                          <span style={{ fontWeight: '600', color: '#475569' }}>
                            {issue.department || 'General'}
                          </span>
                          <span>{getRelativeTime(issue.createdAt)}</span>
                        </div>
                      </div>

                      {/* Right Arrow */}
                      <div style={{ color: '#cbd5e1', fontSize: '16px', fontWeight: 'bold' }}>
                        &rsaquo;
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* MAP STATISTICS CARD */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}
          >
            {/* Stats Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                Map Statistics
              </div>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                {timeRange}
              </span>
            </div>

            {/* 4 Stat Boxes (2x2 Grid) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              
              {/* Box 1: Total Issues */}
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '16px', padding: '12px 14px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#16a34a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                  </svg>
                </div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', lineHeight: '1' }}>
                  {statistics.total || 0}
                </div>
                <div style={{ fontSize: '11px', color: '#166534', fontWeight: '600', marginTop: '4px' }}>
                  Total Issues
                </div>
              </div>

              {/* Box 2: Resolved */}
              <div style={{ backgroundColor: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '16px', padding: '12px 14px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#1d61f2', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', lineHeight: '1' }}>
                  {statistics.resolved || 0}
                </div>
                <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: '600', marginTop: '4px' }}>
                  Resolved
                </div>
              </div>

              {/* Box 3: In Progress */}
              <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '16px', padding: '12px 14px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#f59e0b', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', lineHeight: '1' }}>
                  {statistics.inProgress || 0}
                </div>
                <div style={{ fontSize: '11px', color: '#92400e', fontWeight: '600', marginTop: '4px' }}>
                  In Progress
                </div>
              </div>

              {/* Box 4: Active Areas */}
              <div style={{ backgroundColor: '#faf5ff', border: '1px solid #f3e8ff', borderRadius: '16px', padding: '12px 14px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#9333ea', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                </div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', lineHeight: '1' }}>
                  {statistics.activeAreas || 0}
                </div>
                <div style={{ fontSize: '11px', color: '#6b21a8', fontWeight: '600', marginTop: '4px' }}>
                  Active Areas
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

export default CivicMap;
