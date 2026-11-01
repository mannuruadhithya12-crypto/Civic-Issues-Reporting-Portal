import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../services/api';

const PredictiveRiskMap = () => {
    const [predictions, setPredictions] = useState([]);
    const [error, setError] = useState(null);

    // Dynamic center from predictions or municipal Bangalore default
    const center = predictions.length > 0 && Array.isArray(predictions[0].location)
        ? [predictions[0].location[0], predictions[0].location[1]]
        : [12.9716, 77.5946]; 

    useEffect(() => {
        const fetchPredictions = async () => {
            try {
                const res = await api.get('/predictions/geographic');
                if (res.data) {
                    setPredictions(res.data);
                }
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to fetch predictions');
            }
        };

        fetchPredictions();
    }, []);

    const getRiskColor = (level) => {
        if (level === 'HIGH') return '#dc3545'; // red
        if (level === 'MEDIUM') return '#ffc107'; // yellow
        return '#28a745'; // green (LOW)
    };

    return (
        <div className="card predictive-map-card">
            <h3>CIVIC RISK MAP</h3>
            {error ? (
                <div className="alert alert-secondary text-center">
                    {error} <br/>
                    Map unavailable until model is trained with sufficient historical data.
                </div>
            ) : (
                <div style={{ height: '400px', width: '100%', position: 'relative' }}>
                    <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%', borderRadius: '8px' }}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {predictions.map((p, idx) => (
                            <Circle
                                key={idx}
                                center={[p.location[0], p.location[1]]}
                                radius={250}
                                pathOptions={{ 
                                    color: getRiskColor(p.riskLevel), 
                                    fillColor: getRiskColor(p.riskLevel), 
                                    fillOpacity: 0.5 
                                }}
                            >
                                <Tooltip>
                                    <strong>Predicted Risk: {p.riskLevel}</strong><br/>
                                    Category: {p.category}<br/>
                                    Score: {p.riskScore}<br/>
                                    <em>Model-estimated risk for next {p.horizonDays} days.</em>
                                </Tooltip>
                            </Circle>
                        ))}
                    </MapContainer>
                    
                    <div className="map-legend" style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.9)', padding: '10px', borderRadius: '5px', boxShadow: '0 0 5px rgba(0,0,0,0.3)' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '0.9em' }}>Risk Levels</div>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#dc3545', marginRight: '5px', borderRadius: '50%' }}></div> <span style={{ fontSize: '0.8em' }}>HIGH</span></div>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#ffc107', marginRight: '5px', borderRadius: '50%' }}></div> <span style={{ fontSize: '0.8em' }}>MEDIUM</span></div>
                        <div style={{ display: 'flex', alignItems: 'center' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#28a745', marginRight: '5px', borderRadius: '50%' }}></div> <span style={{ fontSize: '0.8em' }}>LOW</span></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PredictiveRiskMap;
