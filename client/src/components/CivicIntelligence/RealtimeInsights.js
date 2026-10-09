import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import api from '../../services/api';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

function RealtimeInsights() {
    const [realtimeData, setRealtimeData] = useState({
        feed: [],
        activeUsers: 0,
        issuesPerHour: 0,
        systemStatus: 'Connecting...'
    });

    useEffect(() => {
        const fetchRealtime = async () => {
            try {
                const res = await api.get('/analytics/realtime');
                setRealtimeData(res.data);
            } catch (err) {
                console.error("Realtime fetch failed", err);
                setRealtimeData(prev => ({ ...prev, systemStatus: 'Degraded' }));
            }
        };

        fetchRealtime();
        // Poll every 10 seconds to simulate realtime
        const intervalId = setInterval(fetchRealtime, 10000);
        return () => clearInterval(intervalId);
    }, []);

    const defaultCenter = [40.7128, -74.0060];
    const mapCenter = realtimeData.feed.length > 0 && realtimeData.feed[0].location?.coordinates
        ? [realtimeData.feed[0].location.coordinates[1], realtimeData.feed[0].location.coordinates[0]]
        : defaultCenter;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Realtime Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <Card style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: '#dcfce7', color: '#166534', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '20px' }}>Y></span>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>Active Admins/Workers</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{realtimeData.activeUsers}</div>
                        </div>
                    </Card>
                    <Card style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: '#eff6ff', color: '#1d4ed8', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '20px' }}>YS</span>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>Issues Velocity (per hr)</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{realtimeData.issuesPerHour}</div>
                        </div>
                    </Card>
                    <Card style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: realtimeData.systemStatus === 'Online' ? '#dcfce7' : '#fee2e2', color: realtimeData.systemStatus === 'Online' ? '#166534' : '#991b1b', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '20px', width: '12px', height: '12px', borderRadius: '50%', background: 'currentColor' }}></span>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>System Status</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{realtimeData.systemStatus}</div>
                        </div>
                    </Card>
                </div>

                {/* Live Map */}
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ height: '400px', width: '100%' }}>
                        <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
                            {realtimeData.feed.map(issue => {
                                if (!issue.location?.coordinates) return null;
                                return (
                                    <Marker 
                                        key={issue._id} 
                                        position={[issue.location.coordinates[1], issue.location.coordinates[0]]}
                                    >
                                        <Popup>
                                            <strong>{issue.title}</strong><br/>
                                            {issue.department}<br/>
                                            {new Date(issue.createdAt).toLocaleTimeString()}
                                        </Popup>
                                    </Marker>
                                );
                            })}
                        </MapContainer>
                    </div>
                </Card>
            </div>

            {/* Live Feed */}
            <Card style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>
                        Live Activity Feed
                    </h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '550px', paddingRight: '8px' }}>
                    {realtimeData.feed.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--admin-text-muted)', margin: 'auto' }}>Waiting for activity...</div>
                    ) : (
                        realtimeData.feed.map(issue => (
                            <div key={issue._id} style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                                    {issue.images && issue.images.length > 0 ? (
                                        <img src={issue.images[0].url} alt="Issue" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', background: '#e5e7eb' }}></div>
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>{issue.title}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginBottom: '4px' }}>
                                        New issue reported in {issue.department || 'Unassigned'}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>{new Date(issue.createdAt).toLocaleTimeString()}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Card>
            <style>{`
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                    70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
            `}</style>
        </div>
    );
}

export default RealtimeInsights;
