const Issue = require('../models/Issue');
const PREDICTION_CONFIG = require('../config/prediction');
const { generateFeatures, vectorizeFeatures, calculateDistance } = require('../services/featureEngineeringService');

async function buildDataset() {
  console.log("Building chronological ML dataset...");
  // 1. Get temporal bounds of all data
  const bounds = await Issue.aggregate([
    { $match: { 'coordinates.coordinates': { $exists: true, $ne: [] } } },
    {
      $group: {
        _id: null,
        minDate: { $min: '$createdAt' },
        maxDate: { $max: '$createdAt' }
      }
    }
  ]);

  if (!bounds || bounds.length === 0) {
    return { status: "INSUFFICIENT_DATA", samples: 0, msg: "No issues with coordinates found." };
  }

  const startDate = new Date(bounds[0].minDate);
  const endDate = new Date(bounds[0].maxDate);
  const msInDay = 1000 * 60 * 60 * 24;

  const dataset = [];

  // 2. Identify unique geographic grid centers from the actual data to avoid creating an infinite grid
  // Using coarse rounding for grid anchors
  const gridCentersAggregation = await Issue.aggregate([
    { $match: { 'coordinates.coordinates': { $exists: true, $ne: [] } } },
    {
      $addFields: {
        lon: { $arrayElemAt: ['$coordinates.coordinates', 0] },
        lat: { $arrayElemAt: ['$coordinates.coordinates', 1] }
      }
    },
    {
      $addFields: {
        gridLat: { $round: ['$lat', 3] },
        gridLon: { $round: ['$lon', 3] }
      }
    },
    {
      $group: {
        _id: { gridLat: '$gridLat', gridLon: '$gridLon' }
      }
    }
  ]);

  const gridCenters = gridCentersAggregation.map(g => ({
    lat: g._id.gridLat,
    lon: g._id.gridLon
  }));

  // We will step through time using a 7-day slide to build multiple chronological observations
  let currentCutoff = new Date(startDate.getTime() + (30 * msInDay)); // Start after 30 days to have some history
  const maxCutoff = new Date(endDate.getTime() - (PREDICTION_CONFIG.HORIZON_DAYS * msInDay));

  while (currentCutoff <= maxCutoff) {
    const horizonEnd = new Date(currentCutoff.getTime() + (PREDICTION_CONFIG.HORIZON_DAYS * msInDay));
    
    for (const grid of gridCenters) {
      for (const category of PREDICTION_CONFIG.SUPPORTED_CATEGORIES) {
        // Construct target: How many issues of this category happened in this grid between currentCutoff and horizonEnd?
        const futureIssuesCount = await Issue.countDocuments({
          createdAt: { $gt: currentCutoff, $lte: horizonEnd },
          'coordinates.coordinates': { $exists: true, $ne: [] },
          $or: [
            { department: category },
            { 'aiAnalysis.category.value': category }
          ],
          // Distance filtering is complex in standard count, let's just do a rough bounding box or lean query
        }).lean();

        // But we actually need to filter by distance accurately.
        // Let's optimize: fetch all future issues in this time window and check their distance in JS.
        const futureIssues = await Issue.find({
            createdAt: { $gt: currentCutoff, $lte: horizonEnd },
            'coordinates.coordinates': { $exists: true, $ne: [] },
            $or: [
              { department: category },
              { 'aiAnalysis.category.value': category }
            ]
        }).lean();
        
        let targetCount = 0;
        for (const fi of futureIssues) {
            const dist = calculateDistance(grid.lat, grid.lon, fi.coordinates.coordinates[1], fi.coordinates.coordinates[0]);
            if (dist <= PREDICTION_CONFIG.GRID_SIZE_METERS) {
                targetCount++;
            }
        }

        // Only build feature vector if it's an interesting grid (either has future target, or has past history)
        // If we generate zeros for every empty grid, it will heavily skew dataset (class imbalance)
        
        const rawFeatures = await generateFeatures(grid.lat, grid.lon, category, currentCutoff);
        
        if (rawFeatures.nearbyCategoryCount > 0 || targetCount > 0) {
           const vector = vectorizeFeatures(rawFeatures);
           const target = targetCount >= PREDICTION_CONFIG.TARGET_ACTIVITY_THRESHOLD ? 1 : 0;
           
           dataset.push({
               cutoff: currentCutoff,
               gridLat: grid.lat,
               gridLon: grid.lon,
               category,
               features: vector,
               target
           });
        }
      }
    }
    
    // Slide window by 7 days
    currentCutoff = new Date(currentCutoff.getTime() + (7 * msInDay));
  }

  // Sort dataset chronologically (oldest cutoff first)
  dataset.sort((a, b) => a.cutoff - b.cutoff);

  let positiveSamples = 0;
  let negativeSamples = 0;
  dataset.forEach(d => {
      if (d.target === 1) positiveSamples++;
      else negativeSamples++;
  });

  console.log(`Built dataset: ${dataset.length} samples. Pos: ${positiveSamples}, Neg: ${negativeSamples}`);

  return {
      status: "SUCCESS",
      samples: dataset.length,
      positiveSamples,
      negativeSamples,
      dataset
  };
}

module.exports = { buildDataset };
