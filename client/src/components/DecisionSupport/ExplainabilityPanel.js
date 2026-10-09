import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Card from '../common/Card';
import Button from '../common/Button';
import Spinner from '../common/Spinner';

const ExplainabilityPanel = ({ contextData, onClose }) => {
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (contextData) {
      explainDecision();
    }
  }, [contextData]);

  const explainDecision = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/decision-support/explain', { contextData });
      setExplanation(res.data.explanation);
    } catch (err) {
      console.error(err);
      setError("Failed to generate explanation. Using deterministic fallback.");
      // Fallback
      setExplanation(`This issue is prioritized as ${contextData.priorityLevel || 'Unknown'} (Score: ${contextData.priorityScore || 0}) due to: ${(contextData.reasons || []).join(', ') || 'No reasons provided'}.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-text-primary m-0 flex items-center gap-2">
            <span>🤖</span> AI Explainability
          </h3>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors text-2xl leading-none">&times;</button>
        </div>
        
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-text-secondary">
            <Spinner size="lg" className="mb-4" />
            <p className="text-sm font-medium">Analyzing civic data context...</p>
          </div>
        ) : (
          <div className="bg-surface p-6 rounded-xl border border-light leading-relaxed text-text-primary">
            <p className="m-0 text-md">{explanation}</p>
            {error && <p className="text-danger-500 text-sm mt-4 m-0 font-medium">{error}</p>}
          </div>
        )}

        <div className="flex justify-end mt-6">
          <Button onClick={onClose} variant="secondary">Close</Button>
        </div>
      </Card>
    </div>
  );
};

export default ExplainabilityPanel;
