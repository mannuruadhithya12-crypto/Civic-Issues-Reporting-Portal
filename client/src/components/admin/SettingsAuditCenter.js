import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Spinner from '../common/Spinner';

const SettingsAuditCenter = () => {
    const [activeTab, setActiveTab] = useState('settings'); // 'settings' | 'audit'
    const [settings, setSettings] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditTotal, setAuditTotal] = useState(0);
    const [auditPage, setAuditPage] = useState(1);
    const [auditActionFilter, setAuditActionFilter] = useState('');
    const [auditSearch, setAuditSearch] = useState('');
    
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);
    const [loadingAudit, setLoadingAudit] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        if (activeTab === 'audit') {
            fetchAuditLogs();
        }
    }, [activeTab, auditPage, auditActionFilter]);

    const fetchSettings = async () => {
        setLoadingSettings(true);
        try {
            const res = await api.get('/admin/settings');
            setSettings(res.data);
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        } finally {
            setLoadingSettings(false);
        }
    };

    const fetchAuditLogs = async () => {
        setLoadingAudit(true);
        try {
            const params = new URLSearchParams({ page: auditPage, limit: 25 });
            if (auditActionFilter) params.append('action', auditActionFilter);
            if (auditSearch) params.append('search', auditSearch);

            const res = await api.get(`/admin/audit-logs?${params.toString()}`);
            setAuditLogs(res.data.logs || []);
            setAuditTotal(res.data.total || 0);
        } catch (err) {
            console.error('Failed to fetch audit logs:', err);
        } finally {
            setLoadingAudit(false);
        }
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setSavingSettings(true);
        try {
            const res = await api.put('/admin/settings', settings);
            setSettings(res.data.settings);
            alert('System settings updated and audited successfully!');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update settings');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleAuditSearchSubmit = (e) => {
        e.preventDefault();
        setAuditPage(1);
        fetchAuditLogs();
    };

    const totalAuditPages = Math.ceil(auditTotal / 25);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header */}
            <div>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Settings & System Audit</h1>
                <p style={{ color: 'var(--admin-text-muted)', margin: 0, fontSize: '14px' }}>
                    Configure SLA thresholds, optimization bounds, safety gates, and review immutable operational audit trails.
                </p>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--admin-border)', gap: '8px' }}>
                <button
                    onClick={() => setActiveTab('settings')}
                    style={{
                        padding: '10px 20px', background: 'none', border: 'none',
                        borderBottom: activeTab === 'settings' ? '2px solid var(--admin-primary)' : '2px solid transparent',
                        color: activeTab === 'settings' ? 'var(--admin-primary)' : 'var(--admin-text-muted)',
                        fontWeight: '600', cursor: 'pointer', fontSize: '14px'
                    }}
                >
                    ⚙️ Operational Settings
                </button>
                <button
                    onClick={() => setActiveTab('audit')}
                    style={{
                        padding: '10px 20px', background: 'none', border: 'none',
                        borderBottom: activeTab === 'audit' ? '2px solid var(--admin-primary)' : '2px solid transparent',
                        color: activeTab === 'audit' ? 'var(--admin-primary)' : 'var(--admin-text-muted)',
                        fontWeight: '600', cursor: 'pointer', fontSize: '14px'
                    }}
                >
                    📜 Audit Log History ({auditTotal})
                </button>
            </div>

            {/* TAB 1: System Settings Form */}
            {activeTab === 'settings' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
                    {loadingSettings ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}><Spinner /></div>
                    ) : settings ? (
                        <>
                            {/* SLA Configurations */}
                            <div className="admin-card">
                                <h3 className="admin-card-title" style={{ marginBottom: '16px' }}>SLA Target Deadlines (Hours)</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Urgent Priority SLA</label>
                                        <input 
                                            type="number"
                                            value={settings.slaHours?.urgent ?? 24}
                                            onChange={(e) => setSettings({ ...settings, slaHours: { ...settings.slaHours, urgent: parseInt(e.target.value) || 0 } })}
                                            className="admin-input"
                                            style={{ width: '100%', boxSizing: 'border-box' }}
                                        />
                                        <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>Default: 24h</span>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>High Priority SLA</label>
                                        <input 
                                            type="number"
                                            value={settings.slaHours?.high ?? 72}
                                            onChange={(e) => setSettings({ ...settings, slaHours: { ...settings.slaHours, high: parseInt(e.target.value) || 0 } })}
                                            className="admin-input"
                                            style={{ width: '100%', boxSizing: 'border-box' }}
                                        />
                                        <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>Default: 72h</span>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Normal Priority SLA</label>
                                        <input 
                                            type="number"
                                            value={settings.slaHours?.normal ?? 168}
                                            onChange={(e) => setSettings({ ...settings, slaHours: { ...settings.slaHours, normal: parseInt(e.target.value) || 0 } })}
                                            className="admin-input"
                                            style={{ width: '100%', boxSizing: 'border-box' }}
                                        />
                                        <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>Default: 168h (7 days)</span>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Low Priority SLA</label>
                                        <input 
                                            type="number"
                                            value={settings.slaHours?.low ?? 336}
                                            onChange={(e) => setSettings({ ...settings, slaHours: { ...settings.slaHours, low: parseInt(e.target.value) || 0 } })}
                                            className="admin-input"
                                            style={{ width: '100%', boxSizing: 'border-box' }}
                                        />
                                        <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>Default: 336h (14 days)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Optimization & Safety Bounds */}
                            <div className="admin-card">
                                <h3 className="admin-card-title" style={{ marginBottom: '16px' }}>Optimization & Safety Thresholds</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Default Optimization Budget ($)</label>
                                        <input 
                                            type="number"
                                            value={settings.optimizationDefaults?.budget ?? 100000}
                                            onChange={(e) => setSettings({ ...settings, optimizationDefaults: { ...settings.optimizationDefaults, budget: parseInt(e.target.value) || 0 } })}
                                            className="admin-input"
                                            style={{ width: '100%', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Max Budget Per Single Intervention ($)</label>
                                        <input 
                                            type="number"
                                            value={settings.safetyThresholds?.maxBudgetPerIntervention ?? 50000}
                                            onChange={(e) => setSettings({ ...settings, safetyThresholds: { ...settings.safetyThresholds, maxBudgetPerIntervention: parseInt(e.target.value) || 0 } })}
                                            className="admin-input"
                                            style={{ width: '100%', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Min RL Transitions for Production Gate</label>
                                        <input 
                                            type="number"
                                            value={settings.safetyThresholds?.minRequiredRLTransitions ?? 25}
                                            onChange={(e) => setSettings({ ...settings, safetyThresholds: { ...settings.safetyThresholds, minRequiredRLTransitions: parseInt(e.target.value) || 0 } })}
                                            className="admin-input"
                                            style={{ width: '100%', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Evaluation Minimum Observation Delay (Hours)</label>
                                        <input 
                                            type="number"
                                            value={settings.safetyThresholds?.minEvaluationDelayHours ?? 24}
                                            onChange={(e) => setSettings({ ...settings, safetyThresholds: { ...settings.safetyThresholds, minEvaluationDelayHours: parseInt(e.target.value) || 0 } })}
                                            className="admin-input"
                                            style={{ width: '100%', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Save Button */}
                            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button 
                                    onClick={fetchSettings} 
                                    className="admin-btn admin-btn-secondary"
                                    disabled={savingSettings}
                                >
                                    Reset Unsaved
                                </button>
                                <button 
                                    onClick={handleSaveSettings} 
                                    className="admin-btn admin-btn-primary"
                                    disabled={savingSettings}
                                >
                                    {savingSettings ? 'Saving Settings...' : '💾 Save Settings (Audited)'}
                                </button>
                            </div>
                        </>
                    ) : null}
                </div>
            )}

            {/* TAB 2: Immutable Audit Log Stream */}
            {activeTab === 'audit' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Search & Action Filter */}
                    <div className="admin-card" style={{ padding: '16px' }}>
                        <form onSubmit={handleAuditSearchSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ flex: 1, minWidth: '220px' }}>
                                <input 
                                    type="text" 
                                    placeholder="Search by actor, action name, or target..." 
                                    value={auditSearch}
                                    onChange={(e) => setAuditSearch(e.target.value)}
                                    className="admin-input"
                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <select 
                                    value={auditActionFilter}
                                    onChange={(e) => { setAuditActionFilter(e.target.value); setAuditPage(1); }}
                                    className="admin-select"
                                >
                                    <option value="">All Action Types</option>
                                    <option value="ISSUE_VERIFY">Issue Verify</option>
                                    <option value="WORKER_ASSIGNMENT">Worker Assignment</option>
                                    <option value="WORKER_CREATE">Worker Create</option>
                                    <option value="WORKER_UPDATE">Worker Update</option>
                                    <option value="CAMPAIGN_CREATE">Campaign Create</option>
                                    <option value="CAMPAIGN_STATUS_CHANGE">Campaign Status Change</option>
                                    <option value="INTERVENTION_APPROVE">Intervention Approve</option>
                                    <option value="INTERVENTION_EXECUTE">Intervention Execute</option>
                                    <option value="INTERVENTION_EVALUATE">Intervention Evaluate</option>
                                    <option value="POLICY_CREATE">Policy Create</option>
                                    <option value="POLICY_TRANSITION">Policy Transition</option>
                                    <option value="SETTINGS_UPDATE">Settings Update</option>
                                </select>
                            </div>
                            <button type="submit" className="admin-btn admin-btn-primary">
                                Search Logs
                            </button>
                        </form>
                    </div>

                    {/* Audit Logs Table */}
                    <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>Actor</th>
                                        <th>Action</th>
                                        <th>Target Type</th>
                                        <th>Target Description</th>
                                        <th>Outcome</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingAudit ? (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}><Spinner /></td>
                                        </tr>
                                    ) : auditLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--admin-text-muted)' }}>
                                                No audit entries match the criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        auditLogs.map(log => (
                                            <tr key={log._id}>
                                                <td style={{ fontSize: '12px', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}>
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: '600', fontSize: '13px' }}>{log.actorName}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{log.actorRole}</div>
                                                </td>
                                                <td>
                                                    <span className="admin-badge neutral" style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td>{log.targetType}</td>
                                                <td style={{ maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '12px' }}>
                                                    {log.targetLabel || log.targetId || '-'}
                                                </td>
                                                <td>
                                                    <span className={`admin-badge ${log.outcome === 'SUCCESS' ? 'success' : 'danger'}`}>
                                                        {log.outcome}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', fontSize: '12px', color: 'var(--admin-text-muted)' }}>
                            <span>Showing page {auditPage} of {totalAuditPages || 1} ({auditTotal} total entries)</span>
                            {totalAuditPages > 1 && (
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button 
                                        disabled={auditPage === 1}
                                        onClick={() => setAuditPage(p => p - 1)}
                                        style={{ padding: '4px 8px', border: '1px solid var(--admin-border)', background: 'white', borderRadius: '4px', cursor: auditPage === 1 ? 'not-allowed' : 'pointer' }}
                                    >
                                        &lt;
                                    </button>
                                    <button 
                                        disabled={auditPage === totalAuditPages}
                                        onClick={() => setAuditPage(p => p + 1)}
                                        style={{ padding: '4px 8px', border: '1px solid var(--admin-border)', background: 'white', borderRadius: '4px', cursor: auditPage === totalAuditPages ? 'not-allowed' : 'pointer' }}
                                    >
                                        &gt;
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsAuditCenter;
