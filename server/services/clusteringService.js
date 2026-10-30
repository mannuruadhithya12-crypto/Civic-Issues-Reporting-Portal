const Issue = require('../models/Issue');
const ANALYTICS_CONFIG = require('../config/analytics');
const hotspotService = require('./hotspotService');

// Helper to calculate distance between two coordinates in meters (Haversine)
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  return hotspotService.haversineDistanceMeters(lat1, lon1, lat2, lon2);
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * DBSCAN-Powered Hotspot Retrieval with legacy backwards compatibility
 */
async function getHotspots(matchStage = {}, options = {}) {
  try {
    const params = {
      radiusMeters: options.radiusMeters || 200,
      minPoints: options.minPoints || 3,
      ...options
    };

    // Extract filters if matchStage contains them
    if (matchStage.createdAt?.$gte) params.from = matchStage.createdAt.$gte;
    if (matchStage.createdAt?.$lte) params.to = matchStage.createdAt.$lte;
    if (matchStage.department) params.department = matchStage.department;
    if (matchStage.priority) params.priority = matchStage.priority;
    if (matchStage.status) params.status = matchStage.status;

    const result = await hotspotService.findHotspots(params);

    // Format for legacy consumers expecting { hotspots, rawClusters }
    const legacyHotspots = result.hotspots.map(h => ({
      ...h,
      center: [h.center.latitude, h.center.longitude], // [lat, lng] legacy array
      topCategory: h.dominantDepartment || h.dominantCategory,
      topSeverity: h.severityLevel,
      severityDistribution: h.priorityBreakdown
    }));

    return {
      hotspots: legacyHotspots,
      rawClusters: legacyHotspots,
      meta: result.summary,
      filters: result.filters
    };
  } catch (err) {
    console.error('Error in clusteringService.getHotspots:', err);
    return { hotspots: [], rawClusters: [], error: err.message };
  }
}

async function getRecurringIssues(matchStage) {
  // A recurring issue is based on category + proximity + time.
  const issues = await Issue.aggregate([
    { $match: { ...matchStage, 'coordinates.coordinates': { $exists: true, $ne: [] } } },
    {
      $project: {
        lon: { $arrayElemAt: ['$coordinates.coordinates', 0] },
        lat: { $arrayElemAt: ['$coordinates.coordinates', 1] },
        category: { $ifNull: ['$aiAnalysis.category.value', '$department'] }, // use department as category fallback
        department: 1,
        priority: 1,
        createdAt: 1,
        status: 1
      }
    },
    {
      $addFields: {
        // Coarse grid for initial grouping (e.g. 3 decimals ~110m)
        gridLat: { $round: ['$lat', 3] },
        gridLon: { $round: ['$lon', 3] }
      }
    },
    {
      $group: {
        _id: { category: '$category', gridLat: '$gridLat', gridLon: '$gridLon' },
        count: { $sum: 1 },
        lat: { $avg: '$lat' },
        lon: { $avg: '$lon' },
        issues: {
          $push: {
            createdAt: '$createdAt',
            department: '$department',
            status: '$status',
            priority: '$priority'
          }
        }
      }
    }
  ]);

  // We can further merge buckets by category if they are within RADIUS_METERS
  const categoryBuckets = {};
  issues.forEach(b => {
    const cat = b._id.category;
    if (!categoryBuckets[cat]) categoryBuckets[cat] = [];
    categoryBuckets[cat].push(b);
  });

  const recurring = [];

  for (const [cat, buckets] of Object.entries(categoryBuckets)) {
    // Merge buckets within same category
    buckets.sort((a, b) => b.count - a.count);
    const clusters = [];

    buckets.forEach(bucket => {
      let merged = false;
      for (const cluster of clusters) {
        const distance = getDistanceFromLatLonInM(bucket.lat, bucket.lon, cluster.centerLat, cluster.centerLon);
        if (distance <= ANALYTICS_CONFIG.RECURRING.RADIUS_METERS) {
          cluster.issues.push(...bucket.issues);
          cluster.count += bucket.count;
          // approximate center
          cluster.centerLat = (cluster.centerLat + bucket.lat) / 2;
          cluster.centerLon = (cluster.centerLon + bucket.lon) / 2;
          merged = true;
          break;
        }
      }
      if (!merged) {
        clusters.push({
          centerLat: bucket.lat,
          centerLon: bucket.lon,
          count: bucket.count,
          issues: [...bucket.issues],
          category: cat
        });
      }
    });

    // Analyze clusters for recurrence over time
    for (const cluster of clusters) {
      if (cluster.count >= ANALYTICS_CONFIG.RECURRING.MIN_OCCURRENCES) {
        // Check time gap
        cluster.issues.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const firstReported = new Date(cluster.issues[0].createdAt);
        const lastReported = new Date(cluster.issues[cluster.issues.length - 1].createdAt);
        
        const daysDiff = (lastReported - firstReported) / (1000 * 60 * 60 * 24);
        if (daysDiff >= ANALYTICS_CONFIG.RECURRING.MIN_TIME_GAP_DAYS) {
          // Recurring issue identified
          
          // Determine dominant department
          const depts = {};
          cluster.issues.forEach(i => depts[i.department] = (depts[i.department] || 0) + 1);
          const dominantDepartment = Object.keys(depts).reduce((a, b) => depts[a] > depts[b] ? a : b);

          recurring.push({
            id: `recurring-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            category: cat,
            department: dominantDepartment,
            center: [cluster.centerLat, cluster.centerLon],
            occurrenceCount: cluster.count,
            firstReported,
            lastReported,
            averageDaysBetweenReports: daysDiff / (cluster.count - 1)
          });
        }
      }
    }
  }

  return recurring;
}

module.exports = {
  getDistanceFromLatLonInM,
  getHotspots,
  getRecurringIssues,
  hotspotService
};
