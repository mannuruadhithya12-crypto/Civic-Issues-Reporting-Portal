import React, { useState, useEffect } from 'react';
import ModelHealthPanel from './ModelHealthPanel';
import PredictiveRiskMap from './PredictiveRiskMap';
import PredictedRisks from './PredictedRisks';

const PredictiveDashboard = ({ user }) => {
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchOverview();
    }, []);

    const fetchOverview = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/predictions/overview', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setOverview(data);
            } else {
                setError(data.error || 'Failed to load predictive overview');
            }
        } catch (err) {
            setError('Error connecting to prediction server.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading-spinner">Loading Predictive Intelligence...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="predictive-dashboard">
            <header className="dashboard-header">
                <h2>🔮 Predictive Civic Intelligence</h2>
                <p>Estimate which areas and categories may require attention during the future horizon.</p>
            </header>

            <div className="predictive-overview-cards">
                <div className="card risk-card high-risk">
                    <h3>🔴 High Risk Areas</h3>
                    <div className="big-number">{overview?.highRiskAreas || 0}</div>
                </div>
                <div className="card risk-card medium-risk">
                    <h3>🟡 Medium Risk Areas</h3>
                    <div className="big-number">{overview?.mediumRiskAreas || 0}</div>
                </div>
                <div className="card risk-card sla-risk">
                    <h3>⚠️ High Risk Categories</h3>
                    <div className="big-number">{overview?.highRiskCategories || 0}</div>
                </div>
            </div>

            <div className="predictive-main-content">
                <div className="predictive-left-col">
                    <PredictiveRiskMap />
                </div>
                <div className="predictive-right-col">
                    <PredictedRisks />
                    <ModelHealthPanel onModelUpdated={fetchOverview} />
                </div>
            </div>
        </div>
    );
};

export default PredictiveDashboard;
