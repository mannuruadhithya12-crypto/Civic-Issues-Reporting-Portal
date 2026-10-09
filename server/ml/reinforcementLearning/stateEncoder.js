/**
 * Deterministic State Encoder for CivicConnect RL
 * Version: state-v1
 * 
 * Rules:
 * 1. Only uses fields from beforeMetrics or other context available PRIOR to intervention execution.
 * 2. Does NOT use afterMetrics, reward, or any future outcome data.
 * 3. Handles missing numerical values safely (e.g. default to 0 or mean).
 * 4. Provides explicit normalization bounds.
 */

const VERSION = "state-v1";

const FEATURE_METADATA = [
    { name: 'priorityScore', norm: { min: 0, max: 100 }, preAction: true, leaked: false, required: true },
    { name: 'riskScore', norm: { min: 0, max: 100 }, preAction: true, leaked: false, required: true },
    { name: 'slaRisk', norm: { min: 0, max: 100 }, preAction: true, leaked: false, required: false },
    { name: 'openIssues', norm: { min: 0, max: 50 }, preAction: true, leaked: false, required: false },
    { name: 'recurringCount', norm: { min: 0, max: 10 }, preAction: true, leaked: false, required: false },
    { name: 'hotspotLevel', norm: { min: 0, max: 10 }, preAction: true, leaked: false, required: false },
    { name: 'departmentWorkload', norm: { min: 0, max: 100 }, preAction: true, leaked: false, required: false }
];

function encodeState(interventionOutcomeRecord) {
    if (!interventionOutcomeRecord || !interventionOutcomeRecord.beforeMetrics) {
        throw new Error("Cannot encode state without beforeMetrics");
    }

    const metrics = interventionOutcomeRecord.beforeMetrics;
    const vector = [];
    const missingFeatures = [];
    let hasMissingCritical = false;

    for (const feature of FEATURE_METADATA) {
        let rawValue = metrics[feature.name];
        
        if (rawValue === null || rawValue === undefined || isNaN(rawValue)) {
            missingFeatures.push(feature.name);
            if (feature.required) {
                hasMissingCritical = true;
            }
            rawValue = 0; // Zero imputation for optional/missing values (meaning negligible risk/priority/count)
        }

        let normalized = (rawValue - feature.norm.min) / (feature.norm.max - feature.norm.min);
        
        normalized = Math.max(0, Math.min(1, normalized)); // Clip to [0, 1]
        
        vector.push(normalized);
    }

    return {
        vector,
        missingFeatures,
        hasMissingCritical,
        version: VERSION
    };
}

module.exports = {
    VERSION,
    FEATURE_METADATA,
    encodeState
};
