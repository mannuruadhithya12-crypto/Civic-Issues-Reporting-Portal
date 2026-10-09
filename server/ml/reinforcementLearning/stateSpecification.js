const stateEncoder = require('./stateEncoder');

const STATE_SPECIFICATION = {
    version: stateEncoder.VERSION,
    dimension: stateEncoder.FEATURE_METADATA.length,
    features: stateEncoder.FEATURE_METADATA.map((f, index) => ({
        index: index,
        name: f.name,
        source: `beforeMetrics.${f.name}`,
        sourceFile: "server/services/interventionEvaluationService.js & server/models/InterventionOutcome.js",
        type: "continuous",
        normalized: true,
        normalizationParams: f.norm,
        missingValueStrategy: f.required ? "INVALID_IF_MISSING" : "ZERO_IMPUTATION_WITH_FLAG",
        missingValueReason: f.required ? null : "For scores like priority/risk, missing historically means zero/negligible at the time of evaluation.",
        preAction: f.preAction,
        postAction: false,
        futureDerived: false,
        leaked: f.leaked,
        reason: "Values explicitly snapshotted at time of intervention approval BEFORE execution."
    }))
};

module.exports = STATE_SPECIFICATION;
