import React from 'react';
import Card from '../common/Card';

function DepartmentAnalytics({ data }) {
  if (!data || data.length === 0) return <Card className="p-6 text-center text-text-tertiary">No department data available.</Card>;

  return (
    <Card className="h-full">
      <h3 className="text-xl font-bold text-text-primary mb-6">Department Performance</h3>
      <div className="overflow-x-auto rounded-xl border border-light">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-surface text-text-secondary uppercase tracking-wider">
              <th className="p-4 font-semibold border-b border-light">Department</th>
              <th className="p-4 font-semibold border-b border-light text-right">Total</th>
              <th className="p-4 font-semibold border-b border-light text-right">Active</th>
              <th className="p-4 font-semibold border-b border-light text-right">Resolved</th>
              <th className="p-4 font-semibold border-b border-light text-right text-danger-500">Overdue</th>
              <th className="p-4 font-semibold border-b border-light text-right">SLA Compliance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-light">
            {data.map(dept => (
              <tr key={dept.department} className="hover:bg-primary-50/30 transition-colors">
                <td className="p-4 font-medium text-text-primary">{dept.department}</td>
                <td className="p-4 text-right text-text-secondary">{dept.totalIssues}</td>
                <td className="p-4 text-right text-text-secondary">{dept.activeIssues}</td>
                <td className="p-4 text-right text-text-secondary">{dept.resolvedIssues}</td>
                <td className={`p-4 text-right font-medium ${dept.overdueIssues > 0 ? 'text-danger-500' : 'text-text-secondary'}`}>
                  {dept.overdueIssues}
                </td>
                <td className="p-4 text-right">
                  {dept.slaComplianceRate !== null ? (
                    <span className={`font-bold ${
                      dept.slaComplianceRate > 90 ? 'text-success-500' : 
                      dept.slaComplianceRate > 75 ? 'text-warning-500' : 'text-danger-500'
                    }`}>
                      {dept.slaComplianceRate}%
                    </span>
                  ) : <span className="text-text-tertiary">N/A</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default DepartmentAnalytics;
