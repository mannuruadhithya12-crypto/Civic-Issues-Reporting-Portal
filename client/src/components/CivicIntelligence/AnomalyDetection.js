import React from 'react';
import Card from '../common/Card';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function AnomalyDetection({ intelligence }) {
    const data = intelligence?.anomalies;

    if (!data) return <Card className="p-6 text-center text-text-tertiary">No anomaly data available.</Card>;

    const lineData = {
        labels: data.trend?.map(t => t.date) || [],
        datasets: [
            {
                label: 'Normal Activity',
                data: data.trend?.map(t => t.normal) || [],
                borderColor: '#3b82f6',
                backgroundColor: 'transparent',
                tension: 0.4
            },
            {
                label: 'Anomalies Detected',
                data: data.trend?.map(t => t.anomaly) || [],
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true,
                tension: 0.4
            }
        ]
    };

    const lineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' }
        },
        scales: {
            y: { beginAtZero: true }
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <Card style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Detected Anomalies</h3>
                    <span style={{ background: '#fef2f2', color: '#ef4444', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '600' }}>
                        {data.anomalies?.length || 0} Active Alerts
                    </span>
                </div>
                
                {data.anomalies?.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--admin-text-muted)', margin: 'auto', padding: '40px 0' }}>
                        No anomalies detected in the current timeframe.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, maxHeight: '400px' }}>
                        {data.anomalies?.map((anomaly, idx) => (
                            <div key={idx} style={{ border: '1px solid var(--admin-border)', borderRadius: '8px', padding: '16px', background: anomaly.severity === 'High' ? '#fff5f5' : '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <strong style={{ fontSize: '14px', color: anomaly.severity === 'High' ? '#b91c1c' : 'var(--admin-text)' }}>{anomaly.title}</strong>
                                    <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>{new Date(anomaly.timestamp).toLocaleString()}</span>
                                </div>
                                <p style={{ fontSize: '13px', margin: '0 0 8px 0', color: 'var(--admin-text-muted)' }}>{anomaly.description}</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: anomaly.severity === 'High' ? '#fee2e2' : '#fef3c7', color: anomaly.severity === 'High' ? '#991b1b' : '#92400e', fontWeight: '600' }}>
                                        Severity: {anomaly.severity}
                                    </span>
                                    <button style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>Investigate &rarr;</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Card>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Anomaly Trend</h3>
                <div style={{ height: '400px' }}>
                    <Line data={lineData} options={lineOptions} />
                </div>
            </Card>
        </div>
    );
}

export default AnomalyDetection;
