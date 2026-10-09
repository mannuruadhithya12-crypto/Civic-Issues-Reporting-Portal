import React, { useMemo } from 'react';
import Card from '../common/Card';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function GeographicAnalysis({ intelligence }) {
    const geographicData = intelligence?.geographic || { clusters: [], hotspots: [] };
    
    // Sort clusters by count to find top locations
    const topLocations = useMemo(() => {
        if (!geographicData.clusters) return [];
        return [...geographicData.clusters].sort((a, b) => b.count - a.count).slice(0, 5);
    }, [geographicData]);

    const defaultCenter = [40.7128, -74.0060];
    
    // Auto-center map based on data
    const mapCenter = useMemo(() => {
        if (topLocations.length > 0 && topLocations[0].center) {
            return [topLocations[0].center[1], topLocations[0].center[0]];
        }
        return defaultCenter;
    }, [topLocations]);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            <Card style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ height: '500px', width: '100%' }}>
                    <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
                        
                        {geographicData.clusters?.map((cluster, idx) => {
                            if (!cluster.center || cluster.center.length < 2) return null;
                            const isHotspot = geographicData.hotspots?.some(h => h._id === cluster._id);
                            
                            return (
                                <CircleMarker
                                    key={idx}
                                    center={[cluster.center[1], cluster.center[0]]}
                                    radius={Math.max(10, Math.min(30, cluster.count * 2))}
                                    fillColor={isHotspot ? "#ef4444" : (cluster.count > 5 ? "#f59e0b" : "#3b82f6")}
                                    color={isHotspot ? "#b91c1c" : (cluster.count > 5 ? "#d97706" : "#2563eb")}
                                    weight={2}
                                    opacity={0.8}
                                    fillOpacity={0.5}
                                >
                                    <Popup>
                                        <div style={{ padding: '4px' }}>
                                            <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>{cluster._id}</strong>
                                            <span>{cluster.count} issues reported</span>
                                            {isHotspot && <span style={{ display: 'block', color: 'red', fontWeight: 'bold', marginTop: '4px' }}>🔥 Active Hotspot</span>}
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            );
                        })}
                    </MapContainer>
                </div>
            </Card>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <Card>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Top Issue Locations</h3>
                    {topLocations.length === 0 ? (
                        <p style={{ color: 'var(--admin-text-muted)' }}>No location data available.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {topLocations.map((loc, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{loc._id}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>{loc.count} issues</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>Location Insights</h3>
                    {topLocations.length > 0 ? (
                        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                            <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                                The highest issue density is observed in <strong>{topLocations[0]._id}</strong> with {topLocations[0].count} reports. Consider allocating more resources to this area.
                            </p>
                        </div>
                    ) : (
                        <p style={{ color: 'var(--admin-text-muted)' }}>Insufficient data for insights.</p>
                    )}
                </Card>
            </div>
        </div>
    );
}

export default GeographicAnalysis;
