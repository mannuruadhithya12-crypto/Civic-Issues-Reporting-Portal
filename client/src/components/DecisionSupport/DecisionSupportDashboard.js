import React from 'react';
import PriorityIssues from './PriorityIssues';
import SLARiskPanel from './SLARiskPanel';
import DepartmentWorkload from './DepartmentWorkload';
import ActionRecommendations from './ActionRecommendations';
import WhatIfSimulator from './WhatIfSimulator';
import Card from '../common/Card';

const DecisionSupportDashboard = () => {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <h3 className="text-xl font-bold text-gray-800 m-0">AI Decision Support</h3>
        <span className="bg-blue-100 text-blue-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded ml-2">Active</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="w-full">
          <PriorityIssues />
        </div>
        <div className="flex flex-col gap-8 w-full">
          <SLARiskPanel />
          <ActionRecommendations />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
        <div className="w-full">
          <DepartmentWorkload />
        </div>
        <div className="w-full">
          <WhatIfSimulator />
        </div>
      </div>
    </div>
  );
};

export default DecisionSupportDashboard;
