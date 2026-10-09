import React, { useState } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import api from '../../services/api';

function ReportsExport({ intelligence }) {
    const [reports, setReports] = useState(intelligence?.reports || []);
    const [generating, setGenerating] = useState(false);
    
    // Form state
    const [reportType, setReportType] = useState('Executive Summary');
    const [dateRange, setDateRange] = useState('Last 30 Days');
    const [format, setFormat] = useState('CSV');

    const handleGenerate = async (e) => {
        e.preventDefault();
        setGenerating(true);
        try {
            const res = await api.post('/analytics/reports/generate', {
                type: reportType,
                period: dateRange
            });
            // Add to top of list
            setReports([res.data, ...reports]);
        } catch (err) {
            console.error(err);
            alert('Failed to generate report');
        } finally {
            setGenerating(false);
        }
    };

    const handleDownload = async (url, filename) => {
        try {
            const res = await api.get(url, { responseType: 'blob' });
            const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', `${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download report');
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            <Card>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Generate Custom Report</h3>
                <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--admin-text)' }}>Report Type</label>
                        <select 
                            className="admin-input" 
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--admin-border)' }}
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                        >
                            <option>Executive Summary</option>
                            <option>Department Analysis</option>
                            <option>Category Analysis</option>
                            <option>Geographic Report</option>
                            <option>SLA Performance</option>
                            <option>Trend Analysis</option>
                            <option>AI Insights Report</option>
                            <option>Custom Report</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--admin-text)' }}>Date Range</label>
                        <select 
                            className="admin-input" 
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--admin-border)' }}
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                        >
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                            <option>Last 90 Days</option>
                            <option>Year to Date</option>
                            <option>Custom Range</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--admin-text)' }}>Format</label>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                <input type="radio" name="format" value="CSV" checked={format === 'CSV'} onChange={(e) => setFormat(e.target.value)} /> CSV
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                <input type="radio" name="format" value="PDF" checked={format === 'PDF'} onChange={(e) => setFormat(e.target.value)} disabled /> PDF (Coming Soon)
                            </label>
                        </div>
                    </div>

                    <Button type="submit" variant="primary" style={{ marginTop: '16px', width: '100%' }} disabled={generating}>
                        {generating ? 'Generating...' : 'Generate Report'}
                    </Button>
                </form>
            </Card>

            <Card>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Report History</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                                <th style={{ padding: '12px 8px' }}>Report Name</th>
                                <th style={{ padding: '12px 8px' }}>Generated On</th>
                                <th style={{ padding: '12px 8px' }}>Period</th>
                                <th style={{ padding: '12px 8px' }}>Status</th>
                                <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>No reports generated yet.</td>
                                </tr>
                            ) : (
                                reports.map((report) => (
                                    <tr key={report._id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                        <td style={{ padding: '12px 8px', fontWeight: '500' }}>{report.name}</td>
                                        <td style={{ padding: '12px 8px', color: 'var(--admin-text-muted)' }}>{new Date(report.createdAt).toLocaleDateString()}</td>
                                        <td style={{ padding: '12px 8px' }}>{report.period}</td>
                                        <td style={{ padding: '12px 8px' }}>
                                            <span style={{ 
                                                background: report.status === 'Completed' ? '#dcfce7' : '#f3f4f6', 
                                                color: report.status === 'Completed' ? '#166534' : '#374151',
                                                padding: '4px 8px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: '500'
                                            }}>
                                                {report.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                                            <button 
                                                onClick={() => handleDownload(report.fileUrl, report.name)}
                                                style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: '500' }}
                                                disabled={report.status !== 'Completed'}
                                            >
                                                Download
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

export default ReportsExport;
