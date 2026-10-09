import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Card from '../common/Card';
import Spinner from '../common/Spinner';

const DepartmentWorkload = () => {
  const [workloads, setWorkloads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkloads();
  }, []);

  const fetchWorkloads = async () => {
    try {
      const res = await api.get('/decision-support/workload');
      setWorkloads(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getWorkloadColorClass = (level) => {
    switch (level) {
      case 'CRITICAL': return 'text-danger-600';
      case 'HIGH': return 'text-warning-600';
      case 'MEDIUM': return 'text-warning-500';
      case 'LOW': return 'text-success-600';
      default: return 'text-text-primary';
    }
  };

  if (loading) return (
    <div className="flex justify-center py-6">
      <Spinner size="md" />
    </div>
  );
  if (!workloads.length) return null;

  return (
    <Card className="h-full">
      <h3 className="text-xl font-bold text-text-primary mb-6">👷 Department Workload</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {workloads.map(dept => (
          <div key={dept.department} className="p-4 border border-light rounded-xl bg-surface">
            <h4 className="m-0 mb-4 text-md font-bold text-text-primary">{dept.department}</h4>
            
            <div className="flex flex-col gap-2 text-sm text-text-secondary">
              <div className="flex justify-between">
                <span>Open Issues:</span>
                <strong className="text-text-primary">{dept.openIssues}</strong>
              </div>
              <div className="flex justify-between">
                <span>High Priority:</span>
                <strong className="text-text-primary">{dept.highPriority + dept.criticalPriority}</strong>
              </div>
              <div className="flex justify-between">
                <span>SLA At Risk:</span>
                <strong className="text-warning-600">{dept.slaAtRisk}</strong>
              </div>
              <div className="flex justify-between">
                <span>SLA Breached:</span>
                <strong className="text-danger-600">{dept.slaBreached}</strong>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-light flex justify-between items-center">
              <span className="text-sm font-medium text-text-secondary">Workload:</span>
              <span className={`font-bold ${getWorkloadColorClass(dept.workloadLevel)}`}>
                {dept.workloadLevel === 'CRITICAL' && '🔴 '}
                {dept.workloadLevel === 'HIGH' && '🔴 '}
                {dept.workloadLevel === 'MEDIUM' && '🟡 '}
                {dept.workloadLevel === 'LOW' && '🟢 '}
                {dept.workloadLevel}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default DepartmentWorkload;
