import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { useDataMode } from '../../context/DataModeContext';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const taskMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const userMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapRecenter({ center, userLocation, taskLocation }) {
  const map = useMap();
  useEffect(() => {
    if (userLocation && taskLocation) {
      const bounds = L.latLngBounds([userLocation, taskLocation]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (center) {
      map.setView(center, 15);
    }
  }, [map, center, userLocation, taskLocation]);
  return null;
}

const TaskDetails = () => {
    const { id } = useParams();
    const { isDemo } = useDataMode();
    const [issue, setIssue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState(null);
    const [completionNotes, setCompletionNotes] = useState('');
    const [proofImage, setProofImage] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Navigation & Map States
    const [navigating, setNavigating] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const [navModalOpen, setNavModalOpen] = useState(false);
    const [navToast, setNavToast] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);

    useEffect(() => {
        fetchIssueDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchIssueDetails = async () => {
        setErrorMessage(null);
        try {
            const res = await api.get(`/issues/${id}`);
            if (res.data) {
                setIssue(res.data);
            } else {
                throw new Error("No data returned");
            }
        } catch (err) {
            console.error("fetchIssueDetails notice:", err.message);
            if (isDemo && (id === '00123' || !id)) {
                // Isolated fallback task object ONLY for demo IDs in demo mode
                setIssue({
                    _id: id || '00123',
                    title: 'Pothole Repair - Main Street',
                    description: 'You have been assigned a new task: Pothole Repair - Main Street. Please review the details and start working on this task.',
                    location: 'Main Street, Near Metro Station',
                    locationName: 'Main Street, Near Metro Station',
                    department: 'Roads',
                    category: 'Pothole',
                    priority: 'high',
                    status: 'assigned',
                    createdAt: new Date().toISOString(),
                    sla: { dueAt: new Date(Date.now() + 5 * 3600 * 1000).toISOString(), isBreached: false },
                    images: [],
                    coordinates: {
                        coordinates: [77.5946, 12.9716]
                    }
                });
            } else {
                setIssue(null);
                setErrorMessage(err.response?.data?.message || "Task not found or unable to load details.");
            }
        } finally {
            setLoading(false);
        }
    };

    const getCoordinates = (issueObj) => {
        if (!issueObj) return [12.9716, 77.5946];

        // 1. GeoJSON format: issue.coordinates = { type: 'Point', coordinates: [lng, lat] }
        if (issueObj.coordinates?.coordinates && Array.isArray(issueObj.coordinates.coordinates) && issueObj.coordinates.coordinates.length >= 2) {
            const lng = Number(issueObj.coordinates.coordinates[0]);
            const lat = Number(issueObj.coordinates.coordinates[1]);
            if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
                return [lat, lng];
            }
        }

        // 2. Direct array: issue.coordinates = [lng, lat] or [lat, lng]
        if (Array.isArray(issueObj.coordinates) && issueObj.coordinates.length >= 2) {
            const val1 = Number(issueObj.coordinates[0]);
            const val2 = Number(issueObj.coordinates[1]);
            if (!isNaN(val1) && !isNaN(val2)) {
                if (Math.abs(val1) > 50 && Math.abs(val2) <= 50) {
                    return [val2, val1];
                }
                return [val1, val2];
            }
        }

        // 3. Object format: issue.coordinates = { lat, lng }
        if (issueObj.coordinates && typeof issueObj.coordinates === 'object') {
            const lat = Number(issueObj.coordinates.lat || issueObj.coordinates.latitude);
            const lng = Number(issueObj.coordinates.lng || issueObj.coordinates.longitude);
            if (!isNaN(lat) && !isNaN(lng) && lat !== 0) {
                return [lat, lng];
            }
        }

        // 4. Root lat/lng
        if (issueObj.lat && issueObj.lng) {
            const lat = Number(issueObj.lat);
            const lng = Number(issueObj.lng);
            if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
        }

        // Default Bangalore city center fallback for demo issues
        return [12.9716, 77.5946];
    };

    const handleStartNavigation = () => {
        const coords = getCoordinates(issue);
        const destLat = coords[0];
        const destLng = coords[1];

        setNavigating(true);
        setNavModalOpen(true);
        setNavToast('Opening Google Maps navigation & fetching live GPS...');

        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const userLat = pos.coords.latitude;
                    const userLng = pos.coords.longitude;
                    setUserLocation([userLat, userLng]);
                    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${destLat},${destLng}&travelmode=driving`;
                    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
                    setNavToast('Live turn-by-turn navigation launched in Google Maps!');
                },
                (err) => {
                    console.warn('Geolocation warning/denied:', err);
                    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
                    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
                    setNavToast('Navigation launched in Google Maps!');
                },
                { enableHighAccuracy: true, timeout: 8000 }
            );
        } else {
            const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
            window.open(mapsUrl, '_blank', 'noopener,noreferrer');
            setNavToast('Navigation opened in Google Maps!');
        }
    };

    const openGoogleMaps = () => {
        const coords = getCoordinates(issue);
        const [destLat, destLng] = coords;
        let url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
        if (userLocation) {
            url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation[0]},${userLocation[1]}&destination=${destLat},${destLng}&travelmode=driving`;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const openWaze = () => {
        const coords = getCoordinates(issue);
        const [destLat, destLng] = coords;
        window.open(`https://waze.com/ul?ll=${destLat},${destLng}&navigate=yes`, '_blank', 'noopener,noreferrer');
    };

    const openAppleMaps = () => {
        const coords = getCoordinates(issue);
        const [destLat, destLng] = coords;
        window.open(`https://maps.apple.com/?daddr=${destLat},${destLng}`, '_blank', 'noopener,noreferrer');
    };

    const copyCoordinates = () => {
        const coords = getCoordinates(issue);
        navigator.clipboard.writeText(`${coords[0]}, ${coords[1]}`);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
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

    const handleStartWork = async () => {
        try {
            const res = await api.patch(`/issues/${id}/start`);
            if (res.data) {
                setIssue(res.data);
            } else {
                setIssue(prev => prev ? { ...prev, status: 'in_progress' } : null);
            }
            addWorkerNotification({
                _id: `notif-start-${Date.now()}`,
                type: 'task_updated',
                title: 'Task Status Updated',
                message: `${issue?.title || 'Task'} has been updated to In Progress`,
                read: false,
                createdAt: new Date().toISOString(),
                issue: {
                    _id: id,
                    title: issue?.title || 'Civic Task',
                    locationName: issue?.locationName || issue?.location || '',
                    department: issue?.department || '',
                    priority: issue?.priority || 'normal',
                    status: 'in_progress'
                }
            });
        } catch (err) {
            console.error("handleStartWork error:", err);
            alert(err.response?.data?.message || "Failed to start task. Please ensure you are assigned to this task.");
        }
    };

    const handleCompleteWork = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const formData = new FormData();
        if (proofImage) {
            formData.append('proof', proofImage);
        }
        formData.append('notes', completionNotes || 'Task completed successfully.');
        
        try {
            const res = await api.patch(`/issues/${id}/resolve`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data) {
                setIssue(res.data);
            } else {
                setIssue(prev => prev ? { ...prev, status: 'resolved' } : null);
            }
            addWorkerNotification({
                _id: `notif-comp-${Date.now()}`,
                type: 'task_completed',
                title: 'Task Marked as Completed',
                message: `${issue?.title || 'Task'} has been marked as completed successfully.`,
                read: false,
                createdAt: new Date().toISOString(),
                issue: {
                    _id: id,
                    title: issue?.title || 'Civic Task',
                    locationName: issue?.locationName || issue?.location || '',
                    department: issue?.department || '',
                    priority: issue?.priority || 'normal',
                    status: 'resolved'
                }
            });
        } catch (err) {
            console.error("handleCompleteWork error:", err);
            alert(err.response?.data?.message || "Failed to complete task. Please ensure requirements and work assignments are met.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="w-page-wrapper flex justify-center items-center h-full">
            <div className="text-xl text-blue-600 font-semibold">Loading task details...</div>
        </div>
    );

    if (!issue) return (
        <div className="w-page-wrapper flex flex-col justify-center items-center h-full" style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
            <div className="text-xl text-red-600 font-semibold">{errorMessage || "Task not found"}</div>
            <p style={{ marginTop: '0.5rem', color: '#64748b' }}>Please check the task ID or return to your tasks list.</p>
            <Link to="/worker/tasks" style={{ marginTop: '1rem', display: 'inline-block', padding: '8px 16px', background: '#2563eb', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}>Back to My Tasks</Link>
        </div>
    );

    const isAssigned = issue.status === 'assigned' || issue.status === 'reopened';
    const isInProgress = issue.status === 'in_progress';
    const isCompleted = issue.status === 'resolved' || issue.status === 'closed';
    const taskCoords = getCoordinates(issue);

    return (
        <div className="w-page-wrapper" style={{ backgroundColor: '#f9fafb', padding: '1.5rem', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                
                {/* Navigation Active Toast */}
                {navToast && (
                    <div style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '0.875rem 1.25rem', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(37,99,235,0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.925rem' }}>
                            <span style={{ fontSize: '1.25rem' }}>🧭</span>
                            <span><strong>GPS Navigation:</strong> {navToast}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                                onClick={() => setNavModalOpen(true)}
                                style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                            >
                                Options
                            </button>
                            <button onClick={() => setNavToast('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', fontWeight: 'bold', fontSize: '1rem', padding: '0 0.25rem' }}>✕</button>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div>
                        <Link to="/worker/tasks" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--w-neutral-500)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                            <span>←</span> Back to Tasks
                        </Link>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--w-neutral-900)' }}>
                                #{issue._id.substring(issue._id.length - 4).toUpperCase()} {issue.title}
                            </h1>
                            {issue.priority === 'high' || issue.priority === 'urgent' ? (
                                <span style={{ backgroundColor: '#fef2f2', color: '#ef4444', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid #fee2e2' }}>High</span>
                            ) : issue.priority === 'medium' ? (
                                <span style={{ backgroundColor: '#fffbeb', color: '#f59e0b', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid #fef3c7' }}>Medium</span>
                            ) : (
                                <span style={{ backgroundColor: '#f0fdf4', color: '#10b981', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid #d1fae5' }}>Low</span>
                            )}
                            
                            {isInProgress && (
                                <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid #bfdbfe' }}>In Progress</span>
                            )}
                            {isCompleted && (
                                <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid #bbf7d0' }}>Completed</span>
                            )}
                            {isAssigned && (
                                <span style={{ backgroundColor: '#f3f4f6', color: '#4b5563', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid #d1d5db' }}>Assigned</span>
                            )}
                        </div>
                    </div>
                    <div>
                        <button 
                            className="w-btn w-btn-primary" 
                            onClick={handleStartNavigation}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem', 
                                padding: '0.625rem 1.25rem',
                                backgroundColor: navigating ? '#16a34a' : '#2563eb',
                                color: 'white',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <span>📍</span> {navigating ? 'Navigation Active' : 'Start Navigation'}
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.5rem' }}>
                    
                    {/* Left Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        {/* Map Card */}
                        <div className="w-card" style={{ padding: 0, overflow: 'hidden', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div style={{ height: '350px', backgroundColor: '#e5e7eb', position: 'relative' }}>
                                {taskCoords ? (
                                    <MapContainer 
                                        center={taskCoords} 
                                        zoom={15} 
                                        style={{ height: '100%', width: '100%', zIndex: 1 }}
                                    >
                                        <TileLayer 
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution='&copy; OpenStreetMap contributors'
                                        />
                                        <MapRecenter center={taskCoords} userLocation={userLocation} taskLocation={taskCoords} />
                                        
                                        {/* Task Destination Marker */}
                                        <Marker position={taskCoords} icon={taskMarkerIcon}>
                                            <Popup>
                                                <div style={{ padding: '0.25rem' }}>
                                                    <strong style={{ fontSize: '0.9rem', color: '#111827' }}>{issue.title}</strong>
                                                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#4b5563' }}>
                                                        {issue.locationName || issue.location || 'Task Destination'}
                                                    </p>
                                                </div>
                                            </Popup>
                                        </Marker>

                                        {/* User Geolocation Marker & Polyline route when navigation active */}
                                        {userLocation && (
                                            <>
                                                <Marker position={userLocation} icon={userMarkerIcon}>
                                                    <Popup>
                                                        <strong style={{ color: '#2563eb' }}>Your Current GPS Position</strong>
                                                    </Popup>
                                                </Marker>
                                                <Polyline 
                                                    positions={[userLocation, taskCoords]} 
                                                    color="#2563eb" 
                                                    weight={5} 
                                                    opacity={0.8}
                                                    dashArray="8, 8" 
                                                />
                                            </>
                                        )}
                                    </MapContainer>
                                ) : (
                                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--w-neutral-500)' }}>
                                        Location data unavailable
                                    </div>
                                )}
                            </div>
                            <div style={{ padding: '1rem 1.5rem', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f3f4f6' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '1.1rem' }}>📍</span>
                                    <span style={{ fontWeight: 600, color: 'var(--w-neutral-800)', fontSize: '0.925rem' }}>
                                        {issue.locationName || issue.location || 'Main Street, Near Metro Station'}
                                    </span>
                                </div>
                                <button 
                                    onClick={handleStartNavigation}
                                    style={{ 
                                        color: '#2563eb', 
                                        fontWeight: 600, 
                                        fontSize: '0.875rem', 
                                        background: 'none', 
                                        border: 'none', 
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                    }}
                                >
                                    Get GPS Directions ↗
                                </button>
                            </div>
                        </div>

                        {/* Task Information Card */}
                        <div className="w-card" style={{ borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: 'white' }}>
                            <div className="w-card-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--w-neutral-100)' }}>
                                <h3 className="w-card-title" style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Task Information</h3>
                            </div>
                            <div className="w-card-body" style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--w-neutral-500)', marginBottom: '0.25rem' }}>Category</div>
                                        <div style={{ fontWeight: 600, color: 'var(--w-neutral-800)', textTransform: 'capitalize' }}>{issue.category}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--w-neutral-500)', marginBottom: '0.25rem' }}>Reported</div>
                                        <div style={{ fontWeight: 600, color: 'var(--w-neutral-800)' }}>{new Date(issue.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--w-neutral-500)', marginBottom: '0.25rem' }}>Due By</div>
                                        <div style={{ fontWeight: 600, color: issue.sla?.isBreached ? 'var(--w-danger)' : 'var(--w-neutral-800)' }}>
                                            {issue.sla?.dueAt ? new Date(issue.sla.dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--w-neutral-500)', marginBottom: '0.5rem' }}>Description</div>
                                    <div style={{ color: 'var(--w-neutral-700)', lineHeight: 1.6, fontSize: '0.875rem' }}>
                                        {issue.description}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Evidence Photos */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="w-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: 'white' }}>
                            <div className="w-card-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--w-neutral-100)' }}>
                                <h3 className="w-card-title" style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Evidence Photos</h3>
                            </div>
                            <div className="w-card-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
                                
                                {/* Citizen Photo */}
                                <div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--w-neutral-800)', marginBottom: '0.5rem' }}>Citizen Report (Before)</div>
                                    {issue.images && issue.images.length > 0 ? (
                                        <img 
                                            src={issue.images[0].startsWith('http') ? issue.images[0] : (issue.images[0].startsWith('/') ? issue.images[0] : `/${issue.images[0]}`)} 
                                            alt="Before" 
                                            style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--w-neutral-200)' }} 
                                        />
                                    ) : (
                                        <div style={{ width: '100%', height: '200px', backgroundColor: 'var(--w-neutral-100)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--w-neutral-400)', border: '1px dashed var(--w-neutral-300)' }}>
                                            No photos provided
                                        </div>
                                    )}
                                </div>

                                {/* Worker Action Area */}
                                {isAssigned && (
                                    <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
                                        <button className="w-btn w-btn-primary" style={{ width: '100%', padding: '0.875rem', fontSize: '1rem' }} onClick={handleStartWork}>
                                            Start Task
                                        </button>
                                    </div>
                                )}

                                {isCompleted && (
                                    <div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--w-neutral-800)', marginBottom: '0.5rem' }}>Your Resolution (After)</div>
                                        {issue.proofOfWork && issue.proofOfWork.length > 0 ? (
                                            <img 
                                                src={issue.proofOfWork[0].startsWith('http') ? issue.proofOfWork[0] : (issue.proofOfWork[0].startsWith('/') ? issue.proofOfWork[0] : `/${issue.proofOfWork[0]}`)} 
                                                alt="After" 
                                                style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--w-neutral-200)' }} 
                                            />
                                        ) : (
                                            <div style={{ width: '100%', height: '200px', backgroundColor: '#f0fdf4', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 500 }}>
                                                Task marked as completed!
                                            </div>
                                        )}
                                        {issue.resolutionNotes && (
                                            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--w-neutral-50)', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--w-neutral-700)' }}>
                                                <strong>Notes:</strong> {issue.resolutionNotes}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {isInProgress && (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--w-neutral-800)', marginBottom: '0.5rem' }}>Upload After Photo</div>
                                        
                                        <label style={{ flex: 1, minHeight: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--w-neutral-300)', borderRadius: '8px', backgroundColor: 'var(--w-neutral-50)', cursor: 'pointer', padding: '1rem', marginBottom: '1rem' }}>
                                            <span style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--w-neutral-400)' }}>📸</span>
                                            <span style={{ fontSize: '0.875rem', color: 'var(--w-neutral-600)', fontWeight: 500 }}>
                                                {proofImage ? proofImage.name : 'Click to upload or drag and drop'}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--w-neutral-400)', marginTop: '0.25rem' }}>PNG, JPG up to 10MB</span>
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                onChange={(e) => setProofImage(e.target.files[0])} 
                                                style={{ display: 'none' }} 
                                            />
                                        </label>

                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--w-neutral-800)', marginBottom: '0.5rem' }}>Resolution Notes (Optional)</label>
                                            <textarea 
                                                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--w-neutral-300)', borderRadius: '8px', resize: 'vertical', minHeight: '80px', fontSize: '0.875rem', fontFamily: 'inherit' }}
                                                placeholder="Add any details about how the issue was resolved..."
                                                value={completionNotes}
                                                onChange={(e) => setCompletionNotes(e.target.value)}
                                            ></textarea>
                                        </div>

                                        <button 
                                            className="w-btn w-btn-success" 
                                            style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                            onClick={handleCompleteWork}
                                            disabled={submitting || !proofImage}
                                        >
                                            {submitting ? 'Submitting...' : (
                                                <><span>✓</span> Mark as Completed</>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Interactive Navigation Options Modal */}
            {navModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '1rem'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '480px',
                        padding: '1.75rem',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        position: 'relative'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                                    🧭 Task Navigation & GPS
                                </h2>
                                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
                                    {issue.locationName || issue.location || 'Main Street, Near Metro Station'}
                                </p>
                            </div>
                            <button 
                                onClick={() => setNavModalOpen(false)}
                                style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Coordinates Box */}
                        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.875rem 1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>DESTINATION COORDINATES</div>
                                <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', marginTop: '0.15rem' }}>
                                    {taskCoords[0].toFixed(5)}° N, {taskCoords[1].toFixed(5)}° E
                                </div>
                            </div>
                            <button 
                                onClick={copyCoordinates}
                                style={{
                                    backgroundColor: copySuccess ? '#22c55e' : '#e2e8f0',
                                    color: copySuccess ? 'white' : '#334155',
                                    border: 'none',
                                    padding: '0.4rem 0.75rem',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {copySuccess ? 'Copied! ✓' : 'Copy'}
                            </button>
                        </div>

                        {/* Navigation Launch Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            <button 
                                onClick={openGoogleMaps}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.625rem',
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.875rem',
                                    borderRadius: '10px',
                                    fontWeight: 600,
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                                }}
                            >
                                <span>🌐</span> Open Turn-by-Turn in Google Maps
                            </button>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <button 
                                    onClick={openWaze}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        backgroundColor: '#059669',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.75rem',
                                        borderRadius: '10px',
                                        fontWeight: 600,
                                        fontSize: '0.875rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <span>🚗</span> Waze
                                </button>
                                <button 
                                    onClick={openAppleMaps}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        backgroundColor: '#475569',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.75rem',
                                        borderRadius: '10px',
                                        fontWeight: 600,
                                        fontSize: '0.875rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <span>🍏</span> Apple Maps
                                </button>
                            </div>
                        </div>

                        {userLocation && (
                            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem', color: '#166534', textAlign: 'center' }}>
                                📍 Live GPS route plotted on task map!
                            </div>
                        )}

                        <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
                            <button 
                                onClick={() => setNavModalOpen(false)}
                                style={{
                                    backgroundColor: '#f1f5f9',
                                    color: '#475569',
                                    border: 'none',
                                    padding: '0.5rem 1.25rem',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskDetails;

