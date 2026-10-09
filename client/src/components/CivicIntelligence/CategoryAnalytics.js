import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import Card from '../common/Card';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title);

const CATEGORY_ICONS = {
    "Potholes": "🚧",
    "Garbage overflow": "🗑️",
    "Streetlight failures": "💡",
    "Water leakage": "💧",
    "Illegal parking": "🚫",
    "Drainage issues": "🌊",
    "Broken footpaths": "🚶",
    "Noise pollution": "🔊",
    "Sewage problems": "🚰",
    "Public safety issues": "⚠️",
    "Other": "📝"
};

function CategoryAnalytics({ intelligence }) {
    const data = intelligence?.categories || [];
    const trendsData = intelligence?.trends || [];
    
    if (!data || data.length === 0) return <Card className="p-6 text-center text-text-tertiary">No category data available.</Card>;

    // Calculate total issues for donut inner text
    const totalIssues = data.reduce((sum, c) => sum + c.count, 0);

    const donutData = {
        labels: data.map(c => c.category),
        datasets: [{
            data: data.map(c => c.count),
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b', '#06b6d4'],
            borderWidth: 1,
        }]
    };

    const donutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'right' }
        },
        cutout: '70%'
    };

    // Trend data (we use overall trends since category-specific trends require advanced MongoDB pivoting)
    // To approximate the look of the reference image, we can just display the overall trend
    const lineData = {
        labels: trendsData.map(t => t.date),
        datasets: [
            {
                label: 'Total Issues',
                data: trendsData.map(t => t.count),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4
            },
            {
                label: 'Resolved',
                data: trendsData.map(t => t.resolved),
                borderColor: '#10b981',
                backgroundColor: 'transparent',
                borderDash: [5, 5],
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Top Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                {data.slice(0, 5).map((cat, idx) => {
                    const icon = CATEGORY_ICONS[cat.category] || CATEGORY_ICONS['Other'];
                    return (
                        <Card key={idx} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                                <div style={{ fontSize: '24px', background: 'var(--admin-background)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {icon}
                                </div>
                            </div>
                            <div style={{ textAlign: 'center', fontWeight: '500', fontSize: '13px', color: 'var(--admin-text-muted)' }}>
                                {cat.category}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 'auto' }}>
                                <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{cat.count}</span>
                                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--admin-success)' }}>
                                    Y"' {Math.round((cat.count / totalIssues) * 100)}%
                                </span>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                <Card>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Category Distribution</h3>
                    <div style={{ height: '300px', position: 'relative' }}>
                        <Doughnut data={donutData} options={donutOptions} />
                        <div style={{ position: 'absolute', top: '50%', left: '30%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--admin-text)' }}>{totalIssues}</div>
                            <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>Total Issues</div>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Category Trends</h3>
                    <div style={{ height: '300px' }}>
                        <Line data={lineData} options={lineOptions} />
                    </div>
                </Card>
            </div>
        </div>
    );
}

export default CategoryAnalytics;
