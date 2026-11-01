import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const PredictedRisks = () => {
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPredictions = async () => {
            try {
                const res = await api.get('/predictions/geographic');
                if (res.data) {
                    setPredictions(res.data);
                }
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to fetch predictions');
            } finally {
                setLoading(false);
            }
        };

        fetchPredictions();
    }, []);

    if (loading) return <div>Loading risks...</div>;
    
    if (error) return (
        <div className="card">
            <h3>Top Predicted Risks</h3>
            <div className="alert alert-secondary">{error}</div>
        </div>
    );

    if (predictions.length === 0) return (
        <div className="card">
            <h3>Top Predicted Risks</h3>
            <p>No elevated risks predicted in the current horizon.</p>
        </div>
    );

    // Sort to show HIGHEST risks first
    const sorted = [...predictions].sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);

    return (
        <div className="predicted-risks-list">
            <h3>Top Predicted Risks</h3>
            {sorted.map((p, index) => (
                <div key={index} className="card risk-item-card" style={{ marginBottom: '15px' }}>
                    <div className="d-flex justify-content-between">
                        <h4 style={{ margin: 0 }}>📍 LAT: {p.location[0].toFixed(3)}, LON: {p.location[1].toFixed(3)}</h4>
                        <span className={`badge ${p.riskLevel === 'HIGH' ? 'bg-danger' : 'bg-warning'}`}>
                            {p.riskLevel}
                        </span>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                        <strong>Category:</strong> {p.category}
                    </div>
                    <div>
                        <strong>Predicted Risk:</strong> {p.riskScore} / 100
                    </div>
                    <div>
                        <strong>Horizon:</strong> Next {p.horizonDays} days
                    </div>
                    
                    <div style={{ marginTop: '10px', fontSize: '0.9em' }}>
                        <strong>Why:</strong>
                        <ul style={{ paddingLeft: '20px', marginBottom: '5px' }}>
                            {p.factors.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                    </div>
                    
                    <div style={{ marginTop: '10px', fontSize: '0.8em', color: '#6c757d' }}>
                        Model: v{p.modelVersion} | Generated: {new Date(p.generatedAt).toLocaleString()}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PredictedRisks;
