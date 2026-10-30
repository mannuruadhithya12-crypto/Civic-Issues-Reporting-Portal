/**
 * CivicConnect AI Phase 3: Production-Grade Geospatial Hotspot Intelligence Engine
 * 
 * Features:
 * - Genuine MongoDB Issue query with GeoJSON Point coordinate validation
 * - DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
 * - Haversine geodesic distance metric
 * - Distinction between Core, Border, and Noise points
 * - Rigorous parameter validation and query bounds (max 2000 points)
 * - Comprehensive metrics: radius in meters, bounding box, GeoJSON bounding polygon,
 *   dominant department/category, priority & status breakdowns, active/resolved counts,
 *   first/last reported timestamps, density per km^2, transparent severity score
 * - Zero fabricated coordinates, synthetic markers, or demo fallbacks
 */

const Issue = require('../models/Issue');

// Supported Enums based on server/models/Issue.js
const VALID_DEPARTMENTS = [
  'Roads', 'Waste', 'Electricity', 'Water', 'Parks', 'Sanitation',
  'Public Safety', 'Potholes', 'Garbage overflow', 'Streetlight failures',
  'Water leakage', 'Illegal parking', 'Drainage issues', 'Broken footpaths',
  'Noise pollution', 'Sewage problems', 'Public safety issues', 'Other'
];

const VALID_STATUSES = [
  'reported', 'verified', 'assigned', 'in_progress', 'resolved', 'closed', 'reopened', 'rejected'
];

const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

/**
 * Calculates great-circle distance in meters between two coordinates via Haversine formula
 */
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371000; // Earth's mean radius in meters
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generates an accurate GeoJSON Polygon approximating a circular bounding boundary
 * centered at (centerLat, centerLon) with radius in meters.
 * Coordinates are formatted in GeoJSON standard: [longitude, latitude].
 */
function generateBoundingPolygon(centerLat, centerLon, radiusMeters, numPoints = 16) {
  const coordinates = [];
  const R = 6371000;
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;
  const d = Math.max(radiusMeters, 15) / R; // Angular distance in radians

  const latRad = centerLat * toRad;
  const lonRad = centerLon * toRad;

  for (let i = 0; i <= numPoints; i++) {
    const bearing = (i * 360 / numPoints) * toRad;
    const ptLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(d) +
      Math.cos(latRad) * Math.sin(d) * Math.cos(bearing)
    );
    const ptLonRad = lonRad + Math.atan2(
      Math.sin(bearing) * Math.sin(d) * Math.cos(latRad),
      Math.cos(d) - Math.sin(latRad) * Math.sin(ptLatRad)
    );

    // GeoJSON standard: [longitude, latitude]
    coordinates.push([
      Math.round(ptLonRad * toDeg * 1e6) / 1e6,
      Math.round(ptLatRad * toDeg * 1e6) / 1e6
    ]);
  }

  return {
    type: 'Polygon',
    coordinates: [coordinates]
  };
}

/**
 * Pure DBSCAN Clustering Implementation
 * Distinguishes Core points, Border points, and Noise points.
 * 
 * @param {Array<Object>} points - Array of points with { index, id, lat, lng, ... }
 * @param {number} radiusMeters - Epsilon neighborhood distance
 * @param {number} minPoints - Minimum points to qualify as Core
 * @returns {Object} { clusters: Array<Array<Object>>, noise: Array<Object>, coreCount: number, borderCount: number }
 */
function runDBSCAN(points, radiusMeters, minPoints) {
  const n = points.length;
  const UNVISITED = -1;
  const NOISE = 0;

  const labels = new Array(n).fill(UNVISITED);
  const pointTypes = new Array(n).fill('unvisited'); // 'core', 'border', 'noise'

  // Pre-calculate neighborhood sets for efficiency
  // For datasets <= 2000 points, distance matrix/neighborhood lookup is O(N^2) and takes < 15ms
  const neighbors = new Array(n);
  for (let i = 0; i < n; i++) {
    neighbors[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        neighbors[i].push(j);
      } else {
        const dist = haversineDistanceMeters(points[i].lat, points[i].lng, points[j].lat, points[j].lng);
        if (dist <= radiusMeters) {
          neighbors[i].push(j);
        }
      }
    }
  }

  let clusterId = 0;

  for (let i = 0; i < n; i++) {
    if (labels[i] !== UNVISITED) continue;

    const currentNeighbors = neighbors[i];

    if (currentNeighbors.length < minPoints) {
      labels[i] = NOISE;
      pointTypes[i] = 'noise';
    } else {
      clusterId++;
      labels[i] = clusterId;
      pointTypes[i] = 'core';

      // Seed set for expanding cluster
      const seedQueue = [...currentNeighbors.filter(idx => idx !== i)];
      const seedSet = new Set(seedQueue);

      let head = 0;
      while (head < seedQueue.length) {
        const currentPt = seedQueue[head++];

        if (labels[currentPt] === NOISE) {
          // Reassign border point from noise to current cluster
          labels[currentPt] = clusterId;
          pointTypes[currentPt] = 'border';
        }

        if (labels[currentPt] !== UNVISITED) {
          continue;
        }

        labels[currentPt] = clusterId;
        const currentPtNeighbors = neighbors[currentPt];

        if (currentPtNeighbors.length >= minPoints) {
          pointTypes[currentPt] = 'core';
          for (const neighborIdx of currentPtNeighbors) {
            if (!seedSet.has(neighborIdx)) {
              seedSet.add(neighborIdx);
              seedQueue.push(neighborIdx);
            }
          }
        } else {
          pointTypes[currentPt] = 'border';
        }
      }
    }
  }

  // Group by clusters
  const clusters = [];
  const noise = [];

  for (let c = 1; c <= clusterId; c++) {
    const clusterMembers = [];
    for (let i = 0; i < n; i++) {
      if (labels[i] === c) {
        clusterMembers.push({
          ...points[i],
          clusterType: pointTypes[i]
        });
      }
    }
    if (clusterMembers.length >= minPoints) {
      clusters.push(clusterMembers);
    } else {
      // Re-classify as noise if cluster somehow had fewer than minPoints
      for (const m of clusterMembers) {
        noise.push({ ...m, clusterType: 'noise' });
      }
    }
  }

  for (let i = 0; i < n; i++) {
    if (labels[i] === NOISE) {
      noise.push({
        ...points[i],
        clusterType: 'noise'
      });
    }
  }

  let coreCount = 0;
  let borderCount = 0;
  for (let i = 0; i < n; i++) {
    if (pointTypes[i] === 'core') coreCount++;
    if (pointTypes[i] === 'border') borderCount++;
  }

  return {
    clusters,
    noise,
    coreCount,
    borderCount
  };
}

/**
 * Calculates comprehensive geographic and civic metrics for a cluster of real issues
 */
function calculateClusterMetrics(clusterPoints, index) {
  const count = clusterPoints.length;

  let sumLat = 0;
  let sumLng = 0;
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;

  const departmentCounts = {};
  const categoryCounts = {};
  const statusCounts = {};
  const priorityCounts = { low: 0, normal: 0, high: 0, urgent: 0 };

  let activeCount = 0;
  let resolvedCount = 0;

  let earliestTimestamp = null;
  let latestTimestamp = null;

  for (const pt of clusterPoints) {
    sumLat += pt.lat;
    sumLng += pt.lng;

    if (pt.lat < minLat) minLat = pt.lat;
    if (pt.lat > maxLat) maxLat = pt.lat;
    if (pt.lng < minLng) minLng = pt.lng;
    if (pt.lng > maxLng) maxLng = pt.lng;

    // Department breakdown
    const dept = pt.department || 'Other';
    departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;

    // Complaint category breakdown
    const cat = pt.category || dept;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

    // Status breakdown
    const st = (pt.status || 'reported').toLowerCase();
    statusCounts[st] = (statusCounts[st] || 0) + 1;

    if (['resolved', 'closed'].includes(st)) {
      resolvedCount++;
    } else if (st !== 'rejected') {
      activeCount++;
    }

    // Priority breakdown
    const pr = (pt.priority || 'normal').toLowerCase();
    if (priorityCounts[pr] !== undefined) {
      priorityCounts[pr]++;
    } else {
      priorityCounts[pr] = 1;
    }

    // Timestamps
    if (pt.createdAt) {
      const dt = new Date(pt.createdAt);
      if (!isNaN(dt.getTime())) {
        if (!earliestTimestamp || dt < earliestTimestamp) earliestTimestamp = dt;
        if (!latestTimestamp || dt > latestTimestamp) latestTimestamp = dt;
      }
    }
  }

  const centerLat = sumLat / count;
  const centerLng = sumLng / count;

  // Calculate actual maximum radius from center to any constituent point
  let maxDistFromCenter = 0;
  for (const pt of clusterPoints) {
    const dist = haversineDistanceMeters(centerLat, centerLng, pt.lat, pt.lng);
    if (dist > maxDistFromCenter) maxDistFromCenter = dist;
  }
  const radiusMeters = Math.max(Math.round(maxDistFromCenter), 20);

  // Dominant Department
  const dominantDepartment = Object.keys(departmentCounts).reduce((a, b) =>
    departmentCounts[a] >= departmentCounts[b] ? a : b, 'Other'
  );

  // Dominant Complaint Category
  const dominantCategory = Object.keys(categoryCounts).reduce((a, b) =>
    categoryCounts[a] >= categoryCounts[b] ? a : b, dominantDepartment
  );

  // Density per square km calculation
  // Area = pi * r_km^2. Enforce minimum defensible radius floor of 25m to prevent division by zero
  const effectiveRadiusKm = Math.max(radiusMeters, 25) / 1000;
  const areaSqKm = Math.PI * Math.pow(effectiveRadiusKm, 2);
  const densityPerSqKm = Math.round((count / areaSqKm) * 100) / 100;

  // Transparent Severity Score Calculation:
  // Priority Weight: urgent=1.0, high=0.75, normal=0.40, low=0.20
  const priorityWeights = { urgent: 1.0, high: 0.75, normal: 0.40, low: 0.20 };
  let priorityWeightedSum = 0;
  for (const [p, c] of Object.entries(priorityCounts)) {
    priorityWeightedSum += (priorityWeights[p] || 0.40) * c;
  }
  const priorityFactor = priorityWeightedSum / count; // 0.20 to 1.0
  const activeFactor = count > 0 ? (activeCount / count) : 0; // 0.0 to 1.0
  const volumeFactor = Math.min(1.0, count / 10); // reaches 1.0 at 10 issues

  // Weighted severity: 50% priority factor, 30% active unresolved ratio, 20% issue volume
  const severityScore = Math.round((0.50 * priorityFactor + 0.30 * activeFactor + 0.20 * volumeFactor) * 100) / 100;

  let severityLevel = 'LOW';
  if (severityScore >= 0.70) severityLevel = 'CRITICAL';
  else if (severityScore >= 0.50) severityLevel = 'HIGH';
  else if (severityScore >= 0.35) severityLevel = 'MEDIUM';

  // Deterministic cluster ID
  const clusterId = `hotspot-${index + 1}-${Math.round(centerLat * 1e4)}_${Math.round(centerLng * 1e4)}`;

  // Bounding Geometry
  const boundingBox = {
    minLatitude: Math.round(minLat * 1e6) / 1e6,
    maxLatitude: Math.round(maxLat * 1e6) / 1e6,
    minLongitude: Math.round(minLng * 1e6) / 1e6,
    maxLongitude: Math.round(maxLng * 1e6) / 1e6
  };

  const boundingPolygon = generateBoundingPolygon(centerLat, centerLng, radiusMeters);

  // Constituent issue summaries (safe, no reporter PII)
  const issues = clusterPoints.map(p => ({
    id: p.id,
    title: p.title,
    department: p.department,
    category: p.category,
    priority: p.priority,
    status: p.status,
    latitude: p.lat,
    longitude: p.lng,
    locationName: p.locationName || '',
    createdAt: p.createdAt,
    clusterRole: p.clusterType // 'core' or 'border'
  }));

  return {
    id: clusterId,
    center: {
      latitude: Math.round(centerLat * 1e6) / 1e6,
      longitude: Math.round(centerLng * 1e6) / 1e6
    },
    // Backwards-compatible Leaflet/GeoJSON coordinate arrays
    coordinates: [Math.round(centerLng * 1e6) / 1e6, Math.round(centerLat * 1e6) / 1e6], // GeoJSON [lng, lat]
    centerCoordinates: [Math.round(centerLat * 1e6) / 1e6, Math.round(centerLng * 1e6) / 1e6], // Leaflet [lat, lng]
    issueCount: count,
    radiusMeters,
    boundingBox,
    boundingPolygon,
    dominantDepartment,
    dominantCategory,
    statusBreakdown: statusCounts,
    priorityBreakdown: priorityCounts,
    activeCount,
    resolvedCount,
    firstReportedAt: earliestTimestamp ? earliestTimestamp.toISOString() : null,
    lastReportedAt: latestTimestamp ? latestTimestamp.toISOString() : null,
    densityPerSqKm,
    severityScore,
    severityLevel,
    issues
  };
}

/**
 * Validates incoming filter parameters for the Hotspot API
 */
function validateHotspotParams(params) {
  const errors = [];
  const validated = {};

  // radiusMeters: default 200, valid 10 - 5000
  if (params.radiusMeters !== undefined && params.radiusMeters !== '') {
    const rad = Number(params.radiusMeters);
    if (isNaN(rad) || rad < 10 || rad > 5000) {
      errors.push('radiusMeters must be a positive number between 10 and 5000 meters');
    } else {
      validated.radiusMeters = rad;
    }
  } else {
    validated.radiusMeters = 200;
  }

  // minPoints: default 3, valid 2 - 50
  if (params.minPoints !== undefined && params.minPoints !== '') {
    const mp = Number(params.minPoints);
    if (!Number.isInteger(mp) || mp < 2 || mp > 50) {
      errors.push('minPoints must be an integer between 2 and 50');
    } else {
      validated.minPoints = mp;
    }
  } else {
    validated.minPoints = 3;
  }

  // from / startDate
  const fromRaw = params.from || params.startDate;
  if (fromRaw) {
    const fromDate = new Date(fromRaw);
    if (isNaN(fromDate.getTime())) {
      errors.push(`Invalid 'from' date format: ${fromRaw}`);
    } else {
      validated.from = fromDate;
    }
  }

  // to / endDate
  const toRaw = params.to || params.endDate;
  if (toRaw) {
    const toDate = new Date(toRaw);
    if (isNaN(toDate.getTime())) {
      errors.push(`Invalid 'to' date format: ${toRaw}`);
    } else {
      validated.to = toDate;
    }
  }

  if (validated.from && validated.to && validated.from > validated.to) {
    errors.push(`'from' date (${validated.from.toISOString()}) cannot be after 'to' date (${validated.to.toISOString()})`);
  }

  // department
  if (params.department && params.department !== 'all' && params.department !== 'All Departments') {
    const deptStr = String(params.department).trim();
    const matched = VALID_DEPARTMENTS.find(d => d.toLowerCase() === deptStr.toLowerCase());
    if (!matched) {
      errors.push(`Invalid department: '${deptStr}'. Valid options are: ${VALID_DEPARTMENTS.join(', ')}`);
    } else {
      validated.department = matched;
    }
  }

  // status
  if (params.status && params.status !== 'all' && params.status !== 'All Status') {
    const stStr = String(params.status).toLowerCase().trim();
    if (!VALID_STATUSES.includes(stStr)) {
      errors.push(`Invalid status: '${params.status}'. Valid options are: ${VALID_STATUSES.join(', ')}`);
    } else {
      validated.status = stStr;
    }
  }

  // priority
  if (params.priority && params.priority !== 'all' && params.priority !== 'All Priorities') {
    const prStr = String(params.priority).toLowerCase().trim();
    if (!VALID_PRIORITIES.includes(prStr)) {
      errors.push(`Invalid priority: '${params.priority}'. Valid options are: ${VALID_PRIORITIES.join(', ')}`);
    } else {
      validated.priority = prStr;
    }
  }

  // limit: maximum query limit to prevent unbounded memory usage (default 1000, max 2000)
  if (params.limit !== undefined && params.limit !== '') {
    const lim = Number(params.limit);
    if (!Number.isInteger(lim) || lim < 1 || lim > 2000) {
      errors.push('limit must be an integer between 1 and 2000');
    } else {
      validated.limit = lim;
    }
  } else {
    validated.limit = 1000;
  }

  return { errors, validated };
}

/**
 * Main execution service to query real records from MongoDB and compute DBSCAN hotspots
 */
async function findHotspots(queryParams = {}) {
  const { errors, validated } = validateHotspotParams(queryParams);
  if (errors.length > 0) {
    const err = new Error(errors.join('; '));
    err.statusCode = 400;
    err.validationErrors = errors;
    throw err;
  }

  const { radiusMeters, minPoints, from, to, department, status, priority, limit } = validated;

  // Build safe MongoDB filter matching genuine GeoJSON coordinates only
  const filter = {
    'coordinates.coordinates': { $exists: true, $ne: [] }
  };

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }

  if (department) {
    filter.department = department;
  }

  if (status) {
    filter.status = status;
  }

  if (priority) {
    filter.priority = priority;
  }

  // Fetch only required fields from database, up to bounded limit
  const rawIssues = await Issue.find(filter)
    .select('_id title department priority status coordinates createdAt locationName aiAnalysis')
    .limit(limit)
    .lean();

  // Validate coordinates and filter out invalid/corrupted records safely
  const validPoints = [];
  for (const doc of rawIssues) {
    const coords = doc.coordinates?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;

    // GeoJSON Point: index 0 is longitude, index 1 is latitude
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);

    if (isNaN(lat) || isNaN(lng)) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;

    validPoints.push({
      id: String(doc._id),
      title: doc.title || 'Untitled Issue',
      department: doc.department || 'Other',
      category: doc.aiAnalysis?.category?.value || doc.department || 'Other',
      priority: doc.priority || 'normal',
      status: doc.status || 'reported',
      locationName: doc.locationName || '',
      createdAt: doc.createdAt,
      lat,
      lng
    });
  }

  if (validPoints.length === 0) {
    return {
      success: true,
      generatedAt: new Date().toISOString(),
      filters: {
        radiusMeters,
        minPoints,
        from: from ? from.toISOString() : null,
        to: to ? to.toISOString() : null,
        department: department || null,
        status: status || null,
        priority: priority || null,
        limit
      },
      summary: {
        totalHotspots: 0,
        totalIssuesInHotspots: 0,
        noisePointsCount: 0,
        totalPointsAnalyzed: 0
      },
      hotspots: []
    };
  }

  // Run DBSCAN
  const { clusters, noise, coreCount, borderCount } = runDBSCAN(validPoints, radiusMeters, minPoints);

  // Compute metrics for each qualifying cluster
  const hotspots = clusters.map((clusterPts, idx) => calculateClusterMetrics(clusterPts, idx));

  // Sort hotspots by issueCount descending, then severityScore descending
  hotspots.sort((a, b) => {
    if (b.issueCount !== a.issueCount) return b.issueCount - a.issueCount;
    return b.severityScore - a.severityScore;
  });

  const totalIssuesInHotspots = hotspots.reduce((sum, h) => sum + h.issueCount, 0);

  return {
    success: true,
    generatedAt: new Date().toISOString(),
    filters: {
      radiusMeters,
      minPoints,
      from: from ? from.toISOString() : null,
      to: to ? to.toISOString() : null,
      department: department || null,
      status: status || null,
      priority: priority || null,
      limit
    },
    summary: {
      totalHotspots: hotspots.length,
      totalIssuesInHotspots,
      noisePointsCount: noise.length,
      corePointsCount: coreCount,
      borderPointsCount: borderCount,
      totalPointsAnalyzed: validPoints.length
    },
    hotspots
  };
}

module.exports = {
  haversineDistanceMeters,
  generateBoundingPolygon,
  runDBSCAN,
  calculateClusterMetrics,
  validateHotspotParams,
  findHotspots,
  VALID_DEPARTMENTS,
  VALID_STATUSES,
  VALID_PRIORITIES
};
