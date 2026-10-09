import React from 'react';
import { useNavigate } from 'react-router-dom';

function Step6Success({ submittedIssue, onReportAnother }) {
  const navigate = useNavigate();
  const issueId = submittedIssue && submittedIssue._id 
    ? `#CC-${submittedIssue._id.substring(submittedIssue._id.length - 6).toUpperCase()}` 
    : '#CC-2026-0001';

  return (
    <div className="citizen-card-box" style={{ padding: '48px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '580px', margin: '0 auto' }}>
      
      {/* Green Check Badge */}
      <div 
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#dcfce7',
          color: '#16a34a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          boxShadow: '0 4px 14px rgba(22, 163, 74, 0.2)'
        }}
      >
        <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
        Issue Reported Successfully
      </h2>
      <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 28px 0' }}>
        Thank you for helping improve your community.
      </p>

      {/* Ticket Details Box */}
      <div 
        style={{
          width: '100%',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          padding: '20px',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '28px',
          fontSize: '13px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
          <span style={{ color: '#64748b', fontWeight: '600' }}>Issue Reference ID</span>
          <span style={{ fontWeight: '800', color: '#1d61f2', fontFamily: 'monospace' }}>{issueId}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
          <span style={{ color: '#64748b', fontWeight: '600' }}>Category</span>
          <span style={{ fontWeight: '700', color: '#0f172a' }}>{submittedIssue?.department || submittedIssue?.category || 'General'}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b', fontWeight: '600' }}>Status</span>
          <span style={{ padding: '2px 10px', borderRadius: '9999px', backgroundColor: '#fef3c7', color: '#92400e', fontWeight: '800', fontSize: '11px' }}>
            Reported
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button 
          type="button" 
          onClick={() => navigate('/issues')} 
          style={{
            backgroundColor: '#1d61f2',
            color: 'white',
            border: 'none',
            fontWeight: '700',
            fontSize: '13px',
            padding: '12px 24px',
            borderRadius: '9999px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(29, 97, 242, 0.25)'
          }}
        >
          View My Issues
        </button>

        <button 
          type="button" 
          onClick={onReportAnother} 
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #1d61f2',
            color: '#1d61f2',
            fontWeight: '700',
            fontSize: '13px',
            padding: '12px 24px',
            borderRadius: '9999px',
            cursor: 'pointer'
          }}
        >
          + Report Another
        </button>

        <button 
          type="button" 
          onClick={() => navigate('/')} 
          style={{
            backgroundColor: '#f1f5f9',
            border: '1px solid #e2e8f0',
            color: '#475569',
            fontWeight: '700',
            fontSize: '13px',
            padding: '12px 24px',
            borderRadius: '9999px',
            cursor: 'pointer'
          }}
        >
          Home
        </button>
      </div>

    </div>
  );
}

export default Step6Success;
