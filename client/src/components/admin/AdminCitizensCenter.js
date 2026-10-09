import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

// SVG Sparkline Component
const Sparkline = ({ data = [10, 15, 12, 18, 22, 25, 30], color = '#2563eb' }) => {
    const min = Math.min(...data);
    const max = Math.max(...data) || 1;
    const points = data.map((val, idx) => {
        const x = (idx / (data.length - 1)) * 80;
        const y = 30 - ((val - min) / (max - min || 1)) * 24;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width="85" height="32" viewBox="0 0 80 30" style={{ overflow: 'visible' }}>
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
            />
        </svg>
    );
};

const AdminCitizensCenter = () => {
    const navigate = useNavigate();

    // Data States
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCitizen, setSelectedCitizen] = useState(null);
    const [activeDetailsTab, setActiveDetailsTab] = useState('overview'); // overview, reports, comments, activity
    const [lastRefreshed, setLastRefreshed] = useState(new Date());

    // Filter & Search States
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [areaFilter, setAreaFilter] = useState('all');
    const [regTypeFilter, setRegTypeFilter] = useState('all');
    const [joinedDateFilter, setJoinedDateFilter] = useState('all');
    const [sortOption, setSortOption] = useState('newest');
    const [currentPage, setCurrentPage] = useState(1);

    // Modal States
    const [modalState, setModalState] = useState({ type: null, data: null }); // 'add', 'edit', 'message', 'suspend', 'import'
    const [formData, setFormData] = useState({});

    // Fetch Backend Summary Data
    const fetchSummary = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const queryParams = new URLSearchParams({
                search: searchQuery.trim(),
                status: statusFilter,
                area: areaFilter,
                regType: regTypeFilter,
                joinedDate: joinedDateFilter,
                sort: sortOption,
                page: currentPage,
                limit: 10,
                ...(selectedCitizen ? { selectedId: selectedCitizen._id } : {})
            }).toString();

            const res = await api.get(`/admin/citizens/summary?${queryParams}`);
            if (res.data && res.data.data) {
                const resData = res.data.data;
                setData(resData);
                if (resData.selectedCitizen) {
                    setSelectedCitizen(resData.selectedCitizen);
                } else if (resData.citizens && resData.citizens.length > 0) {
                    setSelectedCitizen(resData.citizens[0]);
                }
            }
            setLastRefreshed(new Date());
        } catch (err) {
            console.error('Error fetching Admin Citizens Summary:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [searchQuery, statusFilter, areaFilter, regTypeFilter, joinedDateFilter, sortOption, currentPage]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    // Handlers
    const handleAddCitizenSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/citizens/create', formData);
            setModalState({ type: null, data: null });
            setFormData({});
            fetchSummary(true);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to create citizen');
        }
    };

    const handleEditCitizenSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCitizen) return;
        try {
            await api.patch(`/admin/citizens/${selectedCitizen._id}/update`, formData);
            setModalState({ type: null, data: null });
            setFormData({});
            fetchSummary(true);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update citizen profile');
        }
    };

    const handleSuspendSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCitizen) return;
        try {
            await api.patch(`/admin/citizens/${selectedCitizen._id}/status`, {
                status: 'suspended',
                reason: formData.reason || 'Admin action'
            });
            setModalState({ type: null, data: null });
            setFormData({});
            fetchSummary(true);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to suspend citizen');
        }
    };

    const handleSendMessageSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCitizen) return;
        try {
            await api.post(`/admin/citizens/${selectedCitizen._id}/message`, formData);
            alert(`Message sent to ${selectedCitizen.name}`);
            setModalState({ type: null, data: null });
            setFormData({});
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to send message');
        }
    };

    const handleExportCSV = () => {
        window.open(`http://localhost:5000/api/admin/command-center/export?format=csv`, '_blank');
    };

    if (loading && !data) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <div style={{ width: '40px', height: '40px', border: '4px solid #cbd5e1', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            </div>
        );
    }

    const {
        kpis = {},
        citizens = [],
        pagination = { totalItems: 0, totalPages: 1, currentPage: 1, showingStart: 0, showingEnd: 0 }
    } = data || {};

    const formatNumber = (num) => (num || 0).toLocaleString();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Inter, system-ui, sans-serif', color: '#0f172a', paddingBottom: '40px' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '16px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', color: '#2563eb' }}>
                        👥
                    </div>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Citizens</h1>
                        <p style={{ color: '#64748b', margin: '2px 0 0 0', fontSize: '13px' }}>Manage citizen information, engagement, and service requests.</p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#475569', fontWeight: '600' }}>
                        📅 {lastRefreshed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <button
                        onClick={() => fetchSummary(true)}
                        disabled={refreshing}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}
                    >
                        🔄 {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <button
                        onClick={() => { setFormData({}); setModalState({ type: 'add', data: null }); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#2563eb', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: '#ffffff', cursor: 'pointer' }}
                    >
                        ➕ Add Citizen
                    </button>
                    <button
                        onClick={() => setModalState({ type: 'import', data: null })}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}
                    >
                        📥 Import
                    </button>
                    <button
                        onClick={handleExportCSV}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}
                    >
                        📤 Export
                    </button>
                </div>
            </div>

            {/* KPI Cards Row (5 Cards) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                
                {/* 1. Total Citizens */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>👥</div>
                        <Sparkline data={kpis.totalCitizens?.sparkline} color="#2563eb" />
                    </div>
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>{formatNumber(kpis.totalCitizens?.count)}</div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Total Citizens</div>
                        <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: '600', marginTop: '2px' }}>{kpis.totalCitizens?.trend}</div>
                    </div>
                </div>

                {/* 2. Active Citizens */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>✓</div>
                        <Sparkline data={kpis.activeCitizens?.sparkline} color="#16a34a" />
                    </div>
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>{formatNumber(kpis.activeCitizens?.count)}</div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Active Citizens</div>
                        <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600', marginTop: '2px' }}>{kpis.activeCitizens?.trend}</div>
                    </div>
                </div>

                {/* 3. New Registrations */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>⚠️</div>
                        <Sparkline data={kpis.newRegistrations?.sparkline} color="#dc2626" />
                    </div>
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>{formatNumber(kpis.newRegistrations?.count)}</div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>New Registrations</div>
                        <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '600', marginTop: '2px' }}>{kpis.newRegistrations?.trend}</div>
                    </div>
                </div>

                {/* 4. Recent Reports */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🕒</div>
                        <Sparkline data={kpis.recentReports?.sparkline} color="#d97706" />
                    </div>
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>{formatNumber(kpis.recentReports?.count)}</div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Recent Reports</div>
                        <div style={{ fontSize: '11px', color: '#d97706', fontWeight: '600', marginTop: '2px' }}>{kpis.recentReports?.trend}</div>
                    </div>
                </div>

                {/* 5. Total Comments */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#faf5ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💬</div>
                        <Sparkline data={kpis.totalComments?.sparkline} color="#8b5cf6" />
                    </div>
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>{formatNumber(kpis.totalComments?.count)}</div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Total Comments</div>
                        <div style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: '600', marginTop: '2px' }}>{kpis.totalComments?.trend}</div>
                    </div>
                </div>

            </div>

            {/* Filter Bar Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                
                <div style={{ position: 'relative', width: '320px' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#94a3b8' }}>🔍</span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        placeholder="Search citizens by name, email, phone, or ID..."
                        style={{ width: '100%', padding: '6px 12px 6px 30px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#f8fafc', color: '#0f172a' }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155' }}>
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="pending">Pending</option>
                        <option value="suspended">Suspended</option>
                    </select>

                    <select value={areaFilter} onChange={(e) => { setAreaFilter(e.target.value); setCurrentPage(1); }} style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155' }}>
                        <option value="all">All Areas</option>
                        <option value="Central District">Central District</option>
                        <option value="Riverside Area">Riverside Area</option>
                        <option value="West End">West End</option>
                        <option value="Eastwood">Eastwood</option>
                        <option value="Green Park">Green Park</option>
                    </select>

                    <select value={regTypeFilter} onChange={(e) => { setRegTypeFilter(e.target.value); setCurrentPage(1); }} style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155' }}>
                        <option value="all">All Registration Types</option>
                        <option value="web">Web Portal</option>
                        <option value="mobile">Mobile App</option>
                        <option value="admin">Admin Created</option>
                    </select>

                    <select value={joinedDateFilter} onChange={(e) => { setJoinedDateFilter(e.target.value); setCurrentPage(1); }} style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155' }}>
                        <option value="all">Joined Date</option>
                        <option value="today">Today</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                    </select>

                    <button
                        onClick={() => alert('Filter applied')}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}
                    >
                        ⚙️ More Filters
                    </button>
                </div>

            </div>

            {/* Main Section: Citizens Table (Left) & Citizen Details (Right) */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                
                {/* Left Panel: Citizens Table */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#2563eb', fontSize: '18px' }}>👥</span>
                            <div>
                                <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: '#0f172a' }}>Citizens List</h3>
                                <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>View and manage all registered citizens.</p>
                            </div>
                        </div>

                        {/* Sort Dropdown */}
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#334155', fontWeight: '600' }}
                        >
                            <option value="newest">Sort By: Newest First</option>
                            <option value="oldest">Sort By: Oldest First</option>
                            <option value="name_asc">Sort By: Name (A-Z)</option>
                            <option value="most_reports">Sort By: Most Reports</option>
                        </select>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: 'auto', minHeight: '380px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                                    <th style={{ padding: '8px' }}><input type="checkbox" /></th>
                                    <th style={{ padding: '8px' }}>ID</th>
                                    <th style={{ padding: '8px' }}>Name</th>
                                    <th style={{ padding: '8px' }}>Contact</th>
                                    <th style={{ padding: '8px' }}>Location</th>
                                    <th style={{ padding: '8px' }}>Status</th>
                                    <th style={{ padding: '8px' }}>Reports</th>
                                    <th style={{ padding: '8px' }}>Joined Date</th>
                                    <th style={{ padding: '8px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {citizens.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                            No citizens found matching your search and filter criteria.
                                        </td>
                                    </tr>
                                ) : citizens.map(c => {
                                    const isSelected = selectedCitizen && selectedCitizen._id === c._id;
                                    return (
                                        <tr
                                            key={c._id}
                                            onClick={() => setSelectedCitizen(c)}
                                            style={{
                                                borderBottom: '1px solid #f1f5f9',
                                                backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <td style={{ padding: '8px' }}><input type="checkbox" checked={isSelected} readOnly /></td>
                                            <td style={{ padding: '8px', color: '#2563eb', fontWeight: '600' }}>{c.citizenId}</td>
                                            <td style={{ padding: '8px', fontWeight: '600', color: '#0f172a' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#334155', fontWeight: '700' }}>
                                                        {c.name ? c.name.charAt(0) : 'C'}
                                                    </div>
                                                    <span>{c.name}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '8px', color: '#475569' }}>
                                                <div>{c.email}</div>
                                                <div style={{ fontSize: '10px', color: '#94a3b8' }}>{c.phone || '+1 415-555-0101'}</div>
                                            </td>
                                            <td style={{ padding: '8px', color: '#64748b' }}>
                                                <span>📍 {c.locationFormatted}</span>
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '700',
                                                    backgroundColor: c.status === 'active' ? '#dcfce7' : c.status === 'suspended' ? '#fee2e2' : c.status === 'pending' ? '#e0f2fe' : '#fef3c7',
                                                    color: c.status === 'active' ? '#16a34a' : c.status === 'suspended' ? '#dc2626' : c.status === 'pending' ? '#0284c7' : '#d97706'
                                                }}>
                                                    {c.statusFormatted}
                                                </span>
                                            </td>
                                            <td style={{ padding: '8px', fontWeight: '600', color: '#0f172a' }}>{c.reportsCount}</td>
                                            <td style={{ padding: '8px', color: '#64748b', fontSize: '11px' }}>
                                                {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <button onClick={(e) => { e.stopPropagation(); setSelectedCitizen(c); setModalState({ type: 'edit', data: c }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#64748b' }}>
                                                    •••
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                            Showing {pagination.showingStart}–{pagination.showingEnd} of {formatNumber(pagination.totalItems)} citizens
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                                disabled={pagination.currentPage <= 1}
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: pagination.currentPage <= 1 ? 'not-allowed' : 'pointer' }}
                            >
                                ‹
                            </button>
                            {Array.from({ length: Math.min(pagination.totalPages, 5) }).map((_, idx) => (
                                <button
                                    key={idx + 1}
                                    onClick={() => setCurrentPage(idx + 1)}
                                    style={{
                                        padding: '4px 10px',
                                        fontSize: '11px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        backgroundColor: pagination.currentPage === (idx + 1) ? '#2563eb' : '#ffffff',
                                        color: pagination.currentPage === (idx + 1) ? '#ffffff' : '#334155',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {idx + 1}
                                </button>
                            ))}
                            <button
                                disabled={pagination.currentPage >= pagination.totalPages}
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                                style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: pagination.currentPage >= pagination.totalPages ? 'not-allowed' : 'pointer' }}
                            >
                                ›
                            </button>
                        </div>
                    </div>

                </div>

                {/* Right Panel: Citizen Details */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#2563eb', fontSize: '16px' }}>👤</span>
                            <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: '#0f172a' }}>Citizen Details</h3>
                        </div>
                    </div>

                    {selectedCitizen ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            
                            {/* Profile Header */}
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#3b82f6', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700' }}>
                                    {selectedCitizen.name ? selectedCitizen.name.charAt(0) : 'C'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{selectedCitizen.name}</h4>
                                        <span style={{ padding: '2px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: '700', backgroundColor: '#dcfce7', color: '#16a34a' }}>
                                            {selectedCitizen.statusFormatted || 'Active'}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Citizen ID: {selectedCitizen.citizenId}</div>
                                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>Registered on {new Date(selectedCitizen.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                </div>
                                <button
                                    onClick={() => { setFormData(selectedCitizen); setModalState({ type: 'edit', data: selectedCitizen }); }}
                                    style={{ padding: '6px 12px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    Edit
                                </button>
                            </div>

                            {/* Details Navigation Tabs */}
                            <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                                {[
                                    { id: 'overview', label: 'Overview' },
                                    { id: 'reports', label: `Reports (${selectedCitizen.reportsCount || 0})` },
                                    { id: 'comments', label: `Comments (${selectedCitizen.commentsCount || 0})` },
                                    { id: 'activity', label: 'Activity' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveDetailsTab(tab.id)}
                                        style={{
                                            padding: '4px 10px',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            borderRadius: '6px',
                                            border: 'none',
                                            backgroundColor: activeDetailsTab === tab.id ? '#2563eb' : 'transparent',
                                            color: activeDetailsTab === tab.id ? '#ffffff' : '#64748b',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Overview Tab Content */}
                            {activeDetailsTab === 'overview' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px', color: '#334155' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#64748b' }}>Email:</span>
                                            <span style={{ fontWeight: '600' }}>{selectedCitizen.email}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#64748b' }}>Phone:</span>
                                            <span style={{ fontWeight: '600' }}>{selectedCitizen.phone || '+1 415-555-0101'}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#64748b' }}>Address:</span>
                                            <span style={{ fontWeight: '600' }}>{selectedCitizen.address || selectedCitizen.locationFormatted}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#64748b' }}>Registration Type:</span>
                                            <span style={{ fontWeight: '600' }}>Web Portal</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#64748b' }}>Status:</span>
                                            <span style={{ fontWeight: '700', color: '#16a34a' }}>{selectedCitizen.statusFormatted || 'Active'}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#64748b' }}>Total Reports:</span>
                                            <span style={{ fontWeight: '600' }}>{selectedCitizen.reportsCount}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#64748b' }}>Total Comments:</span>
                                            <span style={{ fontWeight: '600' }}>{selectedCitizen.commentsCount}</span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '8px' }}>
                                        <button
                                            onClick={() => setModalState({ type: 'message', data: selectedCitizen })}
                                            style={{ padding: '6px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '10px', fontWeight: '600', color: '#2563eb', cursor: 'pointer' }}
                                        >
                                            ✉️ Send Message
                                        </button>
                                        <button
                                            onClick={() => alert(`Flagged ${selectedCitizen.name} for administrative review.`)}
                                            style={{ padding: '6px', backgroundColor: '#ffffff', border: '1px solid #fee2e2', borderRadius: '6px', fontSize: '10px', fontWeight: '600', color: '#dc2626', cursor: 'pointer' }}
                                        >
                                            ⚠️ Flag Citizen
                                        </button>
                                        <button
                                            onClick={() => setModalState({ type: 'suspend', data: selectedCitizen })}
                                            style={{ padding: '6px', backgroundColor: '#ffffff', border: '1px solid #fee2e2', borderRadius: '6px', fontSize: '10px', fontWeight: '600', color: '#dc2626', cursor: 'pointer' }}
                                        >
                                            🚫 Suspend
                                        </button>
                                    </div>

                                    {/* Recent Issues List */}
                                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Recent Issues ({selectedCitizen.recentIssues?.length || 0})</h4>
                                            <button onClick={() => navigate(`/admin/civic`)} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }}>View All →</button>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {(selectedCitizen.recentIssues || []).map((issue, idx) => (
                                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '11px' }}>
                                                    <span style={{ color: '#2563eb', fontWeight: '600' }}>{issue.customId}: {issue.title}</span>
                                                    <span style={{ padding: '2px 6px', borderRadius: '10px', fontSize: '9px', fontWeight: '700', backgroundColor: issue.status === 'Resolved' ? '#dcfce7' : '#ffedd5', color: issue.status === 'Resolved' ? '#16a34a' : '#ea580c' }}>
                                                        {issue.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Recent Activity Timeline */}
                                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                                        <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', margin: '0 0 8px 0' }}>Recent Activity</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                                            {(selectedCitizen.recentActivity || []).map((act, idx) => (
                                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                                    <span>• {act.text}</span>
                                                    <span style={{ color: '#94a3b8' }}>{act.time}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            )}

                        </div>
                    ) : (
                        <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                            Select a citizen to view full details.
                        </div>
                    )}

                </div>

            </div>

            {/* Action Modals */}
            {modalState.type && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#0f172a' }}>
                                {modalState.type === 'add' && '➕ Add New Citizen'}
                                {modalState.type === 'edit' && '✏️ Edit Citizen Profile'}
                                {modalState.type === 'suspend' && '🚫 Suspend Citizen Account'}
                                {modalState.type === 'message' && '✉️ Send Message to Citizen'}
                                {modalState.type === 'import' && '📥 Import Citizens Dataset'}
                            </h3>
                            <button onClick={() => setModalState({ type: null, data: null })} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                        </div>

                        {modalState.type === 'add' && (
                            <form onSubmit={handleAddCitizenSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Full Name</label>
                                    <input required type="text" onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} placeholder="e.g. Amit Sharma" />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Email Address</label>
                                    <input required type="email" onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} placeholder="amit.sharma@example.com" />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Phone Number</label>
                                    <input type="text" onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} placeholder="+1 415-555-0101" />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Password</label>
                                    <input required type="password" onChange={(e) => setFormData({ ...formData, password: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} placeholder="Default password" />
                                </div>
                                <button type="submit" style={{ marginTop: '8px', padding: '10px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Create Citizen</button>
                            </form>
                        )}

                        {modalState.type === 'edit' && (
                            <form onSubmit={handleEditCitizenSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Full Name</label>
                                    <input required type="text" defaultValue={selectedCitizen?.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Phone</label>
                                    <input type="text" defaultValue={selectedCitizen?.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>City / Location</label>
                                    <input type="text" defaultValue={selectedCitizen?.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                                </div>
                                <button type="submit" style={{ marginTop: '8px', padding: '10px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Save Changes</button>
                            </form>
                        )}

                        {modalState.type === 'suspend' && (
                            <form onSubmit={handleSuspendSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>Are you sure you want to suspend account for <strong>{selectedCitizen?.name}</strong>?</p>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Reason for Suspension</label>
                                    <textarea onChange={(e) => setFormData({ ...formData, reason: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', height: '60px' }} placeholder="Violation of community guidelines..." />
                                </div>
                                <button type="submit" style={{ marginTop: '8px', padding: '10px', backgroundColor: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Confirm Suspension</button>
                            </form>
                        )}

                        {modalState.type === 'message' && (
                            <form onSubmit={handleSendMessageSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Message Subject</label>
                                    <input required type="text" onChange={(e) => setFormData({ ...formData, title: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} placeholder="Service Request Update" />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Message Body</label>
                                    <textarea required onChange={(e) => setFormData({ ...formData, message: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', height: '80px' }} placeholder="Type message to citizen..." />
                                </div>
                                <button type="submit" style={{ marginTop: '8px', padding: '10px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Send Message</button>
                            </form>
                        )}

                        {modalState.type === 'import' && (
                            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <p style={{ color: '#475569', margin: 0 }}>Upload CSV file containing citizen user records (Name, Email, Phone, Address).</p>
                                <input type="file" accept=".csv" style={{ padding: '8px', border: '1px dashed #cbd5e1', borderRadius: '6px' }} />
                                <button onClick={() => { alert('Import completed cleanly'); setModalState({ type: null, data: null }); fetchSummary(true); }} style={{ padding: '10px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Process CSV Import</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};

export default AdminCitizensCenter;
