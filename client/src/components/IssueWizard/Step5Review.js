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

function Step5Review({ formData, submitIssue, prevStep, goToStep, loading }) {
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
