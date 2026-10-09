const rlDataService = require('../../services/rlDataService');
const stateEncoder = require('./stateEncoder');
const actionEncoder = require('./actionEncoder');

async function buildRLDataset() {
    const rawRecords = await rlDataService.extractRealTransitions();
    const transitions = [];

    for (const record of rawRecords) {
        try {
            // Encode State
            const stateInfo = stateEncoder.encodeState(record);
            const stateVector = stateInfo.vector;
            
            // Encode Action
            const actionId = actionEncoder.encodeAction(record.interventionType);
            
            // We fake next state by treating afterMetrics identically to beforeMetrics through the encoder
            // This is ONLY for encoding shape, not for feature provenance leakage.
            // We mock a record object with beforeMetrics = record.afterMetrics just to use the encoder.
            const nextStateInfo = stateEncoder.encodeState({ beforeMetrics: record.afterMetrics });
            const nextStateVector = nextStateInfo.vector;

            // Generate Action Mask
            // RL needs to know what actions were valid at that exact time. We use the resources that were actually available.
            // If historical global resource bounds were not explicitly saved, we do not invent them.
            // We pass the historically known bounds (which might just be the resources used if total bounds are absent).
            // We do NOT use DEFAULT_SIMULATION_RESOURCES here.
            // In Sprint 7, `record.resources` typically stores what was USED, not what was AVAILABLE globally.
            // Thus, global historical availability is likely UNKNOWN.
            const actionInfo = actionEncoder.generateActionMask(record.category, null);

            // Determine "Done"
            // Since we don't have linked multi-step episodes, each intervention is treated as a terminal transition
            // for the purposes of offline learning (or gamma = 0).
            const done = true;

            transitions.push({
                transitionId: record._id,
                issueId: record.issueId,
                timestamp: record.evaluatedAt || record.executedAt,
                
                state: stateVector,
                action: actionId,
                reward: record.reward.value,
                nextState: nextStateVector,
                done: done,

                // Meta features
                category: record.category,
                department: record.department,
                actionMask: actionInfo.mask,
                resourceAvailabilityStatus: actionInfo.resourceAvailabilityStatus,
                resourcesUsed: record.resources,
                hasMissingCritical: stateInfo.hasMissingCritical,
                missingFeatures: stateInfo.missingFeatures
            });
        } catch (error) {
            console.error(`Skipping invalid transition ${record._id}:`, error.message);
        }
    }

    return {
        success: true,
        datasetVersion: "v1",
        stateEncoderVersion: stateEncoder.VERSION,
        actionEncoderVersion: actionEncoder.VERSION,
        totalEligibleTransitions: transitions.length,
        doneSemantics: "Each evaluated intervention is represented as one historical terminal transition (done=true).",
        transitions: transitions
    };
}

module.exports = {
    buildRLDataset
};
