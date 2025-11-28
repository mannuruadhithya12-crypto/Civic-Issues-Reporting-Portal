import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const WorkerDashboard = () => {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [proofFile, setProofFile] = useState(null);
    const { user } = useContext(AuthContext);

    useEffect(() => {
        fetchAssignedIssues();
    }, []);

    const fetchAssignedIssues = async () => {
        try {
            const res = await api.get('/worker/assigned');
            setIssues(res.data);
        } catch (err) {
            console.error(err);
            alert("Failed to load assigned issues");
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (e) => {
        e.preventDefault();
        if (!selectedIssue || !proofFile) return;

        const formData = new FormData();
        formData.append('proof', proofFile);

        try {
            await api.post(`/issues/${selectedIssue._id}/resolve`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert("Issue marked as resolved! Pending admin verification.");
            setSelectedIssue(null);
            setProofFile(null);
            fetchAssignedIssues();
        } catch (err) {
            console.error(err);
            alert("Failed to submit resolution");
        }
    };

    if (loading) return <div className="container">Loading tasks...</div>;

    return (
        <div className="container">
            <h2>👷 Worker Dashboard</h2>
            <p>Welcome, {user.username}. Here are your assigned tasks.</p>

            {issues.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <h3>No tasks assigned yet! 🎉</h3>
                    <p>Enjoy your break.</p>
                </div>
            ) : (
                <div className="issues-grid">
                    {issues.map(issue => (
                        <div key={issue._id} className="issue-card" style={{ borderLeft: issue.priority === 'urgent' ? '5px solid red' : '5px solid var(--primary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <h3>{issue.title}</h3>
                                <span className={`status-badge ${issue.status}`}>{issue.status}</span>
                            </div>
                            <p>{issue.description}</p>
                            <div className="issue-meta">
                                <strong>📍 Location:</strong> {issue.locationName || issue.location}
                            </div>
                            <div className="issue-meta">
                                <strong>📅 Due:</strong> {issue.slaDeadline ? new Date(issue.slaDeadline).toLocaleDateString() : 'N/A'}
                            </div>

                            {issue.status === 'assigned' || issue.status === 'in-progress' ? (
                                <button
                                    onClick={() => setSelectedIssue(issue)}
                                    className="btn-primary"
                                    style={{ marginTop: '1rem', width: '100%' }}
                                >
                                    ✅ Mark as Resolved
                                </button>
                            ) : issue.status === 'pending-verification' ? (
                                <div style={{ marginTop: '1rem', padding: '0.5rem', background: '#fff3cd', borderRadius: '4px', textAlign: 'center' }}>
                                    ⏳ Pending Verification
                                </div>
                            ) : (
                                <div style={{ marginTop: '1rem', padding: '0.5rem', background: '#d4edda', borderRadius: '4px', textAlign: 'center' }}>
                                    🎉 Resolved
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Modal */}
            {selectedIssue && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ width: '90%', maxWidth: '500px' }}>
                        <h3>Resolve: {selectedIssue.title}</h3>
                        <p>Please upload a photo proof of the resolution.</p>

                        <form onSubmit={handleResolve}>
                            <div style={{ marginBottom: '1rem' }}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => setProofFile(e.target.files[0])}
                                    required
                                    style={{ width: '100%' }}
                                />
                            </div>

                            {proofFile && (
                                <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                                    <img
                                        src={URL.createObjectURL(proofFile)}
                                        alt="Preview"
                                        style={{ maxHeight: '200px', borderRadius: '8px' }}
                                    />
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => { setSelectedIssue(null); setProofFile(null); }}
                                    style={{ padding: '0.5rem 1rem', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={!proofFile}
                                >
                                    Submit Proof
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkerDashboard;
