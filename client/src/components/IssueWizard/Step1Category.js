import React from 'react';

const CATEGORY_OPTIONS = [
  {
    id: 'Roads',
    title: 'Roads',
    subtext: 'Potholes, damaged roads, road signs',
    iconColor: '#2563eb',
    bgColor: '#eff6ff',
    icon: (
      <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    )
  },
  {
    id: 'Waste',
    title: 'Waste',
    subtext: 'Garbage overflow, illegal dumping',
    iconColor: '#2563eb',
    bgColor: '#eff6ff',
    icon: (
      <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    )
  },
  {
    id: 'Electricity',
    title: 'Electricity',
    subtext: 'Street lights, power issues',
    iconColor: '#9333ea',
    bgColor: '#faf5ff',
    icon: (
      <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    )
  },
  {
    id: 'Water',
    title: 'Water',
    subtext: 'Water leakage, drainage problems',
    iconColor: '#0284c7',
    bgColor: '#f0f9ff',
    icon: (
      <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
    )
  },
  {
    id: 'Parks',
    title: 'Parks',
    subtext: 'Park maintenance, playground issues',
    iconColor: '#16a34a',
    bgColor: '#f0fdf4',
    icon: (
      <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path d="M12 2L4 12h4v8h8v-8h4L12 2z" />
      </svg>
    )
  },
  {
    id: 'Sanitation',
    title: 'Sanitation',
    subtext: 'Public toilets, cleanliness',
    iconColor: '#2563eb',
    bgColor: '#eff6ff',
    icon: (
      <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <polyline points="17 11 19 13 23 9" />
      </svg>
    )
  },
  {
    id: 'Public Safety',
    title: 'Public Safety',
    subtext: 'Safety hazards, dangerous conditions',
    iconColor: '#dc2626',
    bgColor: '#fef2f2',
    icon: (
      <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    )
  },
  {
    id: 'Other',
    title: 'Other',
    subtext: 'Other civic issues',
    iconColor: '#2563eb',
    bgColor: '#eff6ff',
    icon: (
      <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="19" cy="12" r="1.5" />
        <circle cx="5" cy="12" r="1.5" />
      </svg>
    )
  }
];

function Step1Category({ formData, updateFormData, nextStep, onCancel }) {
  const handleSelect = (categoryId) => {
    updateFormData({ category: categoryId });
  };

  return (
    <div className="citizen-card-box" style={{ padding: '32px' }}>
      
      {/* Step Title */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
          1. Select Issue Category
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          Choose the category that best describes the issue you want to report.
        </p>
      </div>

      {/* Category Grid 4x2 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '32px'
        }}
      >
        {CATEGORY_OPTIONS.map((cat) => {
          const isSelected = formData.category === cat.id;

          return (
            <div
              key={cat.id}
              onClick={() => handleSelect(cat.id)}
              style={{
                backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                border: isSelected ? '2px solid #1d61f2' : '1px solid #e2e8f0',
                borderRadius: '20px',
                padding: '24px 16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                position: 'relative',
                boxShadow: isSelected ? '0 8px 20px -4px rgba(29, 97, 242, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              {/* Icon Badge */}
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  backgroundColor: cat.bgColor,
                  color: cat.iconColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                }}
              >
                {cat.icon}
              </div>

              {/* Title & Subtext */}
              <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a', marginBottom: '4px' }}>
                {cat.title}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.3' }}>
                {cat.subtext}
              </div>

              {/* Selected Checkmark */}
              {isSelected && (
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#1d61f2',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Buttons Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            padding: '10px 20px',
            borderRadius: '12px'
          }}
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={nextStep}
          disabled={!formData.category}
          style={{
            backgroundColor: formData.category ? '#1d61f2' : '#cbd5e1',
            color: 'white',
            border: 'none',
            fontSize: '14px',
            fontWeight: '700',
            padding: '12px 32px',
            borderRadius: '9999px',
            cursor: formData.category ? 'pointer' : 'not-allowed',
            boxShadow: formData.category ? '0 4px 14px rgba(29, 97, 242, 0.3)' : 'none',
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

export default Step1Category;
