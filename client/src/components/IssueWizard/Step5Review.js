import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function Step5Review({
  formData,
  submitIssue,
  prevStep,
  goToStep,
  loading,
  duplicateState,
  retryDuplicateCheck,
  duplicateResult,
  checkingDuplicates
}) {
  const [consentChecked, setConsentChecked] = useState(true);

  const coords = formData.coordinates && formData.coordinates.lat
    ? [formData.coordinates.lat, formData.coordinates.lng]
    : (Array.isArray(formData.coordinates) && formData.coordinates.length === 2
        ? [formData.coordinates[1], formData.coordinates[0]]
        : [12.9716, 77.5946]);

  const priorityLabel = (formData.priority || 'normal').toLowerCase();
  let priorityBadge = (
    <span style={{ padding: '4px 12px', borderRadius: '9999px', fontSize: '11px', fontWeight: '800', background: '#fffbeb', color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      Medium
    </span>
  );
  if (priorityLabel === 'high' || priorityLabel === 'urgent') {
    priorityBadge = (
      <span style={{ padding: '4px 12px', borderRadius: '9999px', fontSize: '11px', fontWeight: '800', background: '#fef2f2', color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        High
      </span>
    );
  } else if (priorityLabel === 'low') {
    priorityBadge = (
      <span style={{ padding: '4px 12px', borderRadius: '9999px', fontSize: '11px', fontWeight: '800', background: '#f8fafc', color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        Low
      </span>
    );
  }

  // Derive active duplicate lifecycle state
  const state = duplicateState?.status || (checkingDuplicates ? 'loading' : (duplicateResult?.hasDuplicates ? 'candidates' : 'idle'));
  const candidateData = duplicateState?.data || duplicateResult;
  const candidates = candidateData?.candidates || (candidateData?.topMatch ? [candidateData.topMatch] : []);
  const topMatch = candidateData?.topMatch || (candidates.length > 0 ? candidates[0] : null);
  const matchPct = topMatch ? Math.round((topMatch.confidenceScore || topMatch.similarityScore || 0) * 100) : 0;
  const distMeters = topMatch ? Math.round(topMatch.distanceMeters || 0) : 0;

  return (
    <div className="citizen-card-box" style={{ padding: '32px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
          5. Review & Submit
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          Please review your issue details before submitting.
        </p>
      </div>

      {/* Duplicate Verification State: Loading */}
      {state === 'loading' && (
        <div
          data-testid="duplicate-loading-step5"
          style={{
            backgroundColor: '#eff6ff',
            border: '1.5px solid #bfdbfe',
            borderRadius: '20px',
            padding: '16px 20px',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '18px',
              height: '18px',
              border: '2px solid #2563eb',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
          <div style={{ fontSize: '13px', color: '#1e40af', fontWeight: '600' }}>
            CivicConnect AI: Verifying vicinity for duplicate complaints...
          </div>
        </div>
      )}

      {/* Duplicate Verification State: Candidates Found */}
      {state === 'candidates' && topMatch && (
        <div
          data-testid="duplicate-candidates-step5"
          style={{
            backgroundColor: '#fffbeb',
            border: '1.5px solid #fde68a',
            borderRadius: '20px',
            padding: '20px 24px',
            marginBottom: '28px',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.08)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: '800',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                CivicConnect AI • Potential Duplicate Notice
              </span>
              {candidates.length > 1 && (
                <span style={{ fontSize: '11px', color: '#b45309', fontWeight: '600' }}>
                  ({candidates.length} similar complaints nearby)
                </span>
              )}
            </div>

            <span
              style={{
                backgroundColor: matchPct >= 80 ? '#fef2f2' : '#fef3c7',
                color: matchPct >= 80 ? '#b91c1c' : '#b45309',
                border: matchPct >= 80 ? '1px solid #fecaca' : '1px solid #fde68a',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '800'
              }}
            >
              {matchPct}% Match
            </span>
          </div>

          <div style={{ fontSize: '15px', fontWeight: '800', color: '#78350f', marginBottom: '6px' }}>
            A similar issue was reported nearby ({distMeters}m away)
          </div>

          <p style={{ fontSize: '12px', color: '#92400e', margin: '0 0 14px 0', lineHeight: '1.4' }}>
            Our geospatial and language matching engine identified potential existing complaints in this vicinity. Suggestions are recommendations only, not confirmed duplicates.
          </p>

          {/* Primary Ticket preview card */}
          <div
            data-testid={`duplicate-card-${topMatch.issueId}`}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #fcd34d',
              borderRadius: '14px',
              padding: '14px 18px',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: candidates.length > 1 ? '10px' : '0'
            }}
          >
            <div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
                {topMatch.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748b' }}>
                <span style={{ background: '#f1f5f9', color: '#334155', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                  {topMatch.category || topMatch.department}
                </span>
                <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '6px', fontWeight: '700', textTransform: 'capitalize' }}>
                  Status: {topMatch.status || 'Reported'}
                </span>
                <span>• {distMeters}m from your pin</span>
              </div>
            </div>

            <a
              href={`/issues/${topMatch.issueId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                backgroundColor: '#1d61f2',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '700',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(29, 97, 242, 0.25)'
              }}
            >
              View Existing Ticket
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* Additional Candidates List if > 1 */}
          {candidates.length > 1 && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {candidates.slice(1).map((cand) => (
                <div
                  key={cand.issueId}
                  data-testid={`duplicate-card-${cand.issueId}`}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px'
                  }}
                >
                  <div>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>{cand.title}</span>
                    <span style={{ color: '#64748b', marginLeft: '8px' }}>
                      ({Math.round((cand.confidenceScore || cand.similarityScore || 0) * 100)}% match, ~{Math.round(cand.distanceMeters || 0)}m away)
                    </span>
                  </div>
                  <a
                    href={`/issues/${cand.issueId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#1d61f2', fontWeight: '700', textDecoration: 'none', fontSize: '11px' }}
                  >
                    View &rsaquo;
                  </a>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: '11px', color: '#b45309', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>You may still proceed to submit this report below if it represents a separate incident or recurring issue. Reports are never auto-merged.</span>
          </div>
        </div>
      )}

      {/* Duplicate Verification State: Empty (No duplicates found) */}
      {state === 'empty' && (
        <div
          data-testid="duplicate-empty-step5"
          style={{
            backgroundColor: '#f0fdf4',
            border: '1.5px solid #86efac',
            borderRadius: '20px',
            padding: '16px 20px',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}
        >
          <span style={{ fontSize: '18px', color: '#16a34a' }}>✓</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#14532d' }}>
              CivicConnect AI Verified • No Duplicates Found
            </div>
            <div style={{ fontSize: '12px', color: '#166534', marginTop: '2px' }}>
              No matching complaints were found within a 300m radius of your selected coordinates. Your report appears unique.
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Verification State: API Error */}
      {state === 'error' && (
        <div
          data-testid="duplicate-error-step5"
          style={{
            backgroundColor: '#fef2f2',
            border: '1.5px solid #fca5a5',
            borderRadius: '20px',
            padding: '16px 20px',
            marginBottom: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#991b1b' }}>
              Duplicate verification unavailable: {duplicateState?.error || 'Service unreachable'}
            </div>
            {retryDuplicateCheck && (
              <button
                type="button"
                onClick={retryDuplicateCheck}
                style={{
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Retry Check
              </button>
            )}
          </div>
          <div style={{ fontSize: '11px', color: '#b91c1c' }}>
            You can still submit your issue. Duplicate checking is purely advisory and non-blocking.
          </div>
        </div>
      )}

      {/* 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', marginBottom: '32px' }}>
        
        {/* Left Column: Issue Summary Card */}
        <div 
          style={{ 
            background: '#ffffff', 
            border: '1px solid #e2e8f0', 
            borderRadius: '20px', 
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {/* Summary Header with Edit Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
            <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Issue Summary</span>
            <button 
              type="button" 
              onClick={() => goToStep(1)} 
              style={{ background: 'transparent', border: 'none', color: '#1d61f2', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
            >
              Edit
            </button>
          </div>

          {/* Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', alignItems: 'center', fontSize: '13px' }}>
            <div style={{ color: '#64748b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" fill="none" stroke="#64748b" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Category
            </div>
            <div style={{ fontWeight: '700', color: '#0f172a' }}>
              {formData.category || 'Roads'}
            </div>
          </div>

          {/* Title */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', alignItems: 'center', fontSize: '13px' }}>
            <div style={{ color: '#64748b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" fill="none" stroke="#64748b" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Title
            </div>
            <div style={{ fontWeight: '700', color: '#0f172a' }}>
              {formData.title || 'Untitled Issue'}
            </div>
          </div>

          {/* Description */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', alignItems: 'flex-start', fontSize: '13px' }}>
            <div style={{ color: '#64748b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '2px' }}>
              <svg width="16" height="16" fill="none" stroke="#64748b" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              Description
            </div>
            <div style={{ color: '#334155', lineHeight: '1.5', fontWeight: '500' }}>
              {formData.description || 'No description provided.'}
            </div>
          </div>

          {/* Priority Level */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', alignItems: 'center', fontSize: '13px' }}>
            <div style={{ color: '#64748b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" fill="none" stroke="#64748b" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Priority Level
            </div>
            <div>
              {priorityBadge}
            </div>
          </div>

          {/* Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', alignItems: 'flex-start', fontSize: '13px' }}>
            <div style={{ color: '#64748b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '2px' }}>
              <svg width="16" height="16" fill="none" stroke="#64748b" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Location
            </div>
            <div>
              <div style={{ fontWeight: '700', color: '#0f172a' }}>
                {formData.locationName || 'Municipal Area'}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                Lat: {coords[0].toFixed(4)}, Lng: {coords[1].toFixed(4)}
              </div>
            </div>
          </div>

          {/* Photos */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', alignItems: 'flex-start', fontSize: '13px' }}>
            <div style={{ color: '#64748b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
              <svg width="16" height="16" fill="none" stroke="#64748b" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Photos
            </div>
            <div>
              {formData.imagePreviews && formData.imagePreviews.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img
                    src={formData.imagePreviews[0]}
                    alt="Evidence main preview"
                    style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                  />
                  {formData.imagePreviews.length > 1 && (
                    <span style={{ fontSize: '11px', fontWeight: '700', background: '#f1f5f9', padding: '4px 8px', borderRadius: '8px', color: '#64748b' }}>
                      +{formData.imagePreviews.length - 1} more
                    </span>
                  )}
                </div>
              ) : (
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>No photos uploaded</span>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Location Preview Map & Terms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Mini Location Map */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
              Location Preview
            </div>
            <div style={{ height: '170px', width: '100%', borderRadius: '14px', overflow: 'hidden', border: '1px solid #e2e8f0', position: 'relative' }}>
              <MapContainer
                center={coords}
                zoom={14}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
                zoomControl={false}
                scrollWheelZoom={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap'
                />
                <Marker position={coords} icon={blueIcon} />
              </MapContainer>
            </div>
          </div>

          {/* Consent / Confirmation Box */}
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '20px', padding: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                style={{ marginTop: '2px', accentColor: '#1d61f2', width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e3a8a', lineHeight: '1.3' }}>
                By submitting this issue, you agree that:
              </span>
            </label>

            <ul style={{ margin: '8px 0 0 24px', padding: 0, fontSize: '11px', color: '#2563eb', lineHeight: '1.5' }}>
              <li>The information provided is accurate to the best of your knowledge.</li>
              <li>The photos and details may be shared with relevant authorities.</li>
              <li>You will be notified about the progress of this issue.</li>
            </ul>
          </div>
        </div>

      </div>

      {/* Footer Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
        <button
          type="button"
          onClick={prevStep}
          disabled={loading}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#475569',
            padding: '12px 28px',
            borderRadius: '9999px',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <button
          type="button"
          onClick={submitIssue}
          disabled={loading || !consentChecked}
          style={{
            backgroundColor: (loading || !consentChecked) ? '#94a3b8' : '#1d61f2',
            color: 'white',
            border: 'none',
            padding: '12px 32px',
            borderRadius: '9999px',
            fontWeight: '800',
            fontSize: '14px',
            cursor: (loading || !consentChecked) ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(29, 97, 242, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          {loading ? 'Submitting...' : 'Submit Issue'}
        </button>
      </div>

    </div>
  );
}

export default Step5Review;
