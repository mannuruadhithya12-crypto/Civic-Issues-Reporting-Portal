import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Card from '../common/Card';

function resolveLatLng(c) {
  if (!c) return null;
  if (typeof c.latitude === 'number' && typeof c.longitude === 'number') {
    return [c.latitude, c.longitude];
  }
  if (typeof c.lat === 'number' && typeof c.lng === 'number') {
    return [c.lat, c.lng];
  }
  if (Array.isArray(c) && c.length >= 2) {
    const v0 = Number(c[0]);
    const v1 = Number(c[1]);
    if (isNaN(v0) || isNaN(v1)) return null;
    // If longitude is first (> 90 or < -90) and latitude second
    if (Math.abs(v0) > 90 && Math.abs(v1) <= 90) {
      return [v1, v0];
    }
    return [v0, v1];
  }
  return null;
}

function resolveHotspotPos(hotspot) {
  if (!hotspot) return null;
  if (hotspot.center && typeof hotspot.center.latitude === 'number') {
    return [hotspot.center.latitude, hotspot.center.longitude];
  }
  if (hotspot.centerCoordinates) {
    return resolveLatLng(hotspot.centerCoordinates);
  }
  if (hotspot.coordinates && Array.isArray(hotspot.coordinates) && hotspot.coordinates.length >= 2) {
    return [hotspot.coordinates[1], hotspot.coordinates[0]];
  }
  return null;
}

function IssueHeatmap({ data }) {
  if (!data || (!data.hotspots?.length && !data.clusters?.length)) {
    return (
      <Card className="p-6 text-center text-text-tertiary">
        No geographic hotspot data available for this period.
      </Card>
    );
  }

  // Determine center based on first real hotspot or cluster, falling back to municipal center
  let center = [12.9716, 77.5946];
  if (data.hotspots && data.hotspots.length > 0) {
    const resolved = resolveHotspotPos(data.hotspots[0]);
    if (resolved) center = resolved;
  } else if (data.clusters && data.clusters.length > 0) {
    const first = data.clusters[0];
    if (first.centerLat && first.centerLon) center = [first.centerLat, first.centerLon];
  }

  return (
    <Card className="h-full flex flex-col">
      <h3 className="text-xl font-bold text-text-primary mb-2">Geographic Hotspots (DBSCAN)</h3>
      <p className="text-sm text-text-secondary mb-4">
        Red circles indicate dense civic issue hotspots. Blue markers indicate isolated minor clusters.
      </p>
      
      <div className="flex-1 min-h-[300px] w-full rounded-xl overflow-hidden border border-light z-0">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Render minor clusters */}
          {data.clusters && data.clusters.map((cluster, idx) => {
            const pos = [cluster.centerLat, cluster.centerLon];
            if (isNaN(pos[0]) || isNaN(pos[1])) return null;

            return (
              <CircleMarker
                key={`cluster-${cluster.id || idx}`}
                center={pos}
                radius={Math.max(5, Math.min(20, (cluster.count || cluster.issueCount || 1) * 2))}
                pathOptions={{ color: '#0284c7', fillColor: '#0284c7', fillOpacity: 0.4 }}
              >
                <Popup>
                  <div className="p-1">
                    <strong className="block text-text-primary mb-1">Minor Cluster</strong>
                    <span className="text-sm text-text-secondary">Issues: {cluster.count || cluster.issueCount}</span>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* Render Hotspots with real DBSCAN radius */}
          {data.hotspots && data.hotspots.map((hotspot) => {
            const hotspotPos = resolveHotspotPos(hotspot);
            if (!hotspotPos) return null;

            const isCritical = hotspot.severityLevel === 'CRITICAL' || hotspot.topSeverity === 'CRITICAL';
            const color = isCritical ? '#ef4444' : '#f59e0b';

            return (
              <Circle
                key={`hotspot-${hotspot.id}`}
                center={hotspotPos}
                radius={hotspot.radiusMeters || 150}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.5, weight: 2 }}
              >
                <Popup>
                  <div className="p-1 min-w-[160px]">
                    <h4 className="m-0 mb-2 font-bold flex items-center gap-1" style={{ color }}>
                      🔥 {hotspot.dominantDepartment || hotspot.topCategory || 'Hotspot'}
                    </h4>
                    <div className="text-sm text-text-secondary mb-1">
                      <strong className="text-text-primary">Issues:</strong> {hotspot.issueCount}
                    </div>
                    <div className="text-sm text-text-secondary mb-1">
                      <strong className="text-text-primary">Radius:</strong> {hotspot.radiusMeters || 150}m
                    </div>
                    {hotspot.densityPerSqKm && (
                      <div className="text-sm text-text-secondary mb-1">
                        <strong className="text-text-primary">Density:</strong> {hotspot.densityPerSqKm}/km²
                      </div>
                    )}
                    <div className="text-sm text-text-secondary">
                      <strong className="text-text-primary">Severity:</strong> {hotspot.severityLevel || hotspot.topSeverity || 'Medium'}
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 text-xs">
                      <span style={{ color: '#4f46e5', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ✨ AI Explain in Geographic Analysis
                      </span>
                    </div>
                  </div>
                </Popup>
              </Circle>
            );
          })}

        </MapContainer>
      </div>
    </Card>
  );
}

export default IssueHeatmap;
