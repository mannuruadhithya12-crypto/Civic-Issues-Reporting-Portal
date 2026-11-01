import React, { useState, useEffect } from 'react';
import ModelHealthPanel from './ModelHealthPanel';
import PredictiveRiskMap from './PredictiveRiskMap';
import PredictedRisks from './PredictedRisks';
import api from '../../services/api';

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
            const res = await api.get('/predictions/overview');
            if (res.data) {
                setOverview(res.data);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Error connecting to prediction server.');
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
