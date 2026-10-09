/**
 * Generates rule-based recommendations based on issue facts.
 */
const getRecommendations = (rankedIssues) => {
  const recommendations = [];

  rankedIssues.forEach(issue => {
    let action = null;
    let reason = null;
    let confidence = 'LOW';
    let evidence = [...issue.reasons]; // Reuse the deterministic priority reasons

    // Rule 1: High SLA Risk + Recurring Garbage
    if (issue.category === 'Garbage overflow' && issue.slaStatus === 'AT_RISK' && issue.recurrenceCount > 0) {
      action = 'Schedule immediate sanitation inspection and consider increasing collection frequency.';
      reason = 'Recurring sanitation hotspot nearing SLA breach.';
      confidence = 'HIGH';
    } 
    // Rule 2: High Severity Pothole + Density
    else if (issue.category === 'Potholes' && issue.severity === 'urgent' && issue.densityScore > 50) {
      action = 'Dispatch road maintenance team for emergency repair.';
      reason = 'Urgent severity pothole in a dense cluster.';
      confidence = 'HIGH';
    }
    // Rule 3: SLA Breached + Any Category
    else if (issue.slaStatus === 'BREACHED') {
      action = `Escalate to ${issue.department} supervisor.`;
      reason = 'Issue has breached its SLA resolution timeframe.';
      confidence = 'MEDIUM';
    }
    // Rule 4: High Priority catch-all
    else if (issue.priorityLevel === 'CRITICAL' || issue.priorityLevel === 'HIGH') {
      action = `Prioritize assignment for ${issue.department}.`;
      reason = 'High overall civic priority score.';
      confidence = 'MEDIUM';
    }

    if (action) {
      recommendations.push({
        issueId: issue.issueId,
        title: issue.title,
        department: issue.department,
        action,
        reason,
        evidence,
        confidence
      });
    }
  });

  // Return the top recommendations
  return recommendations.slice(0, 10);
};

module.exports = {
  getRecommendations
};
