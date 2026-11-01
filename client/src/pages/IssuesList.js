import React, { useEffect, useState, useContext } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import '../styles/citizen.css';

// SVG Category Icons Helper
const CategoryIcon = ({ category }) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('road') || cat.includes('pothole')) {
    return (
      <svg width="14" height="14" fill="none" stroke="#475569" viewBox="0 0 24 24" strokeWidth="2">
        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  }
  if (cat.includes('garbage') || cat.includes('waste')) {
    return (
      <svg width="14" height="14" fill="none" stroke="#16a34a" viewBox="0 0 24 24" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    );
  }
  if (cat.includes('street') || cat.includes('light') || cat.includes('electric')) {
    return (
      <svg width="14" height="14" fill="none" stroke="#f59e0b" viewBox="0 0 24 24" strokeWidth="2">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    );
  }
  if (cat.includes('water') || cat.includes('drain') || cat.includes('leak')) {
    return (
      <svg width="14" height="14" fill="none" stroke="#2563eb" viewBox="0 0 24 24" strokeWidth="2">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
    );
  }
  if (cat.includes('park') || cat.includes('tree') || cat.includes('green')) {
    return (
      <svg width="14" height="14" fill="none" stroke="#16a34a" viewBox="0 0 24 24" strokeWidth="2">
        <path d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" fill="none" stroke="#9333ea" viewBox="0 0 24 24" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
};

// Formatting Issue Code (#CC-YYYY-XXXXX)
const getIssueCode = (issue) => {
  if (!issue) return '#CC-2024-00000';
  const year = issue.createdAt ? new Date(issue.createdAt).getFullYear() : '2026';
  const num = issue._id ? issue._id.substring(issue._id.length - 5).toUpperCase() : '00001';
  return `#CC-${year}-${num}`;
};

// Relative Time Helper
const getRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 30) return date.toLocaleDateString();
  if (diffDay > 7) {
    const weeks = Math.floor(diffDay / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffMin > 0) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  return 'Just now';
};

const formatStatus = (status) => {
  const s = (status || 'reported').toLowerCase();
  if (s === 'in_progress' || s === 'in-progress') return 'In Progress';
  if (s === 'under_review' || s === 'verified') return 'Under Review';
  if (s === 'reported') return 'Reported';
  if (s === 'resolved') return 'Resolved';
  if (s === 'closed') return 'Closed';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const getStatusClass = (status) => {
  const s = (status || 'reported').toLowerCase();
  if (s === 'in_progress' || s === 'in-progress' || s === 'assigned') return 'in_progress';
  if (s === 'reported') return 'reported';
  if (s === 'resolved') return 'resolved';
  if (s === 'under_review' || s === 'verified') return 'under_review';
  if (s === 'closed' || s === 'rejected') return 'closed';
  return 'reported';
};

function IssuesList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [issues, setIssues] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState({ totalReported: 0, resolved: 0, inProgress: 0, underReview: 0, closed: 0 });

  // Filters State
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'All Status');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'All Categories');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sort') || 'Newest First');
  const [activeMenuId, setActiveMenuId] = useState(null);

  const page = parseInt(searchParams.get('page') || '1', 10);

  // Synchronize URL search params
  const updateUrlParams = (newParams) => {
    const updated = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, val]) => {
      if (val && val !== 'All Status' && val !== 'All Categories' && val !== 'Newest First' && val !== '1') {
        updated.set(key, val);
      } else {
        updated.delete(key);
      }
    });
    setSearchParams(updated);
  };

  const fetchIssuesData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch summary and paginated issues in parallel
      const [summaryRes, issuesRes] = await Promise.all([
        api.get('/issues/my/summary'),
        api.get('/issues/my', {
          params: {
            page,
            limit: 5,
            search,
            status: statusFilter,
            category: categoryFilter,
            sort: sortOrder
          }
        })
      ]);

      if (summaryRes && summaryRes.data && summaryRes.data.data) {
        setSummary(summaryRes.data.data);
      }

      if (issuesRes && issuesRes.data) {
        const issuesData = issuesRes.data.issues || issuesRes.data.data || (Array.isArray(issuesRes.data) ? issuesRes.data : []);
        setIssues(issuesData);
        if (issuesRes.data.pagination) {
          setPagination(issuesRes.data.pagination);
        } else {
          setPagination({ page, limit: 5, total: issuesData.length, totalPages: Math.ceil(issuesData.length / 5) || 1 });
        }
      }
    } catch (err) {
      console.error("Error fetching My Issues:", err);
      setError("Unable to load your issues.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssuesData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page, search, statusFilter, categoryFilter, sortOrder]);

  if (!user) {
    return (
      <div style={{ background: 'white', borderRadius: '20px', padding: '48px', textAlign: 'center', border: '1px solid #e2e8f0', marginTop: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>Please Log In</h2>
        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>Log in to view and track your reported civic issues.</p>
        <button onClick={() => navigate('/login')} className="btn-report-new">Go to Login</button>
      </div>
    );
  }

  // Calculate percentages for summary cards
  const total = summary.totalReported || 1;
  const percentResolved = summary.totalReported > 0 ? Math.round((summary.resolved / total) * 100) : 0;
  const percentInProgress = summary.totalReported > 0 ? Math.round((summary.inProgress / total) * 100) : 0;
  const percentUnderReview = summary.totalReported > 0 ? Math.round((summary.underReview / total) * 100) : 0;
  const percentClosed = summary.totalReported > 0 ? Math.round((summary.closed / total) * 100) : 0;

  const startItem = (pagination.page - 1) * pagination.limit + (pagination.total > 0 ? 1 : 0);
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* PAGE HEADER */}
      <div className="my-issues-header">
        <div className="my-issues-title-group">
          <h1>My Issues</h1>
          <p>Track and manage the issues you have reported. Stay updated on their progress.</p>
        </div>
        <button className="btn-report-new" onClick={() => navigate('/submit')}>
          <span style={{ fontSize: '16px' }}>＋</span> Report a New Issue
        </button>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '14px', fontSize: '13px', color: '#991b1b', display: 'flex', justifyContext: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {error}</span>
          <button onClick={fetchIssuesData} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      {/* 5 SUMMARY CARDS */}
      <div className="my-issues-summary-row">
        
        {/* 1. Total Reported */}
        <div className="my-issues-summary-card">
          <div className="summary-card-icon blue">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div className="summary-card-details">
            <span className="summary-card-val">{loading ? '...' : error ? '—' : summary.totalReported}</span>
            <span className="summary-card-title">Total Reported</span>
            <span className="summary-card-sub">{error ? 'Unavailable' : 'All time'}</span>
          </div>
        </div>

        {/* 2. Resolved */}
        <div className="my-issues-summary-card">
          <div className="summary-card-icon green">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="summary-card-details">
            <span className="summary-card-val">{loading ? '...' : error ? '—' : summary.resolved}</span>
            <span className="summary-card-title">Resolved</span>
            <span className="summary-card-sub">{error ? 'Unavailable' : summary.totalReported > 0 ? `${percentResolved}% resolved` : '0% resolved'}</span>
          </div>
        </div>

        {/* 3. In Progress */}
        <div className="my-issues-summary-card">
          <div className="summary-card-icon orange">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="summary-card-details">
            <span className="summary-card-val">{loading ? '...' : error ? '—' : summary.inProgress}</span>
            <span className="summary-card-title">In Progress</span>
            <span className="summary-card-sub">{error ? 'Unavailable' : summary.totalReported > 0 ? `${percentInProgress}% in progress` : '0% in progress'}</span>
          </div>
        </div>

        {/* 4. Under Review */}
        <div className="my-issues-summary-card">
          <div className="summary-card-icon purple">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div className="summary-card-details">
            <span className="summary-card-val">{loading ? '...' : error ? '—' : summary.underReview}</span>
            <span className="summary-card-title">Under Review</span>
            <span className="summary-card-sub">{error ? 'Unavailable' : summary.totalReported > 0 ? `${percentUnderReview}% under review` : '0% under review'}</span>
          </div>
        </div>

        {/* 5. Closed */}
        <div className="my-issues-summary-card">
          <div className="summary-card-icon red">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="summary-card-details">
            <span className="summary-card-val">{loading ? '...' : error ? '—' : summary.closed}</span>
            <span className="summary-card-title">Closed</span>
            <span className="summary-card-sub">{error ? 'Unavailable' : summary.totalReported > 0 ? `${percentClosed}% closed` : '0% closed'}</span>
          </div>
        </div>

      </div>

      {/* SEARCH & FILTERS ROW */}
      <div className="my-issues-filters-row">
        
        {/* Search Input */}
        <div className="filter-search-box">
          <svg className="filter-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              updateUrlParams({ search: e.target.value, page: 1 });
            }}
            placeholder="Search by issue title, location, or ID..."
            className="filter-search-input"
          />
        </div>

        {/* Filter 1: Status */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            updateUrlParams({ status: e.target.value, page: 1 });
          }}
          className="filter-select"
        >
          <option value="All Status">All Status</option>
          <option value="Reported">Reported</option>
          <option value="Under Review">Under Review</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>

        {/* Filter 2: Category */}
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            updateUrlParams({ category: e.target.value, page: 1 });
          }}
          className="filter-select"
        >
          <option value="All Categories">All Categories</option>
          <option value="Potholes">Potholes / Roads</option>
          <option value="Garbage overflow">Waste / Garbage</option>
          <option value="Streetlight failures">Streetlights</option>
          <option value="Water leakage">Water Supply</option>
          <option value="Parks">Parks & Trees</option>
          <option value="Drainage issues">Drainage</option>
        </select>

        {/* Filter 3: Sort Order */}
        <select
          value={sortOrder}
          onChange={(e) => {
            setSortOrder(e.target.value);
            updateUrlParams({ sort: e.target.value, page: 1 });
          }}
          className="filter-select"
        >
          <option value="Newest First">Newest First</option>
          <option value="Oldest First">Oldest First</option>
        </select>

      </div>

      {/* ISSUES TABLE LIST CONTAINER */}
      <div className="my-issues-table-container">
        
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            Loading issues...
          </div>
        ) : error ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', background: '#fff' }}>
            <div style={{ fontSize: '32px' }}>⚠️</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Unable to load your issues</div>
            <div style={{ fontSize: '13px', color: '#64748b', maxWidth: '360px', margin: '0 auto' }}>
              We couldn't retrieve your data right now. Please try again.
            </div>
            <button onClick={fetchIssuesData} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }}>
              Retry
            </button>
          </div>
        ) : issues.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '32px' }}>📋</div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>No issues reported yet</div>
            <div style={{ fontSize: '12px', color: '#64748b', maxWidth: '360px', margin: '0 auto' }}>
              Report a civic issue in your area and track its real-time resolution progress here.
            </div>
            <button onClick={() => navigate('/submit')} className="btn-report-new" style={{ marginTop: '12px' }}>
              Report Your First Issue
            </button>
          </div>
        ) : (
          <table className="my-issues-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Issue</th>
                <th style={{ width: '15%' }}>Status</th>
                <th style={{ width: '15%' }}>Category</th>
                <th style={{ width: '20%' }}>Location</th>
                <th style={{ width: '12%' }}>Reported On</th>
                <th style={{ width: '8%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <tr key={issue._id}>
                  
                  {/* Issue Column (Thumbnail + Title + Code) */}
                  <td>
                    <div className="issue-cell-wrapper">
                      <div className="issue-cell-thumb">
                        {issue.images && issue.images.length > 0 ? (
                          <img 
                            src={issue.images[0].startsWith('http') ? issue.images[0] : `${issue.images[0].startsWith('/') ? '' : '/'}${issue.images[0]}`} 
                            alt={issue.title} 
                          />
                        ) : (
                          <CategoryIcon category={issue.department} />
                        )}
                      </div>
                      <div className="issue-cell-info">
                        <span className="issue-cell-title">{issue.title}</span>
                        <span className="issue-cell-code">{getIssueCode(issue)}</span>
                      </div>
                    </div>
                  </td>

                  {/* Status Column */}
                  <td>
                    <span className={`status-pill ${getStatusClass(issue.status)}`}>
                      {formatStatus(issue.status)}
                    </span>
                  </td>

                  {/* Category Column */}
                  <td>
                    <div className="cell-category">
                      <CategoryIcon category={issue.department} />
                      <span>{issue.department || 'General'}</span>
                    </div>
                  </td>

                  {/* Location Column */}
                  <td>
                    <div className="cell-location">
                      <svg width="12" height="12" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                        {issue.locationName || issue.location || 'Municipal Area'}
                      </span>
                    </div>
                  </td>

                  {/* Reported On Column */}
                  <td>
                    <div className="cell-date">
                      <span className="cell-date-main">
                        {new Date(issue.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="cell-date-sub">{getRelativeTime(issue.createdAt)}</span>
                    </div>
                  </td>

                  {/* Actions Column */}
                  <td style={{ textAlign: 'right' }}>
                    <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                      <button 
                        className="btn-view-details"
                        onClick={() => navigate(`/issues/${issue._id}`)}
                      >
                        View Details
                      </button>

                      <button 
                        className="btn-action-dots"
                        onClick={() => setActiveMenuId(activeMenuId === issue._id ? null : issue._id)}
                      >
                        ⋮
                      </button>

                      {activeMenuId === issue._id && (
                        <div className="action-menu-dropdown">
                          <div 
                            className="action-menu-item"
                            onClick={() => {
                              setActiveMenuId(null);
                              navigate(`/issues/${issue._id}`);
                            }}
                          >
                            👁️ View Details
                          </div>
                          <div 
                            className="action-menu-item"
                            onClick={() => {
                              setActiveMenuId(null);
                              navigate(`/issues/${issue._id}`);
                            }}
                          >
                            📈 Track Issue
                          </div>
                          <div 
                            className="action-menu-item"
                            onClick={() => {
                              setActiveMenuId(null);
                              navigate(`/map?highlight=${issue._id}`);
                            }}
                          >
                            🗺️ Open on Map
                          </div>
                        </div>
                      )}
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>

      {/* PAGINATION ROW */}
      <div className="my-issues-pagination-row">
        <div className="pagination-info">
          Showing {startItem}–{endItem} of {pagination.total} issues
        </div>

        <div className="pagination-controls">
          <button 
            className="page-btn"
            disabled={pagination.page <= 1}
            onClick={() => updateUrlParams({ page: pagination.page - 1 })}
          >
            ‹
          </button>

          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={`page-btn ${p === pagination.page ? 'active' : ''}`}
              onClick={() => updateUrlParams({ page: p })}
            >
              {p}
            </button>
          ))}

          <button 
            className="page-btn"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => updateUrlParams({ page: pagination.page + 1 })}
          >
            ›
          </button>
        </div>
      </div>

    </div>
  );
}

export default IssuesList;
