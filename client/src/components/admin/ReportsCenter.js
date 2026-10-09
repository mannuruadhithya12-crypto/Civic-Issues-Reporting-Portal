import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Spinner from '../common/Spinner';

const REPORT_TYPES = [
    { id: 'Executive Summary', label: 'Executive Operational Summary', desc: 'Overall municipal performance, total volume, resolution rate, and SLA metrics.' },
    { id: 'Department Analysis', label: 'Department Workload & Performance', desc: 'Breakdown of issues, resolution velocity, and active worker distribution by department.' },
    { id: 'Category Analysis', label: 'Category & Hazard Distribution', desc: 'Detailed incidence rates and frequency across all civic categories.' },
    { id: 'Geographic Report', label: 'Geographic Clustering & Heatmap', desc: 'Spatial concentration of incidents and regional hotspots.' },
    { id: 'SLA Performance', label: 'SLA Compliance & Breach Analysis', desc: 'Deadlines, breach frequencies, resolution turnaround times, and risk metrics.' },
    { id: 'AI Insights Report', label: 'Interventions & RL Readiness', desc: 'Optimization outcomes, policy transitions, and training data readiness.' }
];

const ReportsCenter = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    
    // Generator state
    const [selectedType, setSelectedType] = useState('Executive Summary');
    const [selectedPeriod, setSelectedPeriod] = useState('Last 30 Days');
    const [selectedFormat, setSelectedFormat] = useState('CSV');

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await api.get('/analytics/reports');
            setReports(res.data || []);
        } catch (err) {
            console.error('Failed to fetch reports:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        setGenerating(true);
        try {
            const res = await api.post('/analytics/reports/generate', {
                type: selectedType,
                period: selectedPeriod,
                format: selectedFormat
            });
            setReports(prev => [res.data, ...prev]);
            alert(`Report "${res.data.name}" generated successfully!`);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to generate report');
        } finally {
            setGenerating(false);
        }
    };

    const handleDownload = async (fileUrl, reportName) => {
        try {
            const res = await api.get(fileUrl || '/issues/export', { responseType: 'blob' });
            const blob = new Blob([res.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(reportName || 'civic_report').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Failed to download report file');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this report record?')) return;
        try {
            await api.delete(`/analytics/reports/${id}`);
            setReports(prev => prev.filter(r => r._id !== id));
        } catch (err) {
            alert('Failed to delete report');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header */}
            <div>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Reports & Data Export</h1>
                <p style={{ color: 'var(--admin-text-muted)', margin: 0, fontSize: '14px' }}>
                    Generate municipal performance audits, department summaries, and raw civic records for municipal transparency.
                </p>
            </div>

            {/* Top Grid: Report Generator + Quick Export */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                
                {/* Custom Report Generator */}
                <div className="admin-card">
                    <h3 className="admin-card-title" style={{ marginBottom: '16px' }}>Generate Administrative Report</h3>
                    <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Report Type</label>
                            <select 
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                className="admin-select"
                                style={{ width: '100%' }}
                            >
                                {REPORT_TYPES.map(t => (
                                    <option key={t.id} value={t.id}>{t.label}</option>
                                ))}
                            </select>
                            <p style={{ fontSize: '11px', color: 'var(--admin-text-muted)', margin: '4px 0 0 0' }}>
                                {REPORT_TYPES.find(t => t.id === selectedType)?.desc}
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Timeframe</label>
                                <select 
                                    value={selectedPeriod}
                                    onChange={(e) => setSelectedPeriod(e.target.value)}
                                    className="admin-select"
                                    style={{ width: '100%' }}
                                >
                                    <option value="Last 7 Days">Last 7 Days</option>
                                    <option value="Last 30 Days">Last 30 Days</option>
                                    <option value="Last 90 Days">Last 90 Days</option>
                                    <option value="Year to Date">Year to Date</option>
                                    <option value="All Time">All Time</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Format</label>
                                <select 
                                    value={selectedFormat}
                                    onChange={(e) => setSelectedFormat(e.target.value)}
                                    className="admin-select"
                                    style={{ width: '100%' }}
                                >
                                    <option value="CSV">CSV Data File</option>
                                    <option value="JSON">JSON Export</option>
                                </select>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="admin-btn admin-btn-primary" 
                            style={{ width: '100%', marginTop: '8px' }}
                            disabled={generating}
                        >
                            {generating ? 'Generating Report...' : '📄 Generate & Archive Report'}
                        </button>
                    </form>
                </div>

                {/* Instant Export Card */}
                <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <h3 className="admin-card-title" style={{ marginBottom: '8px' }}>Instant Database CSV Export</h3>
                        <p style={{ fontSize: '13px', color: 'var(--admin-text-muted)', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                            Export all current civic issues directly from the primary database, including identifiers, categories, current lifecycle status, assigned workers, and location coordinates.
                        </p>
                        <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--admin-border)', fontSize: '12px', color: 'var(--admin-text-muted)' }}>
                            <div style={{ marginBottom: '4px' }}>• Output Format: RFC 4180 Standard CSV</div>
                            <div style={{ marginBottom: '4px' }}>• Content: All reported civic incidents</div>
                            <div>• Encoding: UTF-8</div>
                        </div>
                    </div>
                    <button 
                        onClick={() => handleDownload('/issues/export', 'complete_civic_issues_database')}
                        className="admin-btn admin-btn-secondary"
                        style={{ width: '100%', marginTop: '16px' }}
                    >
                        ⬇ Download Full Issues CSV
                    </button>
                </div>
            </div>

            {/* Report Archive & History */}
            <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--admin-border)', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="admin-card-title">Generated Reports Archive</h3>
                    <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>{reports.length} reports archived</span>
                </div>

                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Report Name</th>
                                <th>Category / Type</th>
                                <th>Time Period</th>
                                <th>Generated At</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px' }}><Spinner /></td>
                                </tr>
                            ) : reports.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--admin-text-muted)' }}>
                                        No reports generated yet. Use the generator above to create an archive.
                                    </td>
                                </tr>
                            ) : (
                                reports.map(r => (
                                    <tr key={r._id}>
                                        <td style={{ fontWeight: '600', color: 'var(--admin-text-main)' }}>{r.name}</td>
                                        <td>
                                            <span className="admin-badge neutral">{r.type}</span>
                                        </td>
                                        <td>{r.period}</td>
                                        <td style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
                                            {new Date(r.createdAt).toLocaleString()}
                                        </td>
                                        <td>
                                            <span className="admin-badge success">{r.status || 'Completed'}</span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button 
                                                onClick={() => handleDownload(r.fileUrl, r.name)}
                                                className="admin-btn admin-btn-secondary"
                                                style={{ padding: '4px 10px', fontSize: '12px', marginRight: '8px' }}
                                            >
                                                ⬇ Download
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(r._id)}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}
                                                title="Delete Record"
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReportsCenter;
