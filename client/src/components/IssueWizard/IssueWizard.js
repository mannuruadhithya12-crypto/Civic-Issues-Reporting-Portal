import React, { useState } from 'react';
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
