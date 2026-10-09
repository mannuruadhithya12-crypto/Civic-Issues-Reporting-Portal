import React from 'react';
import Card from '../common/Card';
import Badge from '../common/Badge';

function RecurringIssues({ data }) {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6 text-center text-text-tertiary">
        <h3 className="text-xl font-bold text-text-primary mb-2">Recurring Problems</h3>
        <p>No recurring issues detected in this period.</p>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <h3 className="text-xl font-bold text-text-primary mb-2">Recurring Problems</h3>
      <p className="text-sm text-text-secondary mb-6">
        Identified based on repeated reports of the same category in the same geographic area over time.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map(issue => (
          <div key={issue.id} className="border border-light rounded-xl p-4 bg-primary-50/20 hover:border-primary-300 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <h4 className="m-0 font-bold text-primary-600">{issue.category}</h4>
              <Badge variant="warning">{issue.occurrenceCount} Occurrences</Badge>
            </div>
            
            <div className="text-sm text-text-secondary space-y-1">
              <div><strong className="text-text-primary">Department:</strong> {issue.department}</div>
              <div><strong className="text-text-primary">Period:</strong> {new Date(issue.firstReported).toLocaleDateString()} - {new Date(issue.lastReported).toLocaleDateString()}</div>
              <div><strong className="text-text-primary">Avg Recurrence:</strong> ~{Math.round(issue.averageDaysBetweenReports)} days</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default RecurringIssues;
