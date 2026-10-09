import React from 'react';
import Card from '../common/Card';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

function SlaPerformance({ intelligence }) {
    const data = intelligence?.sla;

    if (!data) return <Card className="p-6 text-center text-text-tertiary">No SLA data available.</Card>;

    const lineData = {
        labels: data.complianceTrend?.map(t => t.date) || [],
        datasets: [
            {
                label: 'Compliance Rate',
                data: data.complianceTrend?.map(t => t.complianceRate) || [],
                borderColor: '#3b82f6',
                backgroundColor: 'transparent',
                tension: 0.4
            },
            {
                label: 'Target (90%)',
                data: Array((data.complianceTrend?.length || 0)).fill(90),
                borderColor: '#ef4444',
                borderDash: [5, 5],
                backgroundColor: 'transparent',
                pointRadius: 0
            }
        ]
    };

    const barData = {
        labels: data.departmentPerformance?.map(d => d.department) || [],
        datasets: [
            {
                label: 'Compliance Rate (%)',
                data: data.departmentPerformance?.map(d => d.complianceRate) || [],
                backgroundColor: ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6'],
                borderRadius: 4
            }
        ]
    };

    const lineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: { min: 0, max: 100 }
        }
    };

    const barOptions = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { min: 0, max: 100 }
        },
        plugins: {
            legend: { display: false }
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <Card style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: 'var(--admin-text-muted)', marginBottom: '8px' }}>Overall SLA Compliance</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: data.overallCompliance >= 90 ? 'var(--admin-success)' : 'var(--admin-danger)' }}>
                        {data.overallCompliance}%
                    </div>
                </Card>
                <Card style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: 'var(--admin-text-muted)', marginBottom: '8px' }}>Avg Resolution Time</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--admin-primary)' }}>
                        {data.averageResolutionDays} <span style={{ fontSize: '16px' }}>days</span>
                    </div>
                </Card>
                <Card style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: 'var(--admin-text-muted)', marginBottom: '8px' }}>Breached SLA</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--admin-danger)' }}>
                        {data.breachedSLA}
                    </div>
                </Card>
                <Card style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: 'var(--admin-text-muted)', marginBottom: '8px' }}>On-Time Resolution</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--admin-success)' }}>
                        {data.onTimeResolution}
                    </div>
                </Card>
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <Card>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>SLA Compliance Trend</h3>
                    <div style={{ height: '300px' }}>
                        <Line data={lineData} options={lineOptions} />
                    </div>
                </Card>

                <Card>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Performance by Department</h3>
                    <div style={{ height: '300px' }}>
                        <Bar data={barData} options={barOptions} />
                    </div>
                </Card>
            </div>
        </div>
    );
}

export default SlaPerformance;
