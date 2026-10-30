import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function LocationPicker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });
  return position ? (
    <Marker 
      position={position} 
      icon={blueIcon} 
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          setPosition(e.target.getLatLng());
        }
      }}
    />
  ) : null;
}

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 15, { animate: true });
    }
  }, [center, map]);
  return null;
}

function Step3Location({
  formData,
  updateFormData,
  nextStep,
  prevStep,
  duplicateState,
  retryDuplicateCheck,
  duplicateResult,
  checkingDuplicates
}) {
  const defaultCenter = { lat: 12.9716, lng: 77.5946 };
  
  const [position, setPosition] = useState(
    formData.coordinates && formData.coordinates.lat
      ? { lat: formData.coordinates.lat, lng: formData.coordinates.lng }
      : (Array.isArray(formData.coordinates) && formData.coordinates.length === 2
          ? { lat: formData.coordinates[1], lng: formData.coordinates[0] }
          : defaultCenter)
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (!position) return;
    updateFormData({
      coordinates: { lat: position.lat, lng: position.lng }
    });

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}`);
        const data = await res.json();
        if (data && data.display_name) {
          updateFormData({
            locationName: data.display_name
          });
        }
      } catch (err) {
        // Silently fallback
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [position]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        const newPos = { lat, lng };
        setPosition(newPos);
        updateFormData({
          locationName: data[0].display_name,
          coordinates: { lat, lng }
        });
      } else {
        alert('Address not found. Please try a different query or click directly on the map.');
      }
    } catch (err) {
      alert('Search failed. Please try clicking on the map directly.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(newPos);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        alert('Could not fetch current location. Please click on the map to set your pin.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const isValid = position && position.lat && position.lng;

  return (
    <div className="citizen-card-box" style={{ padding: '32px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
          3. Set Location
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          Specify the exact location of the issue on the map or search for an address.
        </p>
      </div>

      {/* Address Search Bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <svg
            style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for an address or place..."
            style={{
              width: '100%',
              padding: '12px 16px 12px 46px',
              borderRadius: '14px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              color: '#0f172a',
              outline: 'none',
              backgroundColor: '#ffffff'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isSearching}
          style={{
            backgroundColor: '#1d61f2',
            color: 'white',
            border: 'none',
            padding: '0 24px',
            borderRadius: '14px',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>

        <button
          type="button"
          onClick={handleCurrentLocation}
          disabled={isLocating}
          title="Use Current Location"
          style={{
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
            color: '#1d61f2',
            padding: '0 16px',
            borderRadius: '14px',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {isLocating ? 'Locating...' : 'My Location'}
        </button>
      </form>

      {/* Map Container */}
      <div 
        style={{ 
          height: '340px', 
          width: '100%', 
          borderRadius: '20px', 
          overflow: 'hidden', 
          border: '1px solid #cbd5e1', 
          position: 'relative',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}
      >
        <MapContainer
          center={[position.lat, position.lng]}
          zoom={14}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          <LocationPicker 
            position={position} 
            setPosition={setPosition} 
          />
          <MapUpdater center={[position.lat, position.lng]} />
        </MapContainer>

        {/* Floating Instruction Banner inside map */}
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            padding: '8px 20px',
            borderRadius: '9999px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            fontSize: '12px',
            fontWeight: '600',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 1000,
            whiteSpace: 'nowrap'
          }}
        >
          <svg width="16" height="16" fill="#1d61f2" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg> Click on the map to set the exact location. Drag the marker to adjust if needed.
        </div>
      </div>

      {/* Duplicate Check Notice (Non-blocking: loading, candidates, empty, or error) */}
      {(() => {
        const state = duplicateState?.status || (checkingDuplicates ? 'loading' : (duplicateResult?.hasDuplicates ? 'candidates' : 'idle'));
        const data = duplicateState?.data || duplicateResult;
        const topMatch = data?.topMatch;

        if (state === 'loading') {
          return (
            <div
              data-testid="duplicate-loading-step3"
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '8px 14px',
                fontSize: '12px',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px'
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6',
                  animation: 'pulse 1.5s infinite'
                }}
              />
              CivicConnect AI: Scanning vicinity for existing complaints...
            </div>
          );
        }

        if (state === 'candidates' && topMatch) {
          return (
            <div
              data-testid="duplicate-candidates-step3"
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fef08a',
                borderRadius: '14px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}
            >
              <div style={{ color: '#d97706', marginTop: '2px' }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#92400e', marginBottom: '2px' }}>
                  Nearby Similar Report Found (~{Math.round(topMatch.distanceMeters)}m away)
                </div>
                <div style={{ fontSize: '12px', color: '#b45309', lineHeight: '1.4' }}>
                  An existing ticket <strong>"{topMatch.title}"</strong> ({Math.round(topMatch.confidenceScore * 100)}% match) was found nearby. Suggestions are recommendations, not confirmed duplicates. You can review candidates on the Review step or continue submitting.
                </div>
              </div>
            </div>
          );
        }

        if (state === 'empty') {
          return (
            <div
              data-testid="duplicate-empty-step3"
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '8px 14px',
                fontSize: '12px',
                color: '#166534',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px'
              }}
            >
              <span style={{ fontWeight: 'bold' }}>✓</span>
              CivicConnect AI: No duplicate complaints found within 300m. Your issue appears distinct.
            </div>
          );
        }

        if (state === 'error') {
          return (
            <div
              data-testid="duplicate-error-step3"
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '8px 14px',
                fontSize: '12px',
                color: '#991b1b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px'
              }}
            >
              <span>Duplicate check temporarily unavailable ({duplicateState?.error || 'Network error'}). You may proceed.</span>
              {retryDuplicateCheck && (
                <button
                  type="button"
                  onClick={retryDuplicateCheck}
                  style={{
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Retry
                </button>
              )}
            </div>
          );
        }

        return null;
      })()}

      {/* Location Details Inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', marginBottom: '28px' }}>
        
        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
            Selected Location <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.locationName || ''}
            onChange={(e) => updateFormData({ locationName: e.target.value })}
            placeholder="Enter the complete address"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              color: '#0f172a',
              backgroundColor: '#ffffff'
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
            Latitude
          </label>
          <input
            type="text"
            readOnly
            value={position ? position.lat.toFixed(6) : ''}
            placeholder="e.g. 40.7128"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              fontSize: '13px',
              color: '#64748b',
              backgroundColor: '#f8fafc'
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
            Longitude
          </label>
          <input
            type="text"
            readOnly
            value={position ? position.lng.toFixed(6) : ''}
            placeholder="e.g. -74.0060"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              fontSize: '13px',
              color: '#64748b',
              backgroundColor: '#f8fafc'
            }}
          />
        </div>

      </div>

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
        <button
          type="button"
          onClick={prevStep}
          style={{
            background: 'transparent',
            border: '1px solid #cbd5e1',
            color: '#334155',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            padding: '10px 22px',
            borderRadius: '9999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <button
          type="button"
          onClick={nextStep}
          disabled={!isValid}
          style={{
            backgroundColor: isValid ? '#1d61f2' : '#cbd5e1',
            color: 'white',
            border: 'none',
            fontSize: '14px',
            fontWeight: '700',
            padding: '12px 32px',
            borderRadius: '9999px',
            cursor: isValid ? 'pointer' : 'not-allowed',
            boxShadow: isValid ? '0 4px 14px rgba(29, 97, 242, 0.3)' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          Next 
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>

    </div>
  );
}

export default Step3Location;
