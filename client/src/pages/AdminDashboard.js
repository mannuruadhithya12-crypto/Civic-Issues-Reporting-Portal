import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { CATEGORIES } from '../components/CategoryCard';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [workers, setWorkers] = useState([]);
    const [newWorker, setNewWorker] = useState({ username: '', email: '', password: '' });
    const [showWorkerForm, setShowWorkerForm] = useState(false);
    const [viewProof, setViewProof] = useState(null);
    const [filters, setFilters] = useState({
        status: '',
        department: '',
        search: ''
    });

    useEffect(() => {
        fetchData();
        fetchWorkers();
    }, []);

    const fetchData = async (background = false) => {
        if (!background) setLoading(true);
        try {
            console.log("Fetching dashboard data...");
            const [analyticsRes, issuesRes] = await Promise.all([
                api.get('/analytics'),
                api.get('/issues')
            ]);
            setStats(analyticsRes.data);
            setIssues(issuesRes.data);
        } catch (err) {
            console.error("Error fetching admin data:", err);
            if (!background) alert("Failed to load dashboard data");
        } finally {
            if (!background) setLoading(false);
        }
    };

    const fetchWorkers = async () => {
        try {
            const res = await api.get('/admin/workers');
            setWorkers(res.data);
        } catch (err) {
            console.error("Failed to fetch workers");
        }
    };

    const handleCreateWorker = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/create-worker', newWorker);
            alert("Worker created successfully!");
            setNewWorker({ username: '', email: '', password: '' });
            setShowWorkerForm(false);
            fetchWorkers();
        } catch (err) {
            alert("Failed to create worker");
        }
    };

    const handleExport = () => {
        const headers = ['ID', 'Title', 'Department', 'Status', 'Priority', 'Created At', 'Location'];
        const csvContent = [
            headers.join(','),
            ...filteredIssues.map(issue => [
                issue._id,
                `"${issue.title.replace(/"/g, '""')}"`,
                issue.department,
                issue.status,
                issue.priority,
                new Date(issue.createdAt).toLocaleDateString(),
                `"${(issue.locationName || issue.location || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `issues_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const handleAssign = async (id, staffName) => {
        // Optimistic update
        setIssues(prev =>
            prev.map(issue =>
                issue._id === id ? { ...issue, assignedTo: staffName, status: 'assigned' } : issue
            )
        );

        try {
            const res = await api.put(`/issues/${id}/assign`, { assignedTo: staffName });
            console.log("Assign response:", res.data);

            // Server Truth Update: Ensure state matches server response
            setIssues(prev =>
                prev.map(issue =>
                    issue._id === id ? res.data : issue
                )
            );
        } catch (err) {
            console.error("Assign error:", err);
            alert(`Failed to assign staff: ${err.response?.data?.message || err.message}`);
            fetchData(true); // Revert on error
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        // Optimistic update
        setIssues(prev =>
            prev.map(issue =>
                issue._id === id ? { ...issue, status: newStatus } : issue
            )
        );

        try {
            const res = await api.put(`/issues/${id}`, { status: newStatus });
            console.log("Status update response:", res.data);

            // Server Truth Update
            setIssues(prev =>
                prev.map(issue =>
                    issue._id === id ? res.data : issue
                )
            );
        } catch (err) {
            console.error("Status update error:", err);
            alert(`Failed to update status: ${err.response?.data?.message || err.message}`);
            fetchData(true);
        }
    };

    const handleVerify = async (id) => {
        if (window.confirm("Are you sure you want to verify this resolution and close the issue?")) {
            // Optimistic update
            setIssues(prev =>
                prev.map(issue =>
                    issue._id === id ? { ...issue, status: 'resolved' } : issue
                )
            );

            try {
                const res = await api.put(`/issues/${id}`, { status: 'resolved' });
                console.log("Verify response:", res.data);

                // Server Truth Update
                setIssues(prev =>
                    prev.map(issue =>
                        issue._id === id ? res.data : issue
                    )
                );
            } catch (err) {
                console.error("Verify error:", err);
                alert(`Failed to verify: ${err.response?.data?.message || err.message}`);
                fetchData(true);
            }
        }
    };

    const filteredIssues = issues.filter(issue => {
        return (
            (!filters.status || issue.status === filters.status) &&
            (!filters.department || issue.department === filters.department) &&
            (!filters.search ||
                issue.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                issue.description.toLowerCase().includes(filters.search.toLowerCase())
            )
        );
    });

    if (loading) return <div className="container">Loading Dashboard...</div>;

    return (
        <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>Admin Dashboard</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => setShowWorkerForm(!showWorkerForm)} className="btn-primary" style={{ background: '#4caf50' }}>
                        👷 Add Worker
                    </button>
                    <button onClick={handleExport} className="btn-primary">
                        📥 Export Report
                    </button>
                </div>
            </div>

            {/* Add Worker Form */}
            {showWorkerForm && (
                <div className="card" style={{ marginBottom: '2rem', animation: 'fadeIn 0.3s ease' }}>
                    <h3>Create New Worker</h3>
                    <form onSubmit={handleCreateWorker} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'end' }}>
                        <div>
                            <label>Username</label>
                            <input
                                type="text"
                                value={newWorker.username}
                                onChange={e => setNewWorker({ ...newWorker, username: e.target.value })}
                                required
                                style={{ display: 'block', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                            />
                        </div>
                        <div>
                            <label>Email</label>
                            <input
                                type="email"
                                value={newWorker.email}
                                onChange={e => setNewWorker({ ...newWorker, email: e.target.value })}
                                required
                                style={{ display: 'block', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                            />
                        </div>
                        <div>
                            <label>Password</label>
                            <input
                                type="password"
                                value={newWorker.password}
                                onChange={e => setNewWorker({ ...newWorker, password: e.target.value })}
                                required
                                style={{ display: 'block', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                            />
                        </div>
                        <button type="submit" className="btn-primary">Create</button>
                    </form>
                </div>
            )}

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <h3>{stats?.totalIssues}</h3>
                    <p>Total Issues</p>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '1.5rem', borderLeft: '4px solid #4caf50' }}>
                    <h3>{stats?.resolvedIssues}</h3>
                    <p>Resolved</p>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '1.5rem', borderLeft: '4px solid #ff9800' }}>
                    <h3>{stats?.pendingIssues}</h3>
                    <p>Pending</p>
                </div>
            </div>

            {/* Analytics Section */}
            <div style={{ marginBottom: '2rem' }}>
                <div className="card">
                    <h3>Issues by Department</h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {stats?.issuesByDept.map(dept => (
                            <li key={dept._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                                <span>{dept._id}</span>
                                <strong>{dept.count}</strong>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Filters & Management */}
            <div className="card">
                <h3>Issue Management</h3>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="Search issues..."
                        value={filters.search}
                        onChange={e => setFilters({ ...filters, search: e.target.value })}
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                    />
                    <select
                        value={filters.department}
                        onChange={e => setFilters({ ...filters, department: e.target.value })}
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                    >
                        <option value="">All Departments</option>
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <select
                        value={filters.status}
                        onChange={e => setFilters({ ...filters, status: e.target.value })}
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                    >
                        <option value="">All Statuses</option>
                        <option value="submitted">Submitted</option>
                        <option value="verified">Verified</option>
                        <option value="assigned">Assigned</option>
                        <option value="in-progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-secondary)', textAlign: 'left' }}>
                                <th style={{ padding: '0.75rem' }}>Title</th>
                                <th style={{ padding: '0.75rem' }}>Dept</th>
                                <th style={{ padding: '0.75rem' }}>Priority</th>
                                <th style={{ padding: '0.75rem' }}>Assigned To</th>
                                <th style={{ padding: '0.75rem' }}>Solved?</th>
                                <th style={{ padding: '0.75rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredIssues.map(issue => (
                                <tr key={issue._id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '0.75rem' }}>{issue.title}</td>
                                    <td style={{ padding: '0.75rem' }}>{issue.department}</td>
                                    <td style={{ padding: '0.75rem' }}>
                                        <span style={{
                                            color: issue.priority === 'urgent' ? 'red' : 'inherit',
                                            fontWeight: issue.priority === 'urgent' ? 'bold' : 'normal'
                                        }}>
                                            {issue.priority}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>
                                        <select
                                            value={issue.assignedTo || ''}
                                            onChange={(e) => handleAssign(issue._id, e.target.value)}
                                            style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                                        >
                                            <option value="">Unassigned</option>
                                            {workers.map(w => <option key={w._id} value={w.username}>{w.username}</option>)}
                                        </select>
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>
                                        {issue.status === 'resolved' ? (
                                            <span style={{ color: 'green', fontWeight: 'bold' }}>Yes</span>
                                        ) : issue.status === 'pending-verification' ? (
                                            <button
                                                onClick={() => setViewProof(issue)}
                                                style={{ padding: '0.25rem 0.5rem', background: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                            >
                                                Verify Proof
                                            </button>
                                        ) : (
                                            <span style={{ color: 'gray' }}>No</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>
                                        <select
                                            value={issue.status}
                                            onChange={(e) => handleStatusUpdate(issue._id, e.target.value)}
                                            style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                                        >
                                            <option value="submitted">Submitted</option>
                                            <option value="verified">Verified</option>
                                            <option value="assigned">Assigned</option>
                                            <option value="in-progress">In Progress</option>
                                            <option value="resolved">Resolved</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Proof Modal */}
            {viewProof && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ maxWidth: '600px', width: '90%', textAlign: 'center' }}>
                        <h3>Resolution Proof</h3>
                        <img
                            src={`http://localhost:5000${viewProof.resolutionProof}`}
                            alt="Proof"
                            style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', marginBottom: '1rem' }}
                        />
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button onClick={() => setViewProof(null)} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Close</button>
                            <button
                                onClick={() => { handleVerify(viewProof._id); setViewProof(null); }}
                                className="btn-primary"
                            >
                                ✅ Confirm Resolution
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
