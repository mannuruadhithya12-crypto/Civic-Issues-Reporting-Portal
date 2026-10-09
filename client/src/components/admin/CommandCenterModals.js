import React, { useState } from 'react';
import api from '../../services/api';

/**
 * 1. Admin Quick Action: Report Issue Modal
 */
export const AdminReportIssueModal = ({ isOpen, onClose, onSuccess, workers }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Roads');
    const [priority, setPriority] = useState('normal');
    const [locationName, setLocationName] = useState('Central District');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) {
            setError('Please provide a title and description.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            await api.post('/issues', {
                title: title.trim(),
                description: description.trim(),
                department: category,
                category,
                priority,
                location: locationName.trim(),
                locationName: locationName.trim(),
                coordinates: { type: 'Point', coordinates: [-74.0060, 40.7128] }
            });
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to create issue:', err);
            setError(err.response?.data?.message || 'Failed to submit issue');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
            <div className="admin-card" style={{ width: '90%', maxWidth: '540px', padding: '24px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>➕ Report New Civic Issue</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                </div>

                {error && <div style={{ backgroundColor: '#fef2f2', color: '#ef4444', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Issue Title *</label>
                        <input
                            type="text"
                            placeholder="e.g. Water main leak near Riverside"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                            required
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Category / Department</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                            >
                                <option value="Roads">Roads</option>
                                <option value="Waste">Waste</option>
                                <option value="Water">Water</option>
                                <option value="Drainage">Drainage</option>
                                <option value="Lighting">Lighting</option>
                                <option value="Parks">Parks</option>
                                <option value="Public Safety">Public Safety</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Priority Level</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                            >
                                <option value="low">Low</option>
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Location / Ward</label>
                        <input
                            type="text"
                            placeholder="e.g. Central District - Main St"
                            value={locationName}
                            onChange={(e) => setLocationName(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Detailed Description *</label>
                        <textarea
                            rows="3"
                            placeholder="Describe the issue observe..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', resize: 'vertical' }}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                        <button type="button" onClick={onClose} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Cancel</button>
                        <button type="submit" disabled={submitting} style={{ padding: '8px 18px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: submitting ? 'wait' : 'pointer', fontWeight: '600', fontSize: '13px' }}>
                            {submitting ? 'Submitting...' : 'Create & Save Issue'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/**
 * 2. Admin Quick Action: Assign Worker Modal
 */
export const AdminAssignWorkerModal = ({ isOpen, onClose, onSuccess, issues, workers }) => {
    const [selectedIssueId, setSelectedIssueId] = useState('');
    const [selectedWorkerId, setSelectedWorkerId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const unassignedIssues = issues.filter(i => !['resolved', 'closed', 'rejected'].includes(i.status));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedIssueId || !selectedWorkerId) {
            setError('Please select both an issue and a worker.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            await api.patch(`/issues/${selectedIssueId}/assign`, { assignedTo: selectedWorkerId });
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to assign worker:', err);
            setError(err.response?.data?.message || 'Failed to assign worker');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
            <div className="admin-card" style={{ width: '90%', maxWidth: '500px', padding: '24px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>👤 Dispatch & Assign Worker</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                </div>

                {error && <div style={{ backgroundColor: '#fef2f2', color: '#ef4444', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Select Active Issue *</label>
                        <select
                            value={selectedIssueId}
                            onChange={(e) => setSelectedIssueId(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                            required
                        >
                            <option value="">-- Choose Issue --</option>
                            {unassignedIssues.map(i => (
                                <option key={i._id} value={i._id}>
                                    #{i._id.slice(-4)} {i.title} ({i.department || 'Roads'} - {i.priority})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Select Field Worker *</label>
                        <select
                            value={selectedWorkerId}
                            onChange={(e) => setSelectedWorkerId(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                            required
                        >
                            <option value="">-- Choose Worker --</option>
                            {workers.map(w => (
                                <option key={w._id} value={w._id}>
                                    {w.name} ({w.department || 'General'}) - {w.dutyStatus || 'on_duty'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                        <button type="button" onClick={onClose} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Cancel</button>
                        <button type="submit" disabled={submitting} style={{ padding: '8px 18px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: submitting ? 'wait' : 'pointer', fontWeight: '600', fontSize: '13px' }}>
                            {submitting ? 'Dispatching...' : 'Assign Worker'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/**
 * 3. Admin Quick Action: Create Intervention Modal
 */
export const AdminCreateInterventionModal = ({ isOpen, onClose, onSuccess, issues }) => {
    const [selectedIssueId, setSelectedIssueId] = useState('');
    const [interventionType, setInterventionType] = useState('Pothole Patching & Resurfacing');
    const [allocatedWorkers, setAllocatedWorkers] = useState(4);
    const [allocatedBudget, setAllocatedBudget] = useState(5000);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedIssueId) {
            setError('Please select a target issue for intervention.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            await api.post('/interventions/simulate', {
                issueId: selectedIssueId,
                interventionType,
                allocatedWorkers: Number(allocatedWorkers),
                allocatedBudget: Number(allocatedBudget)
            });
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to create intervention:', err);
            setError(err.response?.data?.message || 'Failed to trigger intervention');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
            <div className="admin-card" style={{ width: '90%', maxWidth: '520px', padding: '24px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>⚡ Trigger Municipal Intervention</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                </div>

                {error && <div style={{ backgroundColor: '#fef2f2', color: '#ef4444', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Target Hotspot / Issue *</label>
                        <select
                            value={selectedIssueId}
                            onChange={(e) => setSelectedIssueId(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                            required
                        >
                            <option value="">-- Choose Hotspot Issue --</option>
                            {issues.map(i => (
                                <option key={i._id} value={i._id}>
                                    {i.title} ({i.locationName || 'Central District'})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Intervention Strategy</label>
                        <select
                            value={interventionType}
                            onChange={(e) => setInterventionType(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                        >
                            <option value="Pothole Patching & Resurfacing">Pothole Patching & Resurfacing</option>
                            <option value="Drainage Unclogging & Flushing">Drainage Unclogging & Flushing</option>
                            <option value="Streetlight Grid Upgrade">Streetlight Grid Upgrade</option>
                            <option value="Garbage Collection Blitz">Garbage Collection Blitz</option>
                            <option value="Water Pipeline Seal">Water Pipeline Seal</option>
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Workers Allocated</label>
                            <input
                                type="number"
                                min="1"
                                max="50"
                                value={allocatedWorkers}
                                onChange={(e) => setAllocatedWorkers(e.target.value)}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Allocated Budget ($)</label>
                            <input
                                type="number"
                                step="500"
                                value={allocatedBudget}
                                onChange={(e) => setAllocatedBudget(e.target.value)}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                        <button type="button" onClick={onClose} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Cancel</button>
                        <button type="submit" disabled={submitting} style={{ padding: '8px 18px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: submitting ? 'wait' : 'pointer', fontWeight: '600', fontSize: '13px' }}>
                            {submitting ? 'Optimizing...' : 'Launch Intervention'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/**
 * 4. Admin Quick Action: System Status Observability Modal
 */
export const AdminSystemStatusModal = ({ isOpen, onClose }) => {
    const [statusData, setStatusData] = useState(null);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        if (isOpen) {
            setLoading(true);
            api.get('/admin/command-center/system-status')
                .then(res => {
                    if (res.data && res.data.data) {
                        setStatusData(res.data.data);
                    }
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
            <div className="admin-card" style={{ width: '90%', maxWidth: '550px', padding: '24px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>⚙️ System Observability Status</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                </div>

                {loading ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Fetching system status metrics...</div>
                ) : statusData ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px' }}>
                            <span style={{ fontSize: '20px' }}>🟢</span>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#065f46' }}>System Status: {statusData.status}</div>
                                <div style={{ fontSize: '12px', color: '#047857' }}>Node.js {statusData.server.nodeVersion} • Uptime: {statusData.server.uptimeSeconds} seconds</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>MONGODB CONNECTION</div>
                                <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>{statusData.database.connection}</div>
                            </div>
                            <div style={{ padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>HEAP MEMORY USED</div>
                                <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>{statusData.server.memoryUsageMB} MB</div>
                            </div>
                            <div style={{ padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>TOTAL ISSUES RECORDED</div>
                                <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>{statusData.database.totalIssues}</div>
                            </div>
                            <div style={{ padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>SYSTEM AUDIT LOGS</div>
                                <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>{statusData.database.totalAuditLogs}</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '16px', color: '#ef4444' }}>Unable to retrieve status data.</div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <button onClick={onClose} style={{ padding: '8px 18px', background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Close</button>
                </div>
            </div>
        </div>
    );
};
