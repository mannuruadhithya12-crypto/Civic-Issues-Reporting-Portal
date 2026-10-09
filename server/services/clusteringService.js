const Issue = require('../models/Issue');
const ANALYTICS_CONFIG = require('../config/analytics');

// Helper to calculate distance between two coordinates in meters (Haversine)
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of the earth in m
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in m
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Merge clusters
function mergeClusters(buckets, radiusInMeters) {
  const clusters = [];
  
  // Sort buckets by count descending so we start with densest areas
  buckets.sort((a, b) => b.count - a.count);

  buckets.forEach(bucket => {
    let merged = false;
    for (const cluster of clusters) {
      const distance = getDistanceFromLatLonInM(bucket.lat, bucket.lon, cluster.centerLat, cluster.centerLon);
      if (distance <= radiusInMeters) {
        // Merge into cluster
        cluster.count += bucket.count;
        cluster.buckets.push(bucket);
        
        // Update center using weighted average
        cluster.centerLat = ((cluster.centerLat * (cluster.count - bucket.count)) + (bucket.lat * bucket.count)) / cluster.count;
        cluster.centerLon = ((cluster.centerLon * (cluster.count - bucket.count)) + (bucket.lon * bucket.count)) / cluster.count;
        
        // Merge categories
        for (const [cat, cnt] of Object.entries(bucket.categories)) {
          cluster.categories[cat] = (cluster.categories[cat] || 0) + cnt;
        }
        
        // Merge severity
        for (const [sev, cnt] of Object.entries(bucket.severityDistribution)) {
          cluster.severityDistribution[sev] = (cluster.severityDistribution[sev] || 0) + cnt;
        }

        merged = true;
        break;
      }
    }

    if (!merged) {
      // Create new cluster
      clusters.push({
        id: `cluster-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        centerLat: bucket.lat,
        centerLon: bucket.lon,
        count: bucket.count,
        buckets: [bucket],
        categories: { ...bucket.categories },
        severityDistribution: { ...bucket.severityDistribution }
      });
    }
  });

  return clusters;
}

async function getHotspots(matchStage) {
  const buckets = await Issue.aggregate([
    { $match: { ...matchStage, 'coordinates.coordinates': { $exists: true, $ne: [] } } },
    {
      $project: {
        lon: { $arrayElemAt: ['$coordinates.coordinates', 0] },
        lat: { $arrayElemAt: ['$coordinates.coordinates', 1] },
        category: { $ifNull: ['$aiAnalysis.category.value', '$department'] }, // use department as category fallback
        department: 1,
        priority: 1
      }
    },
    {
      $addFields: {
        // Round to 3 decimals (~110m grid)
        gridLat: { $round: ['$lat', 3] },
        gridLon: { $round: ['$lon', 3] }
      }
    },
    {
      $group: {
        _id: { gridLat: '$gridLat', gridLon: '$gridLon' },
        count: { $sum: 1 },
        lat: { $avg: '$lat' },
        lon: { $avg: '$lon' },
        categoriesArray: { $push: '$category' },
        severitiesArray: { $push: '$priority' },
        departmentsArray: { $push: '$department' }
      }
    }
  ]);

  // Map buckets for merging
  const processedBuckets = buckets.map(b => {
    const categories = {};
    const severityDistribution = {};
    b.categoriesArray.forEach(c => categories[c] = (categories[c] || 0) + 1);
    b.severitiesArray.forEach(s => severityDistribution[s] = (severityDistribution[s] || 0) + 1);
    
    return {
      lat: b.lat,
      lon: b.lon,
      count: b.count,
      categories,
      severityDistribution
    };
  });

  const clusters = mergeClusters(processedBuckets, ANALYTICS_CONFIG.HOTSPOT.MERGE_RADIUS_METERS);
  
  // Filter for hotspots
  const hotspots = clusters
    .filter(c => c.count >= ANALYTICS_CONFIG.HOTSPOT.MIN_ISSUES)
    .map(c => {
      // Find top category
      const topCategory = Object.keys(c.categories).reduce((a, b) => c.categories[a] > c.categories[b] ? a : b);
      const topSeverity = Object.keys(c.severityDistribution).reduce((a, b) => c.severityDistribution[a] > c.severityDistribution[b] ? a : b);
      
      return {
        id: c.id,
        center: [c.centerLat, c.centerLon],
        issueCount: c.count,
        topCategory,
        topSeverity,
        severityDistribution: c.severityDistribution
      };
    });

  return { hotspots, rawClusters: clusters };
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
  getHotspots,
  getRecurringIssues
};
