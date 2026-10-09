import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import ExplainabilityPanel from './ExplainabilityPanel';
import Card from '../common/Card';
import Button from '../common/Button';
import Spinner from '../common/Spinner';

const PriorityIssues = () => {
  const [priorities, setPriorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [explainContext, setExplainContext] = useState(null);

  useEffect(() => {
    fetchPriorities();
  }, []);

  const fetchPriorities = async () => {
    try {
      const res = await api.get('/decision-support/priorities');
      setPriorities(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityClasses = (level) => {
    switch (level) {
      case 'CRITICAL': return 'border-danger-500 text-danger-600 bg-danger-50';
      case 'HIGH': return 'border-warning-500 text-warning-600 bg-warning-50';
      case 'MEDIUM': return 'border-warning-300 text-warning-600 bg-warning-50';
      case 'LOW': return 'border-success-500 text-success-600 bg-success-50';
      default: return 'border-light text-text-primary bg-surface';
    }
  };

  const getPriorityTextClass = (level) => {
    switch (level) {
      case 'CRITICAL': return 'text-danger-600';
      case 'HIGH': return 'text-warning-600';
      case 'MEDIUM': return 'text-warning-500';
      case 'LOW': return 'text-success-600';
      default: return 'text-text-primary';
    }
  };

  if (loading) return (
    <div className="flex justify-center py-10">
      <Spinner />
    </div>
  );

  if (!priorities.length) return <Card className="p-6 text-center text-text-tertiary">No active issues found for prioritization.</Card>;

  return (
    <Card className="h-full">
      <h3 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
        <span>🚨</span> Top Civic Priorities
      </h3>
      <div className="flex flex-col gap-4">
        {priorities.slice(0, 5).map((issue, index) => (
          <div key={issue.issueId} className={`p-4 border rounded-xl bg-surface transition-shadow hover:shadow-md ${getPriorityClasses(issue.priorityLevel).split(' ')[0]}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-text-primary m-0 mb-1">#{index + 1} {issue.title}</h4>
                <div className="text-sm text-text-secondary">
                  {issue.category} • {issue.location}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xl font-bold ${getPriorityTextClass(issue.priorityLevel)}`}>
                  {issue.priorityScore} — {issue.priorityLevel}
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <strong className="text-text-primary text-sm">Reasons:</strong>
              <ul className="mt-1 pl-5 text-sm text-text-secondary list-disc">
                {issue.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={() => setExplainContext(issue)}
                variant="primary"
                size="sm"
              >
                WHY? (Explain)
              </Button>
            </div>
          </div>
        ))}
      </div>

      {explainContext && (
        <ExplainabilityPanel 
          contextData={explainContext} 
          onClose={() => setExplainContext(null)} 
        />
      )}
    </Card>
  );
};

export default PriorityIssues;
