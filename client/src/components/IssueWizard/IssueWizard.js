import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

import Step1Category from './Step1Category';
import Step2Details from './Step2Details';
import Step3Location from './Step3Location';
import Step4Evidence from './Step4Evidence';
import Step5Review from './Step5Review';
import Step6Success from './Step6Success';

const STEPS = [
  { num: 1, title: 'Category', sub: 'Choose issue type' },
  { num: 2, title: 'Details', sub: 'Add description' },
  { num: 3, title: 'Location', sub: 'Set the location' },
  { num: 4, title: 'Evidence', sub: 'Upload photos' },
  { num: 5, title: 'Review', sub: 'Confirm & submit' }
];

function IssueWizard() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submittedIssue, setSubmittedIssue] = useState(null);

  // Hybrid duplicate detection lifecycle state
  const [duplicateState, setDuplicateState] = useState({
    status: 'idle', // 'idle' | 'loading' | 'candidates' | 'empty' | 'error'
    data: null,
    error: null,
    lastCheckedAt: null
  });

  const requestIdRef = useRef(0);
  const abortControllerRef = useRef(null);

  const [formData, setFormData] = useState({
    category: 'Roads',
    title: '',
    description: '',
    priority: 'normal',
    locationName: '',
    coordinates: { lat: 12.9716, lng: 77.5946 },
    images: [],
    imagePreviews: []
  });

  // Debounced duplicate check when title, coordinates, and category are present
  const checkDuplicates = useCallback(async () => {
    const lat = formData.coordinates?.lat ?? (Array.isArray(formData.coordinates) ? formData.coordinates[1] : null);
    const lng = formData.coordinates?.lng ?? (Array.isArray(formData.coordinates) ? formData.coordinates[0] : null);

    const hasValidTitle = formData.title && formData.title.trim().length >= 4;
    const hasValidCoords = lat != null && lng != null && !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    const hasCategory = Boolean(formData.category);

    if (!hasValidTitle || !hasValidCoords || !hasCategory) {
      setDuplicateState({
        status: 'idle',
        data: null,
        error: null,
        lastCheckedAt: null
      });
      return;
    }

    // Cancel any previous in-flight request to prevent race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const currentReqId = ++requestIdRef.current;
    setDuplicateState((prev) => ({
      ...prev,
      status: 'loading',
      error: null
    }));

    try {
      const res = await api.post(
        '/issues/check-duplicates',
        {
          title: formData.title.trim(),
          description: formData.description || '',
          category: formData.category,
          latitude: Number(lat),
          longitude: Number(lng),
          radiusMeters: 300
        },
        { signal: abortController.signal }
      );

      // Discard stale responses if a newer request was dispatched
      if (currentReqId !== requestIdRef.current) return;

      if (res.data && res.data.hasDuplicates && res.data.candidates && res.data.candidates.length > 0) {
        setDuplicateState({
          status: 'candidates',
          data: res.data,
          error: null,
          lastCheckedAt: new Date().toISOString()
        });
      } else {
        setDuplicateState({
          status: 'empty',
          data: res.data || { hasDuplicates: false, matchCount: 0, candidates: [] },
          error: null,
          lastCheckedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      // Ignore aborted requests cleanly
      if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        return;
      }
      // Discard stale response errors
      if (currentReqId !== requestIdRef.current) return;

      const errMsg = err.response?.data?.message || err.message || 'Duplicate check failed';
      setDuplicateState({
        status: 'error',
        data: null,
        error: errMsg,
        lastCheckedAt: new Date().toISOString()
      });
    }
  }, [formData.title, formData.description, formData.category, formData.coordinates]);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkDuplicates();
    }, 500);

    return () => clearTimeout(timer);
  }, [checkDuplicates]);

  const updateFormData = (data) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 5));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));
  const goToStep = (targetStep) => {
    if (targetStep < step) {
      setStep(targetStep);
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  const submitIssue = async () => {
    setLoading(true);
    try {
      const payload = new FormData();
      payload.append('title', formData.title);
      payload.append('description', formData.description);
      payload.append('department', formData.category);
      payload.append('priority', formData.priority || 'normal');
      payload.append('location', formData.locationName || 'Municipal Area');

      if (formData.coordinates) {
        payload.append(
          'coordinates',
          JSON.stringify([formData.coordinates.lng, formData.coordinates.lat])
        );
      }

      if (formData.images && formData.images.length > 0) {
        formData.images.forEach((imgFile) => {
          payload.append('images', imgFile);
        });
      }

      if (formData.aiAnalysis) {
        payload.append('aiAnalysis', JSON.stringify(formData.aiAnalysis));
      }

      const response = await api.post('/issues', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSubmittedIssue(response.data);
      setStep(6);
    } catch (err) {
      console.error('Error submitting issue:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to submit issue';
      alert(`Submission Error: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReportAnother = () => {
    setFormData({
      category: 'Roads',
      title: '',
      description: '',
      priority: 'normal',
      locationName: '',
      coordinates: { lat: 12.9716, lng: 77.5946 },
      images: [],
      imagePreviews: []
    });
    setSubmittedIssue(null);
    setStep(1);
  };

  return (
    <div className="report-issue-container">
      {step <= 5 && (
        <React.Fragment>
          <div className="report-issue-header">
            <h1>Report an Issue</h1>
            <p>Help us build a cleaner, safer, and more livable community. Report a civic issue in your area.</p>
          </div>

          <div className="report-stepper-bar">
            {STEPS.map((s, idx) => {
              const isCompleted = s.num < step;
              const isActive = s.num === step;
              const stateClass = isCompleted ? 'completed' : (isActive ? 'active' : 'inactive');

              return (
                <React.Fragment key={s.num}>
                  <div
                    className="report-step-item"
                    onClick={() => isCompleted && goToStep(s.num)}
                    style={{ cursor: isCompleted ? 'pointer' : 'default' }}
                  >
                    <div className={`report-step-circle ${stateClass}`}>
                      {isCompleted ? '✓' : s.num}
                    </div>

                    <div className="report-step-info">
                      <span className={`report-step-title ${stateClass}`}>
                        {s.title}
                      </span>
                      <span className="report-step-sub">
                        {s.sub}
                      </span>
                    </div>
                  </div>

                  {idx < STEPS.length - 1 && (
                    <div className="report-step-arrow">
                      &rsaquo;
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </React.Fragment>
      )}

      <div>
        {step === 1 && (
          <Step1Category
            formData={formData}
            updateFormData={updateFormData}
            nextStep={nextStep}
            onCancel={handleCancel}
          />
        )}

        {step === 2 && (
          <Step2Details
            formData={formData}
            updateFormData={updateFormData}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        )}

        {step === 3 && (
          <Step3Location
            formData={formData}
            updateFormData={updateFormData}
            nextStep={nextStep}
            prevStep={prevStep}
            duplicateState={duplicateState}
            retryDuplicateCheck={checkDuplicates}
            duplicateResult={duplicateState.data}
            checkingDuplicates={duplicateState.status === 'loading'}
          />
        )}

        {step === 4 && (
          <Step4Evidence
            formData={formData}
            updateFormData={updateFormData}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        )}

        {step === 5 && (
          <Step5Review
            formData={formData}
            submitIssue={submitIssue}
            prevStep={prevStep}
            goToStep={goToStep}
            loading={loading}
            duplicateState={duplicateState}
            retryDuplicateCheck={checkDuplicates}
            duplicateResult={duplicateState.data}
            checkingDuplicates={duplicateState.status === 'loading'}
          />
        )}

        {step === 6 && (
          <Step6Success
            submittedIssue={submittedIssue}
            onReportAnother={handleReportAnother}
          />
        )}
      </div>
    </div>
  );
}

export default IssueWizard;
