import React, { useEffect, useState, useContext, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { CATEGORIES, CATEGORY_ICONS } from "../components/CategoryCard";

function IssuesList() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedImages, setExpandedImages] = useState({});
  const [highlightedIssue, setHighlightedIssue] = useState(null);
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const issueRefs = useRef({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/issues");
      setIssues(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Could not load issues. Check backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  // Handle highlight from URL parameter
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId && issues.length > 0) {
      setHighlightedIssue(highlightId);

      // Scroll to the issue after a short delay
      setTimeout(() => {
        const element = issueRefs.current[highlightId];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);

      // Remove highlight after 5 seconds
      setTimeout(() => {
        setHighlightedIssue(null);
      }, 5000);
    }
  }, [searchParams, issues]);

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await api.put(`/issues/${id}`, { status: newStatus });
      load(); // Reload to see changes
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const toggleImage = (issueId, imageUrl) => {
    setExpandedImages(prev => {
      if (prev[issueId] === imageUrl) {
        // Close if clicking the same image
        const newState = { ...prev };
        delete newState[issueId];
        return newState;
      }
      return { ...prev, [issueId]: imageUrl };
    });
  };

  const getStatusClass = (status) => {
    return `status-badge ${status}`;
  };



  // Group issues by category
  const groupedIssues = issues.reduce((acc, issue) => {
    const dept = issue.department || 'Other';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(issue);
    return acc;
  }, {});

  // Render a single issue card
  const renderIssueCard = (issue) => {
    const isHighlighted = highlightedIssue === (issue.id || issue._id);
    const isUrgent = issue.priority === 'urgent';

    return (
      <div
        key={issue.id || issue._id}
        ref={(el) => issueRefs.current[issue._id] = el}
        className="issue-card"
        style={{
          border: isHighlighted ? '3px solid #2196F3' : isUrgent ? '2px solid #f44336' : undefined,
          borderLeft: isUrgent ? '6px solid #f44336' : undefined,
          background: isUrgent ? 'rgba(244, 67, 54, 0.03)' : undefined,
          boxShadow: isHighlighted ? '0 8px 24px rgba(33, 150, 243, 0.3)' : isUrgent ? '0 4px 12px rgba(244, 67, 54, 0.15)' : undefined,
          transition: 'all 0.3s ease',
          animation: isHighlighted ? 'pulse 1s ease-in-out 3' : undefined,
          marginBottom: '1rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <h3>
            {isUrgent && <span style={{ marginRight: '0.5rem' }}>🚨</span>}
            {issue.title}
          </h3>
          {isUrgent && (
            <span style={{
              background: '#f44336',
              color: 'white',
              padding: '0.25rem 0.75rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              letterSpacing: '0.5px',
              boxShadow: '0 2px 4px rgba(244, 67, 54, 0.3)'
            }}>
              URGENT
            </span>
          )}
        </div>

        <div className="issue-meta">
          {new Date(issue.createdAt).toLocaleString()}
          {issue.createdBy && <span> • Reported by: {issue.createdBy.username}</span>}
        </div>



        {/* Category Badge */}
        {issue.department && (
          <div style={{ marginTop: '0.5rem' }}>
            <span style={{
              display: 'inline-block',
              padding: '0.25rem 0.75rem',
              background: 'rgba(33, 150, 243, 0.1)',
              color: '#2196F3',
              borderRadius: '20px',
              fontSize: '0.875rem',
              fontWeight: 600
            }}>
              {CATEGORY_ICONS[issue.department] || '📋'} {issue.department}
            </span>
          </div>
        )}

        <p style={{ marginTop: 8 }}>{issue.description}</p>

        {/* Location Information */}
        <div className="issue-meta" style={{ marginTop: '0.75rem' }}>
          <strong>📍 Location:</strong> {issue.locationName || issue.location || "Not provided"}
        </div>
        {issue.coordinates && issue.coordinates.latitude && (
          <div className="issue-meta">
            <strong>Coordinates:</strong> {issue.coordinates.latitude.toFixed(6)}, {issue.coordinates.longitude.toFixed(6)}
          </div>
        )}

        {/* Status Badge */}
        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span className={getStatusClass(issue.status || 'open')}>
            {issue.status || 'open'}
          </span>

          {/* Share Button */}
          <button
            onClick={() => {
              const shareData = {
                title: issue.title,
                text: `${issue.title}\n${issue.description}`,
                url: window.location.origin + `/issues?id=${issue._id}`
              };

              if (navigator.share) {
                navigator.share(shareData).catch(console.error);
              } else {
                // Fallback: Copy link to clipboard
                navigator.clipboard.writeText(shareData.url).then(() => {
                  alert('Link copied to clipboard!');
                }).catch(console.error);
              }
            }}
            style={{
              padding: '0.4rem 0.75rem',
              background: 'rgba(33, 150, 243, 0.1)',
              color: '#2196F3',
              border: '1px solid rgba(33, 150, 243, 0.3)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            📤 Share
          </button>
        </div>

        {/* Image Gallery */}
        {issue.images && issue.images.length > 0 && (
          <>
            <div className="image-gallery">
              {issue.images.map((image, index) => (
                <img
                  key={index}
                  src={`http://localhost:5000${image}`}
                  alt={`Issue ${index + 1}`}
                  onClick={() => toggleImage(issue._id, `http://localhost:5000${image}`)}
                  title="Click to expand"
                  style={{
                    width: '100px',
                    height: '100px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: expandedImages[issue._id] === `http://localhost:5000${image}` ? '3px solid var(--primary)' : '2px solid transparent'
                  }}
                />
              ))}
            </div>

            {/* Expanded Image Inline */}
            {expandedImages[issue._id] && (
              <div style={{ marginTop: '1rem', position: 'relative', animation: 'fadeIn 0.3s ease' }}>
                <img
                  src={expandedImages[issue._id]}
                  alt="Expanded view"
                  style={{
                    width: '100%',
                    maxHeight: '500px',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-lg)',
                    cursor: 'pointer'
                  }}
                  onClick={() => toggleImage(issue._id, expandedImages[issue._id])}
                />
                <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Click image to close
                </p>
              </div>
            )}
          </>
        )}

        {/* Admin Controls */}
        {user && user.role === 'admin' && (
          <div style={{ marginTop: 10 }}>
            <label style={{ fontWeight: 600, marginRight: '0.5rem' }}>Update Status: </label>
            <select
              value={issue.status}
              onChange={(e) => handleStatusUpdate(issue._id, e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '2px solid var(--border)' }}
            >
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container">
      <h2>Reported Issues</h2>

      {loading ? (
        <p>Loading...</p>
      ) : issues.length === 0 ? (
        <p>No issues reported yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {CATEGORIES.map(category => {
            const categoryIssues = groupedIssues[category];
            if (!categoryIssues || categoryIssues.length === 0) return null;

            return (
              <div key={category} className="category-section">
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                  paddingBottom: '0.5rem',
                  borderBottom: '2px solid var(--border)'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>{CATEGORY_ICONS[category]}</span>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                    {category}
                    <span style={{
                      marginLeft: '0.75rem',
                      fontSize: '0.9rem',
                      background: 'var(--bg-secondary)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      color: 'var(--text-secondary)'
                    }}>
                      {categoryIssues.length}
                    </span>
                  </h3>
                </div>
                <div className="issues-grid">
                  {categoryIssues.map(issue => renderIssueCard(issue))}
                </div>
              </div>
            );
          })}

          {/* Handle issues with unknown categories if any */}
          {groupedIssues['Other'] && !CATEGORIES.includes('Other') && (
            <div className="category-section">
              <h3>Other ({groupedIssues['Other'].length})</h3>
              <div className="issues-grid">
                {groupedIssues['Other'].map(issue => renderIssueCard(issue))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <button onClick={load}>Refresh</button>
      </div>
    </div>
  );
}

export default IssuesList;
