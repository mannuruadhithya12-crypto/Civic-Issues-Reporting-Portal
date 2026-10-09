import React from 'react';
import Spinner from '../common/Spinner';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function IntelligenceOverview({ intelligence }) {
  if (!intelligence || !intelligence.overview) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', color: 'var(--admin-text-muted)', fontSize: '14px' }}>
      <Spinner /> <span style={{ marginLeft: '8px' }}>Loading intelligence data...</span>
    </div>
  );

  const { overview, trends, departments } = intelligence;

  const trendData = {
      labels: trends?.map(t => t._id) || [],
      datasets: [
          {
              label: 'Issues Reported',
              data: trends?.map(t => t.count) || [],
              borderColor: 'rgba(59, 130, 246, 1)',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              tension: 0.4
          }
      ]
  };

  const deptData = {
      labels: departments?.map(d => d._id || 'Unknown') || [],
      datasets: [
          {
              label: 'Total Issues',
              data: departments?.map(d => d.totalIssues) || [],
              backgroundColor: 'rgba(99, 102, 241, 0.8)',
          },
          {
              label: 'Resolved',
              data: departments?.map(d => d.resolvedCount) || [],
              backgroundColor: 'rgba(34, 197, 94, 0.8)',
          }
      ]
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <div className="kpi-icon blue">📋</div>
            <span className="kpi-title">Total Issues</span>
          </div>
          <div className="kpi-value">{overview?.totalIssues || 0}</div>
        </div>
        
        <div className="kpi-card">
          <div className="kpi-header">
            <div className="kpi-icon yellow">⏳</div>
            <span className="kpi-title">Active</span>
          </div>
          <div className="kpi-value">{overview?.activeIssues || 0}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <div className="kpi-icon green">✅</div>
            <span className="kpi-title">Resolved</span>
          </div>
          <div className="kpi-value">{overview?.resolvedIssues || 0}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <div className="kpi-icon red">🚨</div>
            <span className="kpi-title">SLA Risk</span>
          </div>
          <div className="kpi-value" style={{ color: overview?.overdueIssues > 0 ? 'var(--admin-danger-text)' : 'inherit' }}>
            {overview?.overdueIssues || 0}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <div className="kpi-icon blue">🔥</div>
            <span className="kpi-title">Active Hotspots</span>
          </div>
          <div className="kpi-value">{overview?.hotspotCount || 0}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <div className="kpi-icon yellow">🔄</div>
            <span className="kpi-title">Recurring Areas</span>
          </div>
          <div className="kpi-value">{overview?.recurringCount || 0}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          <div className="admin-card">
              <div className="admin-card-header">
                <h3 className="admin-card-title">Issue Resolution Trends</h3>
              </div>
              <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  {trends && trends.length > 0 ? (
                      <Line data={trendData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }} />
                  ) : (
                      <p style={{ color: 'var(--admin-text-muted)', fontSize: '14px' }}>No trend data available for this timeframe</p>
                  )}
              </div>
          </div>
          <div className="admin-card">
              <div className="admin-card-header">
                <h3 className="admin-card-title">Department Performance</h3>
              </div>
              <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  {departments && departments.length > 0 ? (
                      <Bar data={deptData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }} />
                  ) : (
                      <p style={{ color: 'var(--admin-text-muted)', fontSize: '14px' }}>No department data available</p>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
}

export default IntelligenceOverview;
