import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Card from '../common/Card';

function IssueHeatmap({ data }) {
  if (!data || (!data.hotspots?.length && !data.clusters?.length)) {
    return <Card className="p-6 text-center text-text-tertiary">No geographic data available for this period.</Card>;
  }

  // Determine center based on first hotspot or cluster
  let center = [51.505, -0.09];
  if (data.hotspots && data.hotspots.length > 0) {
    center = data.hotspots[0].center;
  } else if (data.clusters && data.clusters.length > 0) {
    center = [data.clusters[0].centerLat, data.clusters[0].centerLon];
  }

  return (
    <Card className="h-full flex flex-col">
      <h3 className="text-xl font-bold text-text-primary mb-2">Geographic Hotspots</h3>
      <p className="text-sm text-text-secondary mb-4">
        Red circles indicate active hotspots. Blue circles indicate isolated clusters.
      </p>
      
      <div className="flex-1 min-h-[300px] w-full rounded-xl overflow-hidden border border-light z-0">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Render regular clusters */}
          {data.clusters && data.clusters.map(cluster => (
            <CircleMarker
              key={`cluster-${cluster.id || Math.random()}`}
              center={[cluster.centerLat, cluster.centerLon]}
              radius={Math.max(5, Math.min(20, cluster.count * 2))}
              pathOptions={{ color: '#0284c7', fillColor: '#0284c7', fillOpacity: 0.4 }}
            >
              <Popup>
                <div className="p-1">
                  <strong className="block text-text-primary mb-1">Minor Cluster</strong>
                  <span className="text-sm text-text-secondary">Issues: {cluster.count}</span>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Render Hotspots */}
          {data.hotspots && data.hotspots.map(hotspot => (
            <Circle
              key={`hotspot-${hotspot.id}`}
              center={hotspot.center}
              radius={150} // Fixed radius for hotspots visualization
              pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.6 }}
            >
              <Popup>
                <div className="p-1 min-w-[150px]">
                  <h4 className="m-0 mb-2 text-danger-600 font-bold flex items-center gap-1">🔥 Hotspot</h4>
                  <div className="text-sm text-text-secondary mb-1"><strong className="text-text-primary">Total Issues:</strong> {hotspot.issueCount}</div>
                  <div className="text-sm text-text-secondary mb-1"><strong className="text-text-primary">Category:</strong> {hotspot.topCategory}</div>
                  <div className="text-sm text-text-secondary"><strong className="text-text-primary">Severity:</strong> {hotspot.topSeverity}</div>
                </div>
              </Popup>
            </Circle>
          ))}

        </MapContainer>
      </div>
    </Card>
  );
}

export default IssueHeatmap;
