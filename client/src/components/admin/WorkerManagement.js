import React, { useState } from 'react';
import api from '../../services/api';

const WorkerManagement = ({
    workers,
    newWorker,
    setNewWorker,
    showWorkerForm,
    setShowWorkerForm,
    handleCreateWorker,
    issues = [],
    handleAssign,
    fetchWorkers
}) => {
    const [activeTab, setActiveTab] = useState('All Workers');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Modals state
    const [editingWorker, setEditingWorker] = useState(null);
    const [assigningWorker, setAssigningWorker] = useState(null);
    const [assignIssueId, setAssignIssueId] = useState('');

    const tabs = ['All Workers', 'Sanitation', 'Roads & Infrastructure', 'Public Safety', 'Utilities', 'Parks & Recreation'];

    const filteredWorkers = workers.filter(w => {
        const matchesTab = activeTab === 'All Workers' || w.department?.includes(activeTab) || w.department === activeTab;
        const matchesSearch = !searchQuery || 
            w.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            w.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            w.department?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    const totalPages = Math.ceil(filteredWorkers.length / itemsPerPage);
    const paginatedWorkers = filteredWorkers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleExport = () => {
        const headers = ["ID", "Name", "Email", "Department"];
        const rows = filteredWorkers.map(w => [w._id, `"${w.name}"`, `"${w.email}"`, `"${w.department || 'Unassigned'}"`]);
        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "workers_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUpdateWorker = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/admin/workers/${editingWorker._id}`, {
                name: editingWorker.name,
                email: editingWorker.email,
                department: editingWorker.department
            });
            alert("Worker updated successfully!");
            setEditingWorker(null);
            if (fetchWorkers) fetchWorkers();
        } catch (err) {
            console.error(err);
            alert("Failed to update worker");
        }
    };

    const submitAssignment = async () => {
        if (!assignIssueId) return alert("Select an issue first");
        if (handleAssign) {
            await handleAssign(assignIssueId, assigningWorker._id);
            alert(`Issue successfully assigned to ${assigningWorker.name}`);
            setAssigningWorker(null);
            setAssignIssueId('');
        }
    };
    
    const openIssues = issues.filter(i => i.status === 'reported' || i.status === 'reopened');

    // Calculate real stats from worker data and issues
    const totalAssignedTasks = issues.filter(i => i.assignedTo && (i.status === 'assigned' || i.status === 'in_progress')).length;
    const onDutyWorkers = workers.filter(w => !w.dutyStatus || w.dutyStatus === 'on_duty').length;

    const handleToggleDutyStatus = async (workerId, currentStatus) => {
        const nextStatus = currentStatus === 'off_duty' ? 'on_duty' : 'off_duty';
        try {
            await api.patch(`/admin/workers/${workerId}/status`, { dutyStatus: nextStatus });
            if (fetchWorkers) fetchWorkers();
        } catch (err) {
            console.error(err);
            alert("Failed to update duty status");
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Worker Management</h1>
                    <p style={{ color: 'var(--admin-text-muted)', margin: 0, fontSize: '14px' }}>Manage field workers, assign departments, track operational status, and monitor task workloads.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={handleExport} className="admin-btn admin-btn-secondary">
                        Export Data
                    </button>
                    <button 
                        onClick={() => setShowWorkerForm(!showWorkerForm)} 
                        className="admin-btn admin-btn-primary"
                    >
                        <span>{showWorkerForm ? "✕ " : "➕ "}</span> {showWorkerForm ? "Cancel Worker" : "Add New Worker"}
                    </button>
                </div>
            </div>

            {/* Quick Stats Row */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-header">
                        <div className="kpi-icon blue">👷</div>
                        <span className="kpi-title">Total Workers</span>
                    </div>
                    <div className="kpi-value">{workers.length}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-header">
                        <div className="kpi-icon green">🟢</div>
                        <span className="kpi-title">Active / On Duty</span>
                    </div>
                    <div className="kpi-value">{onDutyWorkers}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-header">
                        <div className="kpi-icon yellow">📋</div>
                        <span className="kpi-title">Active Assigned Tasks</span>
                    </div>
                    <div className="kpi-value">{totalAssignedTasks}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-header">
                        <div className="kpi-icon blue">🏢</div>
                        <span className="kpi-title">Departments</span>
                    </div>
                    <div className="kpi-value">{new Set(workers.map(w => w.department).filter(Boolean)).size}</div>
                </div>
            </div>

            {/* Add Worker Form */}
            {showWorkerForm && (
                <div className="admin-card">
                    <div className="admin-card-header" style={{ marginBottom: '16px' }}>
                        <h3 className="admin-card-title">Register New Field Worker</h3>
                    </div>
                    <form onSubmit={handleCreateWorker} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Full Name</label>
                            <input
                                type="text"
                                value={newWorker.name}
                                onChange={e => setNewWorker({ ...newWorker, name: e.target.value })}
                                required
                                className="admin-input"
                                placeholder="e.g. John Doe"
                            />
                        </div>
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Email</label>
                            <input
                                type="email"
                                value={newWorker.email}
                                onChange={e => setNewWorker({ ...newWorker, email: e.target.value })}
                                required
                                className="admin-input"
                                placeholder="worker@city.gov"
                            />
                        </div>
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Password</label>
                            <input
                                type="password"
                                value={newWorker.password}
                                onChange={e => setNewWorker({ ...newWorker, password: e.target.value })}
                                required
                                className="admin-input"
                            />
                        </div>
                        <div style={{ flex: '2 1 300px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Department</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select
                                    value={newWorker.department || ''}
                                    onChange={e => setNewWorker({ ...newWorker, department: e.target.value })}
                                    required
                                    className="admin-select"
                                >
                                    <option value="" disabled>Select Department</option>
                                    <option value="Sanitation">Sanitation</option>
                                    <option value="Roads & Infrastructure">Roads & Infrastructure</option>
                                    <option value="Utilities (Water/Power)">Utilities (Water/Power)</option>
                                    <option value="Parks & Recreation">Parks & Recreation</option>
                                    <option value="Public Safety">Public Safety</option>
                                    <option value="Transportation">Transportation</option>
                                    <option value="Other">Other</option>
                                </select>
                                <button type="submit" className="admin-btn admin-btn-primary">
                                    Save
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Workers Table with Tabs */}
            <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--admin-border)', backgroundColor: '#f8fafc', overflowX: 'auto' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                            style={{
                                padding: '12px 20px',
                                fontSize: '14px',
                                fontWeight: '500',
                                whiteSpace: 'nowrap',
                                borderBottom: activeTab === tab ? '2px solid var(--admin-primary)' : '2px solid transparent',
                                color: activeTab === tab ? 'var(--admin-primary)' : 'var(--admin-text-muted)',
                                background: activeTab === tab ? 'white' : 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="admin-header-search" style={{ margin: 0 }}>
                        <span style={{ position: 'absolute', left: '12px', top: '8px', color: '#94a3b8' }}>🔍</span>
                        <input 
                            type="text" 
                            placeholder="Search workers..." 
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                </div>
                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th style={{ width: '48px' }}>Avatar</th>
                                <th>Worker Details</th>
                                <th>Department</th>
                                <th>Status</th>
                                <th>Last Active</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedWorkers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--admin-text-muted)' }}>
                                        No workers found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedWorkers.map(worker => (
                                    <tr key={worker._id}>
                                        <td>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--admin-info-bg)', color: 'var(--admin-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                                                {(worker.name || '?').charAt(0).toUpperCase()}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '500' }}>{worker.name}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>{worker.email}</div>
                                        </td>
                                        <td>
                                            <span className="admin-badge neutral">
                                                {worker.department || 'Unassigned'}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => handleToggleDutyStatus(worker._id, worker.dutyStatus || 'on_duty')}
                                                className={`admin-badge ${(!worker.dutyStatus || worker.dutyStatus === 'on_duty') ? 'success' : 'neutral'}`}
                                                style={{ border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                                                title="Click to toggle duty status"
                                            >
                                                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: (!worker.dutyStatus || worker.dutyStatus === 'on_duty') ? 'var(--admin-success-text)' : '#94a3b8', marginRight: '6px' }}></span>
                                                {worker.dutyStatus ? worker.dutyStatus.replace('_', ' ') : 'on duty'}
                                            </button>
                                        </td>
                                        <td style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
                                            Just now
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button onClick={() => setEditingWorker(worker)} style={{ background: 'none', border: 'none', color: 'var(--admin-primary)', cursor: 'pointer', fontSize: '13px', marginRight: '12px' }} title="Edit Worker">
                                                Edit
                                            </button>
                                            <button onClick={() => setAssigningWorker(worker)} style={{ background: 'none', border: 'none', color: 'var(--admin-primary)', cursor: 'pointer', fontSize: '13px' }} title="Assign Task">
                                                Assign
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', fontSize: '12px', color: 'var(--admin-text-muted)' }}>
                    <span>Showing {paginatedWorkers.length} of {filteredWorkers.length} entries</span>
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

            {/* Edit Worker Modal */}
            {editingWorker && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="admin-card" style={{ width: '400px', backgroundColor: 'white', padding: '24px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '24px', fontSize: '18px', fontWeight: 'bold' }}>Edit Worker</h3>
                        <form onSubmit={handleUpdateWorker}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--admin-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Name</label>
                                <input type="text" className="admin-input" value={editingWorker.name || ''} onChange={e => setEditingWorker({...editingWorker, name: e.target.value})} required style={{ width: '100%', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--admin-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Email</label>
                                <input type="email" className="admin-input" value={editingWorker.email || ''} onChange={e => setEditingWorker({...editingWorker, email: e.target.value})} required style={{ width: '100%', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--admin-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Department</label>
                                <select className="admin-select" value={editingWorker.department || ''} onChange={e => setEditingWorker({...editingWorker, department: e.target.value})} required style={{ width: '100%', boxSizing: 'border-box' }}>
                                    <option value="" disabled>Select Department</option>
                                    <option value="Sanitation">Sanitation</option>
                                    <option value="Roads & Infrastructure">Roads & Infrastructure</option>
                                    <option value="Utilities (Water/Power)">Utilities (Water/Power)</option>
                                    <option value="Parks & Recreation">Parks & Recreation</option>
                                    <option value="Public Safety">Public Safety</option>
                                    <option value="Transportation">Transportation</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setEditingWorker(null)}>Cancel</button>
                                <button type="submit" className="admin-btn admin-btn-primary">Update</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Task Modal */}
            {assigningWorker && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="admin-card" style={{ width: '450px', backgroundColor: 'white', padding: '24px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '24px', fontSize: '18px', fontWeight: 'bold' }}>Assign Task to {assigningWorker.name}</h3>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--admin-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Select Open Issue</label>
                            <select className="admin-select" value={assignIssueId} onChange={e => setAssignIssueId(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                                <option value="" disabled>Select an issue...</option>
                                {openIssues.map(issue => (
                                    <option key={issue._id} value={issue._id}>{issue.title} - {issue.priority.toUpperCase()} ({issue.locationName || 'Unknown Location'})</option>
                                ))}
                            </select>
                            {openIssues.length === 0 && (
                                <p style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '8px' }}>No open issues available to assign.</p>
                            )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => { setAssigningWorker(null); setAssignIssueId(''); }}>Cancel</button>
                            <button type="button" className="admin-btn admin-btn-primary" onClick={submitAssignment} disabled={!assignIssueId}>Assign Issue</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkerManagement;
