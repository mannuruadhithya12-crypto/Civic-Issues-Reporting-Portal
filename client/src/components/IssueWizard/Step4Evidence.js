import React, { useRef, useState } from 'react';

function Step4Evidence({ formData, updateFormData, nextStep, prevStep }) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFiles = (files) => {
    setErrorMsg('');
    const fileList = Array.from(files);

    if (fileList.length === 0) return;

    const currentCount = (formData.images || []).length;
    if (currentCount + fileList.length > 5) {
      setErrorMsg('You can upload a maximum of 5 images in total.');
      return;
    }

    const validFiles = [];
    const newPreviews = [];

    for (const file of fileList) {
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        setErrorMsg('Only JPG, PNG, and WebP image formats are allowed.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg(`File "${file.name}" exceeds maximum allowed size of 5MB.`);
        return;
      }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    updateFormData({
      images: [...(formData.images || []), ...validFiles],
      imagePreviews: [...(formData.imagePreviews || []), ...newPreviews]
    });
  };

  const handleFileInputChange = (e) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (indexToRemove) => {
    const updatedImages = (formData.images || []).filter((_, idx) => idx !== indexToRemove);
    const updatedPreviews = (formData.imagePreviews || []).filter((_, idx) => idx !== indexToRemove);
    updateFormData({
      images: updatedImages,
      imagePreviews: updatedPreviews
    });
  };

  const imageCount = (formData.imagePreviews || []).length;

  return (
    <div className="citizen-card-box" style={{ padding: '32px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
          4. Upload Evidence
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          Add photos or other evidence to help authorities understand the issue.
        </p>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', marginBottom: '20px' }}>
          {errorMsg}
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: isDragging ? '2px dashed #1d61f2' : '2px dashed #cbd5e1',
          backgroundColor: isDragging ? '#eff6ff' : '#f8fafc',
          borderRadius: '20px',
          padding: '44px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginBottom: '32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          multiple
          accept="image/jpeg,image/png,image/jpg,image/webp"
          style={{ display: 'none' }}
        />

        {/* Cloud Upload Icon */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#eff6ff',
            color: '#1d61f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '14px',
            boxShadow: '0 4px 12px rgba(29, 97, 242, 0.12)'
          }}
        >
          <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>

        <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
          Click to upload photos or drag and drop
        </div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>
          Supports JPG, PNG (Max 5MB each, up to 5 files)
        </div>
      </div>

      {/* Uploaded Photos Section */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '14px' }}>
          Uploaded Photos ({imageCount}/5)
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
          
          {/* Render uploaded image previews */}
          {formData.imagePreviews && formData.imagePreviews.map((previewUrl, idx) => (
            <div
              key={idx}
              style={{
                position: 'relative',
                height: '110px',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid #cbd5e1',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
              }}
            >
              <img
                src={previewUrl}
                alt={`Evidence ${idx + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeImage(idx)}
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(15, 23, 42, 0.75)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          {/* Add Photo slot if under 5 files */}
          {imageCount < 5 && (
            <div
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{
                height: '110px',
                borderRadius: '16px',
                border: '1px dashed #cbd5e1',
                backgroundColor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontSize: '20px', color: '#64748b', marginBottom: '4px' }}>+</div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>Add Photo</div>
            </div>
          )}

          {/* Remaining Empty Placeholder slots */}
          {Array.from({ length: Math.max(0, 4 - imageCount) }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              style={{
                height: '110px',
                borderRadius: '16px',
                border: '1px dashed #e2e8f0',
                backgroundColor: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#cbd5e1'
              }}
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          ))}

        </div>
      </div>

      {/* Footer Navigation Buttons */}
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
          style={{
            backgroundColor: '#1d61f2',
            color: 'white',
            border: 'none',
            fontSize: '14px',
            fontWeight: '700',
            padding: '12px 32px',
            borderRadius: '9999px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(29, 97, 242, 0.3)',
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

export default Step4Evidence;
