import React, { useState, useEffect } from 'react';

const ModelHealthPanel = ({ onModelUpdated }) => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [training, setTraining] = useState(false);
    const [trainLog, setTrainLog] = useState('');

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/predictions/model-status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setStatus(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRetrain = async () => {
        if (!window.confirm("This will analyze all historical data and rebuild the predictive ML model. Continue?")) return;
        
        try {
            setTraining(true);
            setTrainLog("Training... Building dataset and evaluating chronological splits.");
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/predictions/train', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (res.ok) {
                setTrainLog(`Success: ${data.message}`);
                setStatus(data.metadata); // The API returns metadata which matches status format
                if (onModelUpdated) onModelUpdated();
            } else {
                setTrainLog(`Failed: ${data.message || data.error}`);
            }
        } catch (err) {
            setTrainLog("Server error during training.");
        } finally {
            setTraining(false);
        }
    };

    if (loading) return <div className="card">Loading model health...</div>;

    const isInsufficient = status?.status === 'INSUFFICIENT_DATA' || status?.status === 'NOT_TRAINED';

    return (
        <div className="card model-health-panel" style={{ marginTop: '20px' }}>
            <h3>🧠 Model Health</h3>
            
            {isInsufficient ? (
                <div className="alert alert-warning">
                    <strong>Model unavailable — more historical data required.</strong>
                    <p>
                        Current Status: {status?.status}<br/>
                        Training requires at least chronological observations of recurring problems over time.
                    </p>
                </div>
            ) : (
                <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                    <div>
                        <small>Status</small>
                        <div style={{ fontWeight: 'bold', color: status?.status === 'READY' ? 'green' : 'orange' }}>{status?.status}</div>
                    </div>
                    <div>
                        <small>Version</small>
                        <div style={{ fontWeight: 'bold' }}>{status?.modelVersion}</div>
                    </div>
                    <div>
                        <small>F1 Score (RF)</small>
                        <div style={{ fontWeight: 'bold' }}>{status?.metrics?.f1 || 'N/A'}</div>
                    </div>
                    <div>
                        <small>F1 Score (Baseline)</small>
                        <div style={{ fontWeight: 'bold' }}>{status?.baselineMetrics?.f1 || 'N/A'}</div>
                    </div>
                    <div>
                        <small>Training Samples</small>
                        <div style={{ fontWeight: 'bold' }}>{status?.trainingSamples || 0}</div>
                    </div>
                    <div>
                        <small>Test Samples</small>
                        <div style={{ fontWeight: 'bold' }}>{status?.testSamples || 0}</div>
                    </div>
                </div>
            )}

            <div style={{ marginTop: '20px' }}>
                <button 
                    className="btn btn-primary w-100" 
                    onClick={handleRetrain} 
                    disabled={training}
                >
                    {training ? 'Training...' : '[ RETRAIN MODEL ]'}
                </button>
            </div>
            
            {trainLog && <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', fontSize: '0.9em' }}>{trainLog}</div>}
        </div>
    );
};

export default ModelHealthPanel;
