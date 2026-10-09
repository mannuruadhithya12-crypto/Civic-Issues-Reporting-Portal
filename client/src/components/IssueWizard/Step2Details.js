import React from 'react';

function Step2Details({ formData, updateFormData, nextStep, prevStep }) {
  const handleTitleChange = (e) => {
    updateFormData({ title: e.target.value.slice(0, 100) });
  };

  const handleDescriptionChange = (e) => {
    updateFormData({ description: e.target.value.slice(0, 500) });
  };

  const handlePrioritySelect = (priority) => {
    updateFormData({ priority });
  };

  const isValid = formData.title.trim().length > 0 && formData.description.trim().length > 0;

  return (
    <div className="citizen-card-box" style={{ padding: '32px' }}>
      
      {/* Step Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
          2. Issue Details
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          Provide more information about the issue.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
        
        {/* Issue Title Input */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
              Issue Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
              {formData.title.length}/100
            </span>
          </div>
          <input
            type="text"
            value={formData.title}
            onChange={handleTitleChange}
            placeholder="Enter a short, descriptive title"
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '14px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              color: '#0f172a',
              outline: 'none',
              backgroundColor: '#ffffff'
            }}
          />
        </div>

        {/* Description Textarea */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
              Description <span style={{ color: '#ef4444' }}>*</span>
            </label>
          </div>
          <div style={{ position: 'relative' }}>
            <textarea
              rows="6"
              value={formData.description}
              onChange={handleDescriptionChange}
              placeholder="Provide detailed information about the issue, including any relevant observations, impact, or additional context..."
              style={{
                width: '100%',
                padding: '14px 16px 36px 16px',
                borderRadius: '16px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                color: '#0f172a',
                outline: 'none',
                backgroundColor: '#ffffff',
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: '1.5'
              }}
            />
            <div style={{ position: 'absolute', bottom: '12px', right: '16px', fontSize: '12px', color: '#94a3b8', fontWeight: '500', pointerEvents: 'none' }}>
              {formData.description.length}/500
            </div>
          </div>
        </div>

        {/* Priority Level */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', display: 'block', marginBottom: '12px' }}>
            Priority Level
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            
            {/* High Card */}
            <div
              onClick={() => handlePrioritySelect('high')}
              style={{
                backgroundColor: '#fef2f2',
                border: (formData.priority || 'normal') === 'high' || (formData.priority || 'normal') === 'urgent' ? '2px solid #ef4444' : '1px solid #fecaca',
                borderRadius: '16px',
                padding: '20px 16px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                boxShadow: (formData.priority || 'normal') === 'high' ? '0 4px 12px rgba(239, 68, 68, 0.15)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#dc2626', fontWeight: '800', fontSize: '14px', marginBottom: '6px' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                High
              </div>
              <div style={{ fontSize: '11px', color: '#991b1b', lineHeight: '1.3' }}>
                Critical issue requiring immediate attention
              </div>
            </div>

            {/* Medium Card */}
            <div
              onClick={() => handlePrioritySelect('normal')}
              style={{
                backgroundColor: '#fffbeb',
                border: (formData.priority || 'normal') === 'normal' || (formData.priority || 'normal') === 'medium' ? '2px solid #f59e0b' : '1px solid #fef08a',
                borderRadius: '16px',
                padding: '20px 16px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                boxShadow: (formData.priority || 'normal') === 'normal' ? '0 4px 12px rgba(245, 158, 11, 0.15)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#d97706', fontWeight: '800', fontSize: '14px', marginBottom: '6px' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Medium
              </div>
              <div style={{ fontSize: '11px', color: '#92400e', lineHeight: '1.3' }}>
                Needs attention
              </div>
            </div>

            {/* Low Card */}
            <div
              onClick={() => handlePrioritySelect('low')}
              style={{
                backgroundColor: '#f8fafc',
                border: (formData.priority || 'normal') === 'low' ? '2px solid #64748b' : '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px 16px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                boxShadow: (formData.priority || 'normal') === 'low' ? '0 4px 12px rgba(100, 116, 139, 0.15)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#475569', fontWeight: '800', fontSize: '14px', marginBottom: '6px' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                Low
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.3' }}>
                Minor issue
              </div>
            </div>

          </div>
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

export default Step2Details;
