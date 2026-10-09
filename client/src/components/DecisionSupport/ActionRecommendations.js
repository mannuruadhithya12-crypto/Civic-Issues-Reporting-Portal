import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Card from '../common/Card';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Spinner from '../common/Spinner';

const ActionRecommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const res = await api.get('/decision-support/recommendations');
      setRecommendations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceClasses = (confidence) => {
    switch (confidence) {
      case 'HIGH': return 'border-l-success-500';
      case 'MEDIUM': return 'border-l-warning-500';
      default: return 'border-l-primary-500';
    }
  };
  
  const getConfidenceBadgeVariant = (confidence) => {
    switch (confidence) {
      case 'HIGH': return 'success';
      case 'MEDIUM': return 'warning';
      default: return 'primary';
    }
  };

  if (loading) return (
    <div className="flex justify-center py-6">
      <Spinner size="md" />
    </div>
  );
  if (!recommendations.length) return null;

  return (
    <Card className="h-full">
      <h3 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
        <span>💡</span> Recommended Actions
      </h3>
      
      <div className="flex flex-col gap-4">
        {recommendations.map((rec, idx) => (
          <div key={idx} className={`p-4 border-y border-r border-light border-l-4 rounded-r-xl bg-surface transition-shadow hover:shadow-md ${getConfidenceClasses(rec.confidence)}`}>
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold text-text-primary">Action: {rec.action}</span>
              <Badge variant={getConfidenceBadgeVariant(rec.confidence)} size="sm">
                {rec.confidence} CONFIDENCE
              </Badge>
            </div>
            
            <div className="text-sm text-text-primary mb-1">
              <strong>Target:</strong> {rec.title} ({rec.department})
            </div>
            
            <div className="text-sm text-text-secondary mb-3">
              <strong>Why:</strong> {rec.reason}
            </div>
            
            <div className="mt-2">
              <Button 
                onClick={() => alert('Detailed view coming soon')}
                variant="outline"
                size="sm"
              >
                VIEW DETAILS
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default ActionRecommendations;
