const Issue = require('../models/Issue');

async function getOverview(matchStage) {
  const [overview] = await Issue.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalIssues: { $sum: 1 },
        activeIssues: {
          $sum: {
            $cond: [{ $in: ['$status', ['reported', 'verified', 'assigned', 'in_progress', 'reopened']] }, 1, 0]
          }
        },
        resolvedIssues: {
          $sum: {
            $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0]
          }
        },
        closedIssues: {
          $sum: {
            $cond: [{ $eq: ['$status', 'closed'] }, 1, 0]
          }
        },
        overdueIssues: {
          $sum: {
            $cond: [{ $eq: ['$sla.isBreached', true] }, 1, 0]
          }
        }
      }
    }
  ]);

  if (!overview) {
    return {
      totalIssues: 0,
      activeIssues: 0,
      resolvedIssues: 0,
      closedIssues: 0,
      overdueIssues: 0
    };
  }

  delete overview._id;
  return overview;
}

async function getTrends(matchStage, granularity) {
  let format = "%Y-%m-%d";
  if (granularity === 'weekly') format = "%Y-%U";
  if (granularity === 'monthly') format = "%Y-%m";

  const trends = await Issue.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { $dateToString: { format, date: "$createdAt" } },
        count: { $sum: 1 },
        resolved: {
          $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return trends.map(t => ({
    date: t._id,
    count: t.count,
    resolved: t.resolved
  }));
}

async function getDepartments(matchStage) {
  const deps = await Issue.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$department',
        totalIssues: { $sum: 1 },
        activeIssues: {
          $sum: {
            $cond: [{ $in: ['$status', ['reported', 'verified', 'assigned', 'in_progress', 'reopened']] }, 1, 0]
          }
        },
        resolvedIssues: {
          $sum: {
            $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0]
          }
        },
        overdueIssues: {
          $sum: {
            $cond: [{ $eq: ['$sla.isBreached', true] }, 1, 0]
          }
        },
        // Using average resolution time might be tricky if fields are missing, but we can do it approximately
        totalResolutionTimeMs: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$status', 'resolved'] }, { $ne: ['$resolvedAt', null] }] },
              { $subtract: ['$resolvedAt', '$createdAt'] },
              0
            ]
          }
        }
      }
    },
    { $sort: { totalIssues: -1 } }
  ]);

  return deps.map(d => ({
    department: d._id || 'Unassigned',
    totalIssues: d.totalIssues,
    activeIssues: d.activeIssues,
    resolvedIssues: d.resolvedIssues,
    overdueIssues: d.overdueIssues,
    slaComplianceRate: d.totalIssues > 0 ? Math.round(((d.totalIssues - d.overdueIssues) / d.totalIssues) * 100) : null
  }));
}

async function getCategories(matchStage) {
  const cats = await Issue.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { $ifNull: ['$aiAnalysis.category.value', '$department'] }, // use department as category fallback
        count: { $sum: 1 },
        critical: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
        medium: { $sum: { $cond: [{ $eq: ['$priority', 'normal'] }, 1, 0] } },
        low: { $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] } }
      }
    },
    { $sort: { count: -1 } }
  ]);

  return cats.map(c => ({
    category: c._id || 'Unknown',
    count: c.count,
    severity: {
      critical: c.critical,
      high: c.high,
      medium: c.medium,
      low: c.low
    }
  }));
}

module.exports = {
  getOverview,
  getTrends,
  getDepartments,
  getCategories
};
