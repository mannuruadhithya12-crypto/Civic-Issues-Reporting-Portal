const Issue = require('../models/Issue');
const { calculateSLARisk } = require('./slaRiskService');

/**
 * Calculates department workload using MongoDB aggregation 
 * combined with SLA logic.
 */
const getDepartmentWorkload = async (matchStage = {}) => {
  // We want to fetch all open issues to calculate precise SLAs
  // Or we can just use the aggregation if we approximate.
  // For precise SLA At Risk, it's better to fetch active issues and process them, 
  // or build a complex aggregation. Since we need to use the SLA risk engine, 
  // we will fetch active issues and group them in memory per department.
  // This is acceptable as long as we only fetch active issues.

  const activeIssues = await Issue.find({
    ...matchStage,
    status: { $in: ['reported', 'verified', 'assigned', 'in_progress', 'reopened'] }
  });

  const departmentMap = {};

  activeIssues.forEach(issue => {
    const dept = issue.department || 'Other';
    if (!departmentMap[dept]) {
      departmentMap[dept] = {
        department: dept,
        openIssues: 0,
        highPriority: 0,
        criticalPriority: 0,
        slaAtRisk: 0,
        slaBreached: 0
      };
    }

    departmentMap[dept].openIssues += 1;

    if (issue.priority === 'urgent') departmentMap[dept].criticalPriority += 1;
    if (issue.priority === 'high') departmentMap[dept].highPriority += 1;

    const slaRisk = calculateSLARisk(issue);
    if (slaRisk.status === 'AT_RISK') departmentMap[dept].slaAtRisk += 1;
    if (slaRisk.status === 'BREACHED') departmentMap[dept].slaBreached += 1;
  });

  const results = Object.values(departmentMap).map(dept => {
    // Determine Workload Level
    // Simple heuristic:
    // Critical if SLA breached > 5 or open > 50 or critical > 10
    // High if SLA at risk > 10 or open > 30
    // Medium if open > 10
    // Low otherwise
    
    let workloadLevel = 'LOW';
    if (dept.slaBreached > 5 || dept.openIssues > 50 || dept.criticalPriority > 10) {
      workloadLevel = 'CRITICAL';
    } else if (dept.slaAtRisk > 10 || dept.openIssues > 30 || dept.highPriority > 15) {
      workloadLevel = 'HIGH';
    } else if (dept.openIssues > 10) {
      workloadLevel = 'MEDIUM';
    }

    return {
      ...dept,
      workloadLevel
    };
  });

  return results.sort((a, b) => b.openIssues - a.openIssues);
};

module.exports = {
  getDepartmentWorkload
};
