import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Card from '../common/Card';
import Spinner from '../common/Spinner';

const SLARiskPanel = () => {
  const [slaRisk, setSlaRisk] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSlaRisk();
  }, []);

  const fetchSlaRisk = async () => {
    try {
      const res = await api.get('/decision-support/sla-risk');
      setSlaRisk(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-6">
      <Spinner size="md" />
    </div>
  );
  if (!slaRisk) return null;

  return (
    <Card className="h-full">
      <h3 className="text-xl font-bold text-text-primary mb-6">SLA Status</h3>
      
      <div className="flex justify-around items-center text-center mb-8">
        <div>
          <div className="text-3xl font-bold text-success-500 mb-1">{slaRisk.onTrackCount}</div>
          <div className="text-sm text-text-secondary font-medium">🟢 On Track</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-warning-500 mb-1">{slaRisk.atRiskCount}</div>
          <div className="text-sm text-text-secondary font-medium">🟡 At Risk</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-danger-500 mb-1">{slaRisk.breachedCount}</div>
          <div className="text-sm text-text-secondary font-medium">🔴 Breached</div>
        </div>
      </div>

      {slaRisk.affectedDepartments.length > 0 && (
        <div className="mt-6 pt-6 border-t border-light">
          <h4 className="text-md font-bold text-text-primary mb-3">Affected Departments</h4>
          <ul className="pl-5 m-0 text-sm text-text-secondary list-disc space-y-1">
            {slaRisk.affectedDepartments.map(dept => (
              <li key={dept}>{dept}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
};

export default SLARiskPanel;
