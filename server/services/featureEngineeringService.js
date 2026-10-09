const Issue = require('../models/Issue');
const PREDICTION_CONFIG = require('../config/prediction');
const { getDistanceFromLatLonInM } = require('./clusteringService'); // Need to export this or implement locally

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Extracts a numeric feature vector for a given target area/category at a specific cutoff date.
 * No information after the cutoff date is included.
 */
async function generateFeatures(gridLat, gridLon, category, cutoffDate) {
  const cutoff = new Date(cutoffDate);
  const msInDay = 1000 * 60 * 60 * 24;

  // 1. Fetch historical issues in this grid or very close to it (e.g. 500m radius) BEFORE cutoff
  // We'll approximate grid distance using a box, or just fetch all issues and filter.
  // For performance, query issues created before cutoffDate.
  // Ideally, use a geospatial query, but for bounding, we can use $near or simply filter in JS if not too large.
  
  const recentCutoff90 = new Date(cutoff.getTime() - (90 * msInDay));
  
  // We fetch issues up to 90 days before cutoff to calculate temporal trends.
  // We'll expand search radius to get nearby counts.
  const issues = await Issue.find({
    createdAt: { $gte: recentCutoff90, $lte: cutoff },
    'coordinates.coordinates': { $exists: true, $ne: [] }
  }).lean();

  const features = {
    // Geographic
    nearbyIssueCount: 0,
    nearbyCategoryCount: 0,
    
    // Temporal
    issuesLast7Days: 0,
    issuesLast30Days: 0,
    issuesLast60Days: 0,
    issuesLast90Days: 0,
    categoryIssuesLast7Days: 0,
    categoryIssuesLast30Days: 0,
    recentGrowth: 0, // category (7 days / prev 7 days)
    
    // Severity (for this category nearby)
    highSeverityCount: 0,
    criticalSeverityCount: 0,
    
    // Operational
    openIssuesAtCutoff: 0,
    slaBreachesBeforeCutoff: 0
  };

  const current7 = new Date(cutoff.getTime() - (7 * msInDay));
  const current30 = new Date(cutoff.getTime() - (30 * msInDay));
  const current60 = new Date(cutoff.getTime() - (60 * msInDay));
  
  const prev7End = current7;
  const prev7Start = new Date(prev7End.getTime() - (7 * msInDay));

  let prev7CatCount = 0;

  issues.forEach(issue => {
    const lon = issue.coordinates.coordinates[0];
    const lat = issue.coordinates.coordinates[1];
    
    const distance = calculateDistance(gridLat, gridLon, lat, lon);
    
    // If issue is nearby (within 3x grid size for contextual features)
    if (distance <= PREDICTION_CONFIG.GRID_SIZE_METERS * 2) {
      features.nearbyIssueCount++;
      const isTargetCat = (issue.department === category || (issue.aiAnalysis && issue.aiAnalysis.category && issue.aiAnalysis.category.value === category));
      
      if (isTargetCat) {
        features.nearbyCategoryCount++;
      }

      const createdDate = new Date(issue.createdAt);
      
      if (createdDate >= current7) features.issuesLast7Days++;
      if (createdDate >= current30) features.issuesLast30Days++;
      if (createdDate >= current60) features.issuesLast60Days++;
      features.issuesLast90Days++;

      if (isTargetCat) {
        if (createdDate >= current7) features.categoryIssuesLast7Days++;
        if (createdDate >= current30) features.categoryIssuesLast30Days++;
        
        if (createdDate >= prev7Start && createdDate < prev7End) {
          prev7CatCount++;
        }

        if (issue.priority === 'high') features.highSeverityCount++;
        if (issue.priority === 'urgent') features.criticalSeverityCount++;

        // Operational features at cutoff
        const isResolvedAfterCutoff = issue.resolvedAt && new Date(issue.resolvedAt) > cutoff;
        const isClosedAfterCutoff = issue.closedAt && new Date(issue.closedAt) > cutoff;
        const isStillOpenAtCutoff = !issue.resolvedAt && !issue.closedAt;
        
        if (isStillOpenAtCutoff || isResolvedAfterCutoff || isClosedAfterCutoff) {
           features.openIssuesAtCutoff++;
        }

        if (issue.sla && issue.sla.dueAt) {
           const due = new Date(issue.sla.dueAt);
           // If it was breached BEFORE the cutoff (i.e. due date passed before cutoff, and not resolved before due date)
           if (due < cutoff) {
             const resolvedBeforeDue = issue.resolvedAt && new Date(issue.resolvedAt) <= due;
             if (!resolvedBeforeDue) {
               features.slaBreachesBeforeCutoff++;
             }
           }
        }
      }
    }
  });

  features.recentGrowth = prev7CatCount > 0 ? (features.categoryIssuesLast7Days / prev7CatCount) : features.categoryIssuesLast7Days;

  // Add Day of week (0-6) and Month (0-11) of the cutoff to capture seasonality
  features.dayOfWeek = cutoff.getDay();
  features.month = cutoff.getMonth();

  return features;
}

// Order of features strictly expected by the model
const FEATURE_ORDER = [
  'nearbyIssueCount',
  'nearbyCategoryCount',
  'issuesLast7Days',
  'issuesLast30Days',
  'issuesLast60Days',
  'issuesLast90Days',
  'categoryIssuesLast7Days',
  'categoryIssuesLast30Days',
  'recentGrowth',
  'highSeverityCount',
  'criticalSeverityCount',
  'openIssuesAtCutoff',
  'slaBreachesBeforeCutoff',
  'dayOfWeek',
  'month'
];

function vectorizeFeatures(featuresObj) {
  return FEATURE_ORDER.map(key => featuresObj[key] || 0);
}

module.exports = {
  generateFeatures,
  vectorizeFeatures,
  FEATURE_ORDER,
  calculateDistance
};
