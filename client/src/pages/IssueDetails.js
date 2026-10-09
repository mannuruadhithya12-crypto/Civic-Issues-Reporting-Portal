import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Spinner from '../components/common/Spinner';

function IssueDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchIssue = async () => {
      try {
        const res = await api.get(`/issues/${id}`);
        setIssue(res.data);
      } catch (err) {
        console.error('Failed to load issue', err);
      } finally {
        setLoading(false);
      }
    };
    fetchIssue();
  }, [id]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusClass = (status) => {
    const s = (status || 'reported').toLowerCase();
    if (s === 'resolved' || s === 'closed') return 'resolved';
    if (s === 'in_progress' || s === 'in-progress' || s === 'assigned') return 'in_progress';
    if (s === 'under_review' || s === 'verified') return 'under_review';
    return 'reported';
  };

  const formatStatusText = (status) => {
    const s = (status || 'reported').toLowerCase();
    if (s === 'in_progress' || s === 'in-progress') return 'In Progress';
    if (s === 'under_review') return 'Under Review';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spinner />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="citizen-card-box" style={{ padding: '48px 24px', textAlign: 'center', alignItems: 'center' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>Issue Not Found</h2>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>The requested issue report could not be located or has been removed.</p>
        <button onClick={() => navigate('/issues')} className="issue-details-back-btn">
          ← Return to My Issues
        </button>
      </div>
    );
  }

  const currStatus = (issue.status || 'reported').toLowerCase();
  const isReported = true;
  const isVerified = ['verified', 'under_review', 'assigned', 'in_progress', 'in-progress', 'resolved', 'closed'].includes(currStatus);
  const isAssigned = ['assigned', 'in_progress', 'in-progress', 'resolved', 'closed'].includes(currStatus);
  const isInProgress = ['in_progress', 'in-progress', 'resolved', 'closed'].includes(currStatus);
  const isResolved = ['resolved', 'closed'].includes(currStatus);

  const issueIdStr = `#CC-${(issue._id || '').substring((issue._id || '').length - 6).toUpperCase()}`;

  return (
    <div className="issue-details-page">
      
      {/* TOP NAVIGATION BAR */}
      <div className="issue-details-top-bar">
        <button onClick={() => navigate('/issues')} className="issue-details-back-btn">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to My Issues
        </button>

        <button onClick={handleShare} className="issue-details-share-btn">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          {copied ? 'Link Copied!' : 'Share Issue'}
        </button>
      </div>

      {/* ISSUE HEADER CARD */}
      <div className="issue-details-header-card">
        <div className="issue-details-title-row">
          <h1 className="issue-details-title">{issue.title}</h1>
          <span className="issue-id-tag">{issueIdStr}</span>
        </div>

        <div className="issue-details-meta-row">
          <span className={`issue-status-pill ${getStatusClass(issue.status)}`}>
            {formatStatusText(issue.status)}
          </span>
          <span className="issue-category-pill">
            🏷️ {issue.department || issue.category || 'Municipal Issue'}
          </span>
          {issue.priority && (
            <span className="issue-category-pill" style={{ backgroundColor: issue.priority === 'high' || issue.priority === 'urgent' ? '#fef2f2' : '#f8fafc', color: issue.priority === 'high' || issue.priority === 'urgent' ? '#ef4444' : '#64748b' }}>
              ⚡ {issue.priority.toUpperCase()} PRIORITY
            </span>
          )}
        </div>

        <div className="issue-location-row">
          <svg width="15" height="15" fill="none" stroke="#1d61f2" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{issue.locationName || issue.location || 'Municipal Area, Ward 84'}</span>
        </div>
      </div>

      {/* 2-COLUMN MAIN CONTENT */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* MEDIA CARD */}
          <div className="citizen-card-box" style={{ padding: 0, overflow: 'hidden' }}>
            {issue.images && issue.images.length > 0 ? (
              <img 
                src={issue.images[0].startsWith('http') ? issue.images[0] : `http://localhost:5000${issue.images[0]}`} 
                alt={issue.title} 
                style={{ width: '100%', height: '320px', objectFit: 'cover' }} 
              />
            ) : (
              <div style={{ width: '100%', height: '220px', background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: '8px' }}>
                <div style={{ fontSize: '32px' }}>📷</div>
                <div style={{ fontSize: '13px', fontWeight: '700' }}>No Photo Provided</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Reported via text & location data</div>
              </div>
            )}
          </div>

          {/* DESCRIPTION & DETAILS CARD */}
          <div className="citizen-card-box">
            <div className="citizen-card-header">
              <span className="citizen-card-title">Description & Context</span>
            </div>

            <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.65', margin: 0 }}>
              {issue.description || 'No detailed description provided.'}
            </p>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Category</div>
                <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: '700' }}>{issue.department || issue.category || 'General'}</div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Reported On</div>
                <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: '700' }}>
                  {new Date(issue.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Assigned Worker</div>
                <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: '700' }}>
                  {issue.assignedTo ? (typeof issue.assignedTo === 'object' ? issue.assignedTo.name : 'Field Worker') : 'Unassigned'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Target SLA</div>
                <div style={{ fontSize: '13px', color: '#0066ff', fontWeight: '700' }}>
                  {issue.sla ? `${issue.sla.targetHours || 24} Hours` : '24 Hours'}
                </div>
              </div>
            </div>
          </div>

          {/* IMPACT SCORE BANNER */}
          <div style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ebf8ff 50%, #f0f9ff 100%)', border: '1px solid #bae6fd', borderRadius: '20px', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#0066ff', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                🔥
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#0369a1' }}>Impact Score</div>
                <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: '500', marginTop: '2px' }}>This issue is gaining attention in your community.</div>
              </div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: '800', color: '#0284c7' }}>
              +22
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: TIMELINE TRACKING */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="citizen-card-box">
            <div className="citizen-card-header">
              <span className="citizen-card-title">Status Tracking</span>
            </div>

            <div className="issue-timeline-list">
              
              {/* Step 1: Reported */}
              <div className={`issue-timeline-item ${isReported ? 'completed' : ''}`}>
                <div className="issue-timeline-dot">
                  ✓
                </div>
                <div className="issue-timeline-content">
                  <span className="issue-timeline-step-title">Reported</span>
                  <span className="issue-timeline-date">{new Date(issue.createdAt).toLocaleDateString()}</span>
                  <div className="issue-timeline-desc">Issue reported and logged in municipal system.</div>
                </div>
              </div>

              {/* Step 2: Under Review */}
              <div className={`issue-timeline-item ${isVerified ? (isAssigned ? 'completed' : 'active') : ''}`}>
                <div className="issue-timeline-dot">
                  {isVerified ? '✓' : ''}
                </div>
                <div className="issue-timeline-content">
                  <span className="issue-timeline-step-title">Verified by Admin</span>
                  <span className="issue-timeline-date">{isVerified ? 'Verified' : 'Pending'}</span>
                  {isVerified && <div className="issue-timeline-desc">AI & Admin team verified incident details.</div>}
                </div>
              </div>

              {/* Step 3: Worker Assigned */}
              <div className={`issue-timeline-item ${isAssigned ? (isInProgress ? 'completed' : 'active') : ''}`}>
                <div className="issue-timeline-dot">
                  {isAssigned ? '✓' : ''}
                </div>
                <div className="issue-timeline-content">
                  <span className="issue-timeline-step-title">Worker Assigned</span>
                  <span className="issue-timeline-date">{isAssigned ? 'Dispatched' : 'Pending'}</span>
                  {isAssigned && <div className="issue-timeline-desc">Assigned to field operational unit.</div>}
                </div>
              </div>

              {/* Step 4: In Progress */}
              <div className={`issue-timeline-item ${isInProgress ? (isResolved ? 'completed' : 'active') : ''}`}>
                <div className="issue-timeline-dot">
                  {isInProgress ? '✓' : ''}
                </div>
                <div className="issue-timeline-content">
                  <span className="issue-timeline-step-title">In Progress</span>
                  <span className="issue-timeline-date">{isInProgress ? 'Active Work' : 'Pending'}</span>
                </div>
              </div>

              {/* Step 5: Resolved */}
              <div className={`issue-timeline-item ${isResolved ? 'completed' : ''}`}>
                <div className="issue-timeline-dot">
                  {isResolved ? '✓' : ''}
                </div>
                <div className="issue-timeline-content">
                  <span className="issue-timeline-step-title">Resolved</span>
                  <span className="issue-timeline-date">{isResolved ? new Date(issue.updatedAt).toLocaleDateString() : 'Pending'}</span>
                  {isResolved && <div className="issue-timeline-desc">Issue fixed and verified by department.</div>}
                </div>
              </div>

            </div>
          </div>

          {isResolved && (
            <button
              onClick={() => navigate('/issues')}
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                padding: '12px 20px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                width: '100%',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
              }}
            >
              ✓ Verify Resolution
            </button>
          )}

        </div>

      </div>

    </div>
  );
}

export default IssueDetails;
