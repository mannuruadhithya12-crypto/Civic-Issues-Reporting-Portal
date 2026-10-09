import React, { useState } from 'react';
import api from '../../services/api';
import { CATEGORIES } from '../CategoryCard';
import Card from '../common/Card';
import Button from '../common/Button';

const WhatIfSimulator = () => {
  const [formData, setFormData] = useState({
    department: CATEGORIES[0],
    additionalWorkers: 2,
    capacityPerWorkerPerDay: 4
  });
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSimulate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await api.post('/decision-support/simulate', formData);
      setResult(res.data);
    } catch (err) {
      console.error(err);
      setError('Simulation failed to run.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-full">
      <h3 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
        <span>🔬</span> What-If Simulator
      </h3>
      
      <form onSubmit={handleSimulate} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-bold text-text-secondary mb-2">Department</label>
          <select 
            value={formData.department}
            onChange={(e) => setFormData({...formData, department: e.target.value})}
            className="w-full p-3 rounded-xl border border-light bg-surface text-text-primary focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-shadow"
          >
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-bold text-text-secondary mb-2">Additional Workers</label>
            <div className="flex items-center gap-2">
              <Button 
                type="button" 
                onClick={() => setFormData({...formData, additionalWorkers: Math.max(0, formData.additionalWorkers - 1)})}
                variant="outline"
                className="w-10 h-10 p-0 flex items-center justify-center rounded-xl"
              >-</Button>
              <input 
                type="number" 
                value={formData.additionalWorkers} 
                onChange={(e) => setFormData({...formData, additionalWorkers: parseInt(e.target.value) || 0})}
                className="w-16 h-10 text-center border border-light rounded-xl bg-surface text-text-primary font-bold focus:outline-none focus:border-primary-500 transition-colors"
              />
              <Button 
                type="button" 
                onClick={() => setFormData({...formData, additionalWorkers: formData.additionalWorkers + 1})}
                variant="outline"
                className="w-10 h-10 p-0 flex items-center justify-center rounded-xl"
              >+</Button>
            </div>
          </div>
        </div>

        <Button type="submit" disabled={loading} className="mt-4" variant="primary">
          {loading ? 'Running...' : 'RUN SIMULATION'}
        </Button>
      </form>

      {error && <div className="text-danger-500 text-sm mt-4 font-medium">{error}</div>}

      {result && (
        <div className="mt-8 p-6 bg-primary-50/50 rounded-xl border border-primary-100">
          <h4 className="text-md font-bold text-text-primary mb-4">Simulation Results</h4>
          
          <div className="flex flex-col gap-3 text-sm text-text-secondary">
            <div className="flex justify-between">
              <span>Current Open Backlog:</span>
              <strong className="text-text-primary">{result.currentOpenBacklog}</strong>
            </div>
            <div className="flex justify-between">
              <span>Current SLA Risk Items:</span>
              <strong className="text-warning-600">{result.currentAtRiskOrBreached}</strong>
            </div>
            
            <hr className="border-light my-2" />
            
            <div className="flex justify-between">
              <span>Simulated Additional Capacity (per day):</span>
              <strong className="text-primary-600">+{result.additionalDailyCapacity} issues</strong>
            </div>
            <div className="flex justify-between text-info-600">
              <span>Estimated Backlog (after 3 days):</span>
              <strong className="font-bold">{result.scenario.estimatedBacklogAfter3Days}</strong>
            </div>
            <div className="flex justify-between text-success-600">
              <span>Estimated SLA Risk Items Accommodated:</span>
              <strong className="font-bold">{result.scenario.estimatedAtRiskAccommodated}</strong>
            </div>
          </div>
          
          <div className="mt-4 text-xs text-text-tertiary italic">
            * {result.disclaimer}
          </div>
        </div>
      )}
    </Card>
  );
};

export default WhatIfSimulator;
