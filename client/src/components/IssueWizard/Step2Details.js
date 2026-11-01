import React, { useState } from 'react';
import api from '../../services/api';

function Step2Details({ formData, updateFormData, nextStep, prevStep }) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [aiNotice, setAiNotice] = useState(null);
  const [appliedNotice, setAppliedNotice] = useState(null);

  const handleTitleChange = (e) => {
    updateFormData({ title: e.target.value.slice(0, 100) });
  };

  const handleDescriptionChange = (e) => {
    updateFormData({ description: e.target.value.slice(0, 500) });
  };

  const handlePrioritySelect = (priority) => {
    updateFormData({ priority });
  };

  const handleAiEnhance = async () => {
    if (!formData.description || formData.description.trim().length < 5) {
      setAiError('Please enter at least a few words in the description to analyze.');
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setAiNotice(null);
    setAppliedNotice(null);

    try {
      const res = await api.post('/issues/ai-assist', {
        title: formData.title,
        description: formData.description,
        department: formData.category
      });

      if (res.data && res.data.available === false) {
        setAiNotice(res.data.message || 'Gemini AI intelligence is currently unavailable. You can continue submitting normally.');
        setAiSuggestions(null);
      } else if (res.data && res.data.success && res.data.suggestions) {
        setAiSuggestions(res.data.suggestions);
      } else {
        setAiError(res.data?.message || 'Could not retrieve AI recommendations at this time.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'AI assist request failed.';
      setAiError(`AI Assistance Notice: ${msg}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAcceptSuggestions = () => {
    if (!aiSuggestions) return;

    const updates = {};
    if (aiSuggestions.suggestedTitle) {
      updates.title = aiSuggestions.suggestedTitle.slice(0, 100);
    }
    if (aiSuggestions.improvedDescription) {
      updates.description = aiSuggestions.improvedDescription.slice(0, 500);
    }
    if (aiSuggestions.suggestedDepartment) {
      updates.category = aiSuggestions.suggestedDepartment;
    }

    // Attach AI analysis metadata for ticket auditing
    updates.aiAnalysis = {
      category: {
        value: aiSuggestions.suggestedCategory || aiSuggestions.suggestedDepartment,
        confidence: 0.95
      },
      summary: aiSuggestions.summary,
      analyzedAt: new Date()
    };

    updateFormData(updates);
    setAppliedNotice('✓ AI suggestions accepted! You may review or modify the text anytime.');
    setAiSuggestions(null);
  };

  const handleDismissSuggestions = () => {
    setAiSuggestions(null);
    setAiError(null);
  };

  const isValid = formData.title.trim().length > 0 && formData.description.trim().length > 0;
  const canRequestAi = formData.description.trim().length >= 5 && !aiLoading;

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

        {/* Description Textarea with AI Enhancement Action */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
              Description <span style={{ color: '#ef4444' }}>*</span>
            </label>
            
            {/* Improve with AI Button */}
            <button
              type="button"
              onClick={handleAiEnhance}
              disabled={!canRequestAi}
              data-testid="ai-assist-button"
              style={{
                background: canRequestAi ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' : '#f1f5f9',
                color: canRequestAi ? '#1d4ed8' : '#94a3b8',
                border: canRequestAi ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: canRequestAi ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                boxShadow: canRequestAi ? '0 2px 6px rgba(37, 99, 235, 0.08)' : 'none'
              }}
              title={formData.description.trim().length < 5 ? 'Enter a description first' : 'Analyze and enhance description with Gemini AI'}
            >
              {aiLoading ? (
                <>
                  <svg style={{ animation: 'spin 1s linear infinite', width: '13px', height: '13px' }} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing with Gemini...
                </>
              ) : (
                <>
                  <span style={{ fontSize: '14px' }}>✨</span>
                  Improve with AI
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    background: '#2563eb',
                    color: '#ffffff',
                    padding: '1px 6px',
                    borderRadius: '8px',
                    letterSpacing: '0.02em'
                  }}>
                    GEMINI
                  </span>
                </>
              )}
            </button>
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

        {/* Applied Feedback Notice */}
        {appliedNotice && (
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '14px',
            padding: '12px 16px',
            color: '#15803d',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>{appliedNotice}</span>
            <button
              type="button"
              onClick={() => setAppliedNotice(null)}
              style={{ background: 'transparent', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* AI Unavailable Non-Blocking Notice */}
        {aiNotice && (
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '12px 16px',
            color: '#475569',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>ℹ️ {aiNotice}</span>
            <button
              type="button"
              onClick={() => setAiNotice(null)}
              style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '14px' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* AI Error Alert */}
        {aiError && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '14px',
            padding: '12px 16px',
            color: '#dc2626',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <span>{aiError}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleAiEnhance}
                style={{
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fca5a5',
                  color: '#991b1b',
                  fontSize: '12px',
                  fontWeight: '700',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => setAiError(null)}
                style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* AI SUGGESTIONS REVIEW PANEL */}
        {aiSuggestions && (
          <div
            data-testid="ai-suggestions-panel"
            style={{
              backgroundColor: '#f8fafc',
              border: '1.5px solid #93c5fd',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>✨</span>
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#1e3a8a' }}>
                  Gemini AI Issue Intelligence
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  background: '#dbeafe',
                  color: '#1d4ed8',
                  padding: '2px 8px',
                  borderRadius: '9999px'
                }}>
                  Suggestions Only
                </span>
              </div>
              <button
                type="button"
                onClick={handleDismissSuggestions}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px' }}
                title="Dismiss suggestions"
              >
                ✕
              </button>
            </div>

            {/* Department and Category Recommendation Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                Recommended Department:
              </span>
              <span style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1e40af',
                fontSize: '12px',
                fontWeight: '700',
                padding: '4px 12px',
                borderRadius: '8px'
              }}>
                🏛️ {aiSuggestions.suggestedDepartment}
              </span>
              {aiSuggestions.suggestedCategory && (
                <span style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  fontSize: '12px',
                  fontWeight: '700',
                  padding: '4px 12px',
                  borderRadius: '8px'
                }}>
                  🏷️ {aiSuggestions.suggestedCategory}
                </span>
              )}
            </div>

            {/* Comparison Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
              
              {/* Title Comparison */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Suggested Title
                </div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                  {aiSuggestions.suggestedTitle}
                </div>
              </div>

              {/* Description Comparison */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Improved Description (Factual & Structured)
                </div>
                <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>
                  {aiSuggestions.improvedDescription}
                </div>
              </div>

              {/* Factual Summary */}
              {aiSuggestions.summary && (
                <div style={{ backgroundColor: '#f1f5f9', borderRadius: '12px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '2px' }}>
                    Factual Summary
                  </div>
                  <div style={{ fontSize: '12px', color: '#1e293b' }}>
                    {aiSuggestions.summary}
                  </div>
                </div>
              )}

              {/* Actionable Tips (Missing Details & Urgency Flags) */}
              {((aiSuggestions.missingDetails && aiSuggestions.missingDetails.length > 0) || 
                (aiSuggestions.urgencyIndicators && aiSuggestions.urgencyIndicators.length > 0)) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  {aiSuggestions.missingDetails?.map((detail, idx) => (
                    <div key={`m-${idx}`} style={{ color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>💡</span>
                      <span><strong>Missing detail tip:</strong> {detail}</span>
                    </div>
                  ))}
                  {aiSuggestions.urgencyIndicators?.map((urgency, idx) => (
                    <div key={`u-${idx}`} style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>⚠️</span>
                      <span><strong>Safety hazard noted:</strong> {urgency}</span>
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* Action Buttons: Explicit Accept or Reject */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={handleDismissSuggestions}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '9px 18px',
                  borderRadius: '9999px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                ✕ Keep Original
              </button>

              <button
                type="button"
                onClick={handleAcceptSuggestions}
                data-testid="accept-ai-suggestions"
                style={{
                  backgroundColor: '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  padding: '9px 22px',
                  borderRadius: '9999px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  transition: 'all 0.2s ease'
                }}
              >
                ✓ Accept Improvements
              </button>
            </div>

          </div>
        )}

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
