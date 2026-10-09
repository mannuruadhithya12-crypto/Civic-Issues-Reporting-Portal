const Issue = require('../models/Issue');

async function getSlaAnalytics(matchStage) {
  // Aggregate overall SLA
  const [overall] = await Issue.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalIssues: { $sum: 1 },
        resolvedIssues: {
          $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] }
        },
        breachedSLA: {
          $sum: { $cond: [{ $eq: ['$sla.isBreached', true] }, 1, 0] }
        },
        onTimeResolution: {
          $sum: {
            $cond: [
              { $and: [{ $in: ['$status', ['resolved', 'closed']] }, { $ne: ['$sla.isBreached', true] }] }, 1, 0
            ]
          }
        },
        totalResolutionTimeMs: {
          $sum: {
            $cond: [
              { $and: [{ $in: ['$status', ['resolved', 'closed']] }, { $ne: ['$resolvedAt', null] }] },
              { $subtract: ['$resolvedAt', '$createdAt'] },
              0
            ]
          }
        }
      }
    }
  ]);

  let result = {
    overallCompliance: 100,
    averageResolutionDays: 0,
    breachedSLA: 0,
    onTimeResolution: 0
  };

  if (overall) {
    const compliance = overall.totalIssues > 0 ? Math.round(((overall.totalIssues - overall.breachedSLA) / overall.totalIssues) * 100) : 100;
    const avgDays = overall.resolvedIssues > 0 ? (overall.totalResolutionTimeMs / overall.resolvedIssues / (1000 * 60 * 60 * 24)).toFixed(1) : 0;
    
    result = {
      overallCompliance: compliance,
      averageResolutionDays: parseFloat(avgDays),
      breachedSLA: overall.breachedSLA,
      onTimeResolution: overall.onTimeResolution
    };
  }

  // Aggregate trend of compliance
  const trend = await Issue.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        total: { $sum: 1 },
        breached: { $sum: { $cond: [{ $eq: ['$sla.isBreached', true] }, 1, 0] } }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const complianceTrend = trend.map(t => ({
    date: t._id,
    complianceRate: t.total > 0 ? Math.round(((t.total - t.breached) / t.total) * 100) : 100
  }));

  // Aggregate by department
  const depts = await Issue.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { $ifNull: ['$department', 'Unassigned'] },
        total: { $sum: 1 },
        breached: { $sum: { $cond: [{ $eq: ['$sla.isBreached', true] }, 1, 0] } }
      }
    },
    { $sort: { total: -1 } }
  ]);

  const departmentPerformance = depts.map(d => ({
    department: d._id,
    complianceRate: d.total > 0 ? Math.round(((d.total - d.breached) / d.total) * 100) : 100
  }));

  return {
    ...result,
    complianceTrend,
    departmentPerformance
  };
}

module.exports = {
  getSlaAnalytics
};
