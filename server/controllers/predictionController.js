const { trainModel } = require('../ml/train');
const { getModelStatus, predictGeographicRisk } = require('../services/predictionService');
const Issue = require('../models/Issue');

exports.trainModel = async (req, res) => {
    try {
        const result = await trainModel();
        if (result.status === "INSUFFICIENT_DATA") {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (err) {
        console.error("Training Error:", err);
        res.status(500).json({ error: "Server error during model training." });
    }
};

exports.getModelStatus = (req, res) => {
    try {
        const status = getModelStatus();
        res.json(status);
    } catch (err) {
        res.status(500).json({ error: "Server error retrieving model status." });
    }
};

exports.getOverview = async (req, res) => {
    try {
        const status = getModelStatus();
        
        // Return dummy overview counts for now, in a real scenario we'd batch-predict across grid centers
        res.json({
            highRiskAreas: status.status === 'READY' ? 4 : 0,
            mediumRiskAreas: status.status === 'READY' ? 12 : 0,
            highRiskCategories: status.status === 'READY' ? 3 : 0,
            slaRiskIssues: 0,
            modelStatus: status.status,
            modelVersion: status.modelVersion,
            trainingSamples: status.trainingSamples,
            trainedAt: status.trainedAt
        });
    } catch (err) {
        res.status(500).json({ error: "Server error retrieving overview." });
    }
};

exports.getGeographicPredictions = async (req, res) => {
    try {
        const status = getModelStatus();
        if (status.status === 'NOT_TRAINED' || status.status === 'INSUFFICIENT_DATA') {
            return res.status(400).json({ error: "Model unavailable. Requires training." });
        }

        // We will predict the risk for a set of known grid centers from the database.
        // In a real scenario, this would be heavily cached or pre-computed.
        const gridCentersAggregation = await Issue.aggregate([
            { $match: { 'coordinates.coordinates': { $exists: true, $ne: [] } } },
            {
              $addFields: {
                lon: { $arrayElemAt: ['$coordinates.coordinates', 0] },
                lat: { $arrayElemAt: ['$coordinates.coordinates', 1] },
                category: { $ifNull: ['$aiAnalysis.category.value', '$department'] }
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
                _id: { gridLat: '$gridLat', gridLon: '$gridLon', category: '$category' }
              }
            }
        ]);

        const predictions = [];
        for (const g of gridCentersAggregation) {
            const pred = await predictGeographicRisk(g._id.gridLat, g._id.gridLon, g._id.category);
            predictions.push(pred);
        }

        res.json(predictions);
    } catch (err) {
        console.error("Prediction Error:", err);
        res.status(500).json({ error: "Server error generating geographic predictions." });
    }
};

exports.getCategoryPredictions = async (req, res) => {
    // Re-use geographic predictions for simplicity, grouping by area + category
    req.url = '/geographic'; 
    exports.getGeographicPredictions(req, res);
};
