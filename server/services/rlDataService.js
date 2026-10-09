const InterventionOutcome = require('../models/InterventionOutcome');

/**
 * Extracts ONLY genuine historical transitions from Sprint 7.
 * Discards simulated, manual, legacy, and unevaluated data.
 */
async function extractRealTransitions() {
    // 1. Fetch only EVALUATED, LIVE_DATA, trainingEligible records
    const records = await InterventionOutcome.find({
        status: 'EVALUATED',
        evaluationSource: 'LIVE_DATA',
        trainingEligible: true
    }).sort({ evaluatedAt: 1 }).lean(); // Sort chronologically

    return records;
}

module.exports = {
    extractRealTransitions
};
