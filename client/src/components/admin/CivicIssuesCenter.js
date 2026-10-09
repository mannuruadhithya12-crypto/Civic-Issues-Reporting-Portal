import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import Spinner from '../common/Spinner';

const DEPARTMENTS = [
    'Potholes',
    'Garbage overflow',
    'Streetlight failures',
    'Water leakage',
    'Illegal parking',
    'Drainage issues',
    'Broken footpaths',
    'Noise pollution',
    'Sewage problems',
    'Public safety issues',
    'Other'
];

const CivicIssuesCenter = ({ workers = [], onIssueUpdated }) => {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [searchParams] = useSearchParams();

    // Filters and sorting
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [workerFilter, setWorkerFilter] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Modals
    const [assignModal, setAssignModal] = useState(false);
    const [selectedWorkerId, setSelectedWorkerId] = useState('');
    const [statusModal, setStatusModal] = useState(false);
    const [targetStatus, setTargetStatus] = useState('');
    const [adminComment, setAdminComment] = useState('');
    const [viewingProof, setViewingProof] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const querySearch = searchParams.get('search');
        if (querySearch) setSearch(querySearch);
        const highlightId = searchParams.get('highlight');
        fetchIssues(highlightId);
    }, [searchParams]);

    const fetchIssues = async (highlightId = null) => {
        setLoading(true);
        try {
            const res = await api.get('/issues');
            setIssues(res.data);
            if (highlightId) {
                const found = res.data.find(i => i._id === highlightId);
                if (found) setSelectedIssue(found);
            }
        } catch (err) {
            console.error('Failed to fetch issues:', err);
        } finally {
            setLoading(false);
        }
    };

    // Filter & sort
    const filteredIssues = issues.filter(issue => {
        if (statusFilter && issue.status !== statusFilter) return false;
        if (departmentFilter && issue.department !== departmentFilter) return false;
        if (priorityFilter && issue.priority !== priorityFilter) return false;
        if (workerFilter) {
            const assignedId = issue.assignedTo?._id || issue.assignedTo;
            if (assignedId !== workerFilter) return false;
        }
        if (search) {
            const q = search.toLowerCase();
            const idMatch = issue._id.toLowerCase().includes(q);
            const titleMatch = issue.title?.toLowerCase().includes(q);
            const descMatch = issue.description?.toLowerCase().includes(q);
            const locMatch = (issue.locationName || issue.location || '').toLowerCase().includes(q);
            if (!idMatch && !titleMatch && !descMatch && !locMatch) return false;
        }
        return true;
    });

    const sortedIssues = [...filteredIssues].sort((a, b) => {
        if (sortBy === 'priority') {
            const order = { urgent: 4, high: 3, normal: 2, low: 1 };
            return (order[b.priority] || 2) - (order[a.priority] || 2);
        }
        if (sortBy === 'oldest') {
            return new Date(a.createdAt) - new Date(b.createdAt);
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const totalPages = Math.ceil(sortedIssues.length / itemsPerPage);
    const paginatedIssues = sortedIssues.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Operational Actions
    const handleVerify = async (issueId) => {
        setActionLoading(true);
        try {
            const res = await api.patch(`/issues/${issueId}/verify`);
            alert("Issue verified successfully. SLA initialized.");
            updateLocalIssue(res.data);
        } catch (err) {
            alert(err.response?.data?.message || "Failed to verify issue");
        } finally {
            setActionLoading(false);
        }
    };

    const handleAssignWorker = async () => {
        if (!selectedWorkerId) return alert("Select a worker");
        setActionLoading(true);
        try {
            const res = await api.patch(`/issues/${selectedIssue._id}/assign`, { assignedTo: selectedWorkerId });
            alert("Worker assigned successfully!");
            setAssignModal(false);
            updateLocalIssue(res.data);
        } catch (err) {
            alert(err.response?.data?.message || "Failed to assign worker");
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateStatus = async () => {
        if (!targetStatus) return alert("Select target status");
        setActionLoading(true);
        try {
            const res = await api.patch(`/issues/${selectedIssue._id}/status`, { status: targetStatus });
            alert(`Status updated to ${targetStatus}`);
            setStatusModal(false);
            updateLocalIssue(res.data);
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update status");
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdatePriority = async (newPriority) => {
        setActionLoading(true);
        try {
            const res = await api.put(`/issues/${selectedIssue._id}/priority`, { priority: newPriority });
            updateLocalIssue(res.data);
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update priority");
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!adminComment.trim()) return;
        setActionLoading(true);
        try {
            const res = await api.post(`/issues/${selectedIssue._id}/comments`, { text: adminComment.trim() });
            setAdminComment('');
            updateLocalIssue(res.data);
        } catch (err) {
            alert(err.response?.data?.message || "Failed to add comment");
        } finally {
            setActionLoading(false);
        }
    };

    const updateLocalIssue = (updated) => {
        setIssues(prev => prev.map(i => i._id === updated._id ? { ...i, ...updated } : i));
        if (selectedIssue && selectedIssue._id === updated._id) {
            setSelectedIssue(prev => ({ ...prev, ...updated }));
        }
        if (onIssueUpdated) onIssueUpdated();
    };

    const getPriorityBadgeClass = (priority) => {
        switch (priority) {
            case 'urgent': return 'admin-badge danger';
            case 'high': return 'admin-badge danger';
            case 'normal': return 'admin-badge warning';
            case 'low': return 'admin-badge success';
            default: return 'admin-badge neutral';
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'reported': return 'admin-badge warning';
            case 'verified': return 'admin-badge primary';
            case 'assigned': return 'admin-badge primary';
            case 'in_progress': return 'admin-badge info';
            case 'resolved': return 'admin-badge success';
            case 'closed': return 'admin-badge neutral';
            case 'reopened': return 'admin-badge danger';
            default: return 'admin-badge neutral';
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Civic Issues Management</h1>
                    <p style={{ color: 'var(--admin-text-muted)', margin: 0, fontSize: '14px' }}>
                        Review, verify, assign, and track reported civic infrastructure issues.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={() => fetchIssues()} 
                        className="admin-btn admin-btn-secondary"
                        disabled={loading}
                    >
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="admin-card" style={{ padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'center' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Search</label>
                        <input 
                            type="text" 
                            placeholder="Title, ID, location..." 
                            value={search} 
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            className="admin-input"
                            style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Status</label>
                        <select 
                            value={statusFilter} 
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className="admin-select"
                            style={{ width: '100%' }}
                        >
                            <option value="">All Statuses</option>
                            <option value="reported">Reported</option>
                            <option value="verified">Verified</option>
                            <option value="assigned">Assigned</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                            <option value="reopened">Reopened</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Department</label>
                        <select 
                            value={departmentFilter} 
                            onChange={(e) => { setDepartmentFilter(e.target.value); setCurrentPage(1); }}
                            className="admin-select"
                            style={{ width: '100%' }}
                        >
                            <option value="">All Departments</option>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Priority</label>
                        <select 
                            value={priorityFilter} 
                            onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
                            className="admin-select"
                            style={{ width: '100%' }}
                        >
                            <option value="">All Priorities</option>
                            <option value="urgent">Urgent</option>
                            <option value="high">High</option>
                            <option value="normal">Normal</option>
                            <option value="low">Low</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Assigned Worker</label>
                        <select 
                            value={workerFilter} 
                            onChange={(e) => { setWorkerFilter(e.target.value); setCurrentPage(1); }}
                            className="admin-select"
                            style={{ width: '100%' }}
                        >
                            <option value="">All Workers</option>
                            {workers.map(w => <option key={w._id} value={w._id}>{w.name} ({w.department || 'General'})</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Sort By</label>
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value)}
                            className="admin-select"
                            style={{ width: '100%' }}
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="priority">Priority (Highest)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Issues Table */}
            <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Title</th>
                                <th>Department</th>
                                <th>Location</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Assigned Worker</th>
                                <th>Reported</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}><Spinner /></td>
                                </tr>
                            ) : paginatedIssues.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--admin-text-muted)' }}>
                                        No issues match the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                paginatedIssues.map(issue => (
                                    <tr 
                                        key={issue._id}
                                        style={{ backgroundColor: selectedIssue?._id === issue._id ? 'var(--admin-info-bg)' : 'transparent', cursor: 'pointer' }}
                                        onClick={() => setSelectedIssue(issue)}
                                    >
                                        <td style={{ fontFamily: 'monospace', color: 'var(--admin-text-muted)', fontSize: '12px' }}>
                                            #{issue._id.slice(-6)}
                                        </td>
                                        <td style={{ fontWeight: '600', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {issue.title}
                                            {issue.duplicateCandidates?.length > 0 && (
                                                <span title={`${issue.duplicateCandidates.length} potential duplicates`} style={{ marginLeft: '6px', fontSize: '11px', color: '#f59e0b' }}>⚠️</span>
                                            )}
                                        </td>
                                        <td>{issue.department || 'Other'}</td>
                                        <td style={{ maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '12px' }}>
                                            {issue.locationName || issue.location}
                                        </td>
                                        <td>
                                            <span className={getPriorityBadgeClass(issue.priority)} style={{ textTransform: 'capitalize' }}>
                                                {issue.priority}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={getStatusBadgeClass(issue.status)} style={{ textTransform: 'capitalize' }}>
                                                {issue.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            {issue.assignedTo ? (
                                                <span style={{ fontSize: '12px', fontWeight: '500' }}>
                                                    👷 {issue.assignedTo.name || 'Assigned'}
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>Unassigned</span>
                                            )}
                                        </td>
                                        <td style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
                                            {new Date(issue.createdAt).toLocaleDateString()}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setSelectedIssue(issue); }}
                                                className="admin-btn admin-btn-secondary"
                                                style={{ padding: '4px 10px', fontSize: '12px' }}
                                            >
                                                Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', fontSize: '12px', color: 'var(--admin-text-muted)' }}>
                    <span>Showing {paginatedIssues.length} of {sortedIssues.length} issues</span>
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button 
                                disabled={currentPage === 1} 
                                onClick={() => setCurrentPage(p => p - 1)}
                                style={{ padding: '4px 8px', border: '1px solid var(--admin-border)', background: 'white', borderRadius: '4px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                            >&lt;</button>
                            {[...Array(totalPages)].map((_, i) => (
                                <button 
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    style={{ 
                                        padding: '4px 8px', 
                                        border: `1px solid ${currentPage === i + 1 ? 'var(--admin-primary)' : 'var(--admin-border)'}`, 
                                        background: currentPage === i + 1 ? 'var(--admin-info-bg)' : 'white', 
                                        color: currentPage === i + 1 ? 'var(--admin-primary)' : 'inherit',
                                        borderRadius: '4px', 
                                        fontWeight: currentPage === i + 1 ? 'bold' : 'normal',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button 
                                disabled={currentPage === totalPages} 
                                onClick={() => setCurrentPage(p => p + 1)}
                                style={{ padding: '4px 8px', border: '1px solid var(--admin-border)', background: 'white', borderRadius: '4px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                            >&gt;</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Issue Detail Drawer / Modal */}
            {selectedIssue && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000 }}>
                    <div style={{ width: '100%', maxWidth: '650px', height: '100%', backgroundColor: 'white', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '-5px 0 25px rgba(0,0,0,0.15)' }}>
                        
                        {/* Drawer Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--admin-border)', paddingBottom: '16px' }}>
                            <div>
                                <span style={{ fontFamily: 'monospace', color: 'var(--admin-text-muted)', fontSize: '13px' }}>Issue #{selectedIssue._id}</span>
                                <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '4px 0 8px 0', color: 'var(--admin-text-main)' }}>{selectedIssue.title}</h2>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <span className={getStatusBadgeClass(selectedIssue.status)} style={{ textTransform: 'capitalize' }}>
                                        {selectedIssue.status.replace('_', ' ')}
                                    </span>
                                    <span className={getPriorityBadgeClass(selectedIssue.priority)} style={{ textTransform: 'capitalize' }}>
                                        Priority: {selectedIssue.priority}
                                    </span>
                                    <span className="admin-badge neutral">
                                        Dept: {selectedIssue.department || 'Other'}
                                    </span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedIssue(null)}
                                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--admin-text-muted)' }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Quick Action Toolbar */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--admin-border)' }}>
                            {selectedIssue.status === 'reported' && (
                                <button 
                                    onClick={() => handleVerify(selectedIssue._id)} 
                                    disabled={actionLoading}
                                    className="admin-btn admin-btn-primary"
                                    style={{ fontSize: '12px', padding: '6px 12px' }}
                                >
                                    ✓ Verify Issue
                                </button>
                            )}

                            <button 
                                onClick={() => { setSelectedWorkerId(selectedIssue.assignedTo?._id || ''); setAssignModal(true); }}
                                className="admin-btn admin-btn-secondary"
                                style={{ fontSize: '12px', padding: '6px 12px' }}
                            >
                                👷 {selectedIssue.assignedTo ? 'Reassign Worker' : 'Assign Worker'}
                            </button>

                            <button 
                                onClick={() => { setTargetStatus(selectedIssue.status); setStatusModal(true); }}
                                className="admin-btn admin-btn-secondary"
                                style={{ fontSize: '12px', padding: '6px 12px' }}
                            >
                                🔄 Change Status
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                                <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>Priority:</span>
                                <select 
                                    value={selectedIssue.priority}
                                    onChange={(e) => handleUpdatePriority(e.target.value)}
                                    className="admin-select"
                                    style={{ padding: '4px 8px', fontSize: '12px', width: 'auto' }}
                                >
                                    <option value="low">Low</option>
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                        </div>

                        {/* Description & Location */}
                        <div>
                            <h4 style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--admin-text-muted)', marginBottom: '8px' }}>Description</h4>
                            <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--admin-text-main)', margin: 0, backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px' }}>
                                {selectedIssue.description || 'No description provided.'}
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <h4 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--admin-text-muted)', marginBottom: '4px' }}>Location</h4>
                                <div style={{ fontSize: '13px', color: 'var(--admin-text-main)' }}>
                                    📍 {selectedIssue.locationName || selectedIssue.location}
                                </div>
                            </div>
                            <div>
                                <h4 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--admin-text-muted)', marginBottom: '4px' }}>Reported By</h4>
                                <div style={{ fontSize: '13px', color: 'var(--admin-text-main)' }}>
                                    👤 {selectedIssue.createdBy?.name || selectedIssue.createdBy?.email || 'Citizen'}
                                </div>
                            </div>
                        </div>

                        {/* SLA Status */}
                        {selectedIssue.sla && (
                            <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--admin-border)', backgroundColor: selectedIssue.sla.isBreached ? '#fef2f2' : '#f0fdf4' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: selectedIssue.sla.isBreached ? '#b91c1c' : '#15803d' }}>
                                        {selectedIssue.sla.isBreached ? '⚠️ SLA Breached' : '⏱ SLA Active'}
                                    </span>
                                    <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
                                        Target: {selectedIssue.sla.targetHours}h | Due: {selectedIssue.sla.dueAt ? new Date(selectedIssue.sla.dueAt).toLocaleString() : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Evidence Photos */}
                        {selectedIssue.images?.length > 0 && (
                            <div>
                                <h4 style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--admin-text-muted)', marginBottom: '8px' }}>Reported Evidence Photos</h4>
                                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                                    {selectedIssue.images.map((img, idx) => (
                                        <img 
                                            key={idx}
                                            src={img.startsWith('http') ? img : img} 
                                            alt={`Evidence ${idx + 1}`}
                                            onClick={() => setViewingProof(img)}
                                            style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--admin-border)' }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Resolution Proof (if resolved) */}
                        {selectedIssue.resolutionProof && (
                            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '8px' }}>
                                <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#166534', margin: '0 0 8px 0' }}>Resolution Verification</h4>
                                {selectedIssue.resolutionNotes && (
                                    <p style={{ fontSize: '13px', color: '#14532d', margin: '0 0 12px 0' }}>
                                        Notes: {selectedIssue.resolutionNotes}
                                    </p>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <img 
                                        src={selectedIssue.resolutionProof} 
                                        alt="Resolution Proof" 
                                        onClick={() => setViewingProof(selectedIssue.resolutionProof)}
                                        style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', border: '2px solid #86efac' }}
                                    />
                                    <span style={{ fontSize: '12px', color: '#15803d' }}>Click photo to inspect full resolution evidence</span>
                                </div>
                            </div>
                        )}

                        {/* AI Classification & Duplicate Suggestions */}
                        {selectedIssue.aiAnalysis && (
                            <div style={{ backgroundColor: '#f8fafc', border: '1px solid var(--admin-border)', padding: '14px', borderRadius: '8px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--admin-text-muted)', margin: '0 0 8px 0' }}>
                                    🤖 AI Classification Suggestions
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                                    <div>Suggested Category: <strong>{selectedIssue.aiAnalysis.category?.value || 'N/A'}</strong> ({(selectedIssue.aiAnalysis.category?.confidence * 100 || 0).toFixed(0)}%)</div>
                                    <div>Suggested Severity: <strong>{selectedIssue.aiAnalysis.severity?.value || 'N/A'}</strong> ({(selectedIssue.aiAnalysis.severity?.confidence * 100 || 0).toFixed(0)}%)</div>
                                </div>
                            </div>
                        )}

                        {/* Potential Duplicates */}
                        {selectedIssue.duplicateCandidates?.length > 0 && (
                            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '14px', borderRadius: '8px' }}>
                                <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#92400e', margin: '0 0 8px 0' }}>
                                    ⚠️ Potential Duplicates Detected ({selectedIssue.duplicateCandidates.length})
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {selectedIssue.duplicateCandidates.map(dup => (
                                        <div key={dup._id || dup} style={{ fontSize: '12px', color: '#78350f', display: 'flex', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #fef3c7' }}>
                                            <span>#{typeof dup === 'object' ? dup._id.slice(-6) : dup.slice(-6)} - {dup.title || 'Nearby Report'}</span>
                                            <span>{dup.status || 'Reported'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Status & Assignment Timeline */}
                        <div>
                            <h4 style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--admin-text-muted)', marginBottom: '8px' }}>History & Timeline</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '2px solid var(--admin-border)', paddingLeft: '14px', marginLeft: '6px' }}>
                                {(selectedIssue.timeline || []).map((entry, idx) => (
                                    <div key={idx} style={{ position: 'relative' }}>
                                        <div style={{ position: 'absolute', left: '-20px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--admin-primary)' }}></div>
                                        <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--admin-text-main)' }}>{entry.text}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                                            By {entry.who} • {new Date(entry.at).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Add Admin Comment */}
                        <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--admin-border)' }}>
                            <input 
                                type="text"
                                placeholder="Add administrative note or comment..."
                                value={adminComment}
                                onChange={(e) => setAdminComment(e.target.value)}
                                className="admin-input"
                                style={{ flex: 1 }}
                            />
                            <button 
                                type="submit" 
                                className="admin-btn admin-btn-primary"
                                disabled={actionLoading || !adminComment.trim()}
                            >
                                Post
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Worker Modal */}
            {assignModal && selectedIssue && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                    <div className="admin-card" style={{ width: '420px', padding: '24px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>Assign Worker to Issue</h3>
                        <p style={{ fontSize: '13px', color: 'var(--admin-text-muted)', margin: '0 0 16px 0' }}>{selectedIssue.title}</p>
                        
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Select Field Worker</label>
                            <select 
                                value={selectedWorkerId} 
                                onChange={(e) => setSelectedWorkerId(e.target.value)}
                                className="admin-select"
                                style={{ width: '100%' }}
                            >
                                <option value="" disabled>-- Select Worker --</option>
                                {workers.map(w => (
                                    <option key={w._id} value={w._id}>
                                        {w.name} ({w.department || 'General'}) - {w.dutyStatus || 'on_duty'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button 
                                onClick={() => setAssignModal(false)}
                                className="admin-btn admin-btn-secondary"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleAssignWorker}
                                disabled={actionLoading || !selectedWorkerId}
                                className="admin-btn admin-btn-primary"
                            >
                                {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Status Modal */}
            {statusModal && selectedIssue && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                    <div className="admin-card" style={{ width: '380px', padding: '24px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>Update Issue Status</h3>
                        
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Target Status</label>
                            <select 
                                value={targetStatus} 
                                onChange={(e) => setTargetStatus(e.target.value)}
                                className="admin-select"
                                style={{ width: '100%' }}
                            >
                                <option value="reported">Reported</option>
                                <option value="verified">Verified</option>
                                <option value="assigned">Assigned</option>
                                <option value="in_progress">In Progress</option>
                                <option value="resolved">Resolved</option>
                                <option value="closed">Closed</option>
                                <option value="reopened">Reopened</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button 
                                onClick={() => setStatusModal(false)}
                                className="admin-btn admin-btn-secondary"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleUpdateStatus}
                                disabled={actionLoading}
                                className="admin-btn admin-btn-primary"
                            >
                                {actionLoading ? 'Updating...' : 'Update Status'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Proof Lightbox */}
            {viewingProof && (
                <div 
                    onClick={() => setViewingProof(null)} 
                    style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '20px' }}
                >
                    <div style={{ position: 'relative', maxWidth: '800px', width: '100%', maxHeight: '90vh' }}>
                        <button 
                            onClick={() => setViewingProof(null)}
                            style={{ position: 'absolute', top: '-40px', right: 0, background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}
                        >
                            ✕ Close
                        </button>
                        <img 
                            src={viewingProof} 
                            alt="Evidence preview" 
                            style={{ width: '100%', height: 'auto', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px' }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CivicIssuesCenter;
