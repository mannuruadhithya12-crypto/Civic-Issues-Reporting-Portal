const InterventionOutcome = require('../models/InterventionOutcome');
const { buildRLDataset } = require('../ml/reinforcementLearning/datasetBuilder');
const { readiness: THRESHOLDS } = require('../config/reinforcementLearning');
const stateEncoder = require('../ml/reinforcementLearning/stateEncoder');

async function evaluateDataHealth() {
    // 1. Basic Counts
    const totalRecords = await InterventionOutcome.countDocuments();
    const evaluatedRecords = await InterventionOutcome.countDocuments({ status: 'EVALUATED' });
    const liveDataRecords = await InterventionOutcome.countDocuments({ evaluationSource: 'LIVE_DATA' });
    const trainingEligibleRecords = await InterventionOutcome.countDocuments({ trainingEligible: true });

    // 2. Build Dataset
    const datasetData = await buildRLDataset();
    const transitions = datasetData.transitions;

    // 3. Action Diversity
    const uniqueActions = new Set();
    const actionCounts = {};
    transitions.forEach(t => {
        uniqueActions.add(t.action);
        actionCounts[t.action] = (actionCounts[t.action] || 0) + 1;
    });

    // 4. Reward Distribution
    let positiveRewards = 0;
    let negativeRewards = 0;
    let zeroRewards = 0;
    transitions.forEach(t => {
        if (t.reward > 0) positiveRewards++;
        else if (t.reward < 0) negativeRewards++;
        else zeroRewards++;
    });

    // 5. Category & Department Diversity
    const uniqueCategories = new Set();
    const uniqueDepartments = new Set();
    transitions.forEach(t => {
        uniqueCategories.add(t.category);
        uniqueDepartments.add(t.department);
    });

    // 6. Temporal Coverage
    let earliest = null;
    let latest = null;
    const activeDaysSet = new Set();
    transitions.forEach(t => {
        const d = new Date(t.timestamp);
        if (!earliest || d < earliest) earliest = d;
        if (!latest || d > latest) latest = d;
        activeDaysSet.add(d.toISOString().split('T')[0]);
    });
    const coverageDays = earliest && latest ? Math.ceil((latest - earliest) / (1000 * 60 * 60 * 24)) : 0;

    // 7. Missing Values & Invalid numerical values & Duplicates
    let missingCriticalValues = 0;
    let missingFeaturesVsZero = 0;
    const transitionFingerprints = new Set();
    let exactDuplicates = 0;
    let nearDuplicates = 0;
    let resourceViolations = 0;
    let resourceAvailabilityUnknown = 0;
    let consistentTransitions = 0;

    transitions.forEach(t => {
        // Missing checks
        if (t.hasMissingCritical) missingCriticalValues++;
        if (t.missingFeatures && t.missingFeatures.length > 0) missingFeaturesVsZero++;
        
        if (t.state.some(v => v === null || v === undefined || isNaN(v))) missingCriticalValues++;
        if (t.nextState.some(v => v === null || v === undefined || isNaN(v))) missingCriticalValues++;
        if (t.reward === null || t.reward === undefined || isNaN(t.reward)) missingCriticalValues++;

        // Duplicate checks (State + Action)
        const fingerprint = `${t.state.join(',')}|${t.action}`;
        if (transitionFingerprints.has(fingerprint)) {
            nearDuplicates++; // Considered near duplicate if state and action match
            // Check exact duplicate (State + Action + Reward + NextState)
            const exactFingerprint = `${fingerprint}|${t.reward}|${t.nextState.join(',')}`;
            if (transitionFingerprints.has(exactFingerprint)) exactDuplicates++;
            else transitionFingerprints.add(exactFingerprint);
        } else {
            transitionFingerprints.add(fingerprint);
            const exactFingerprint = `${fingerprint}|${t.reward}|${t.nextState.join(',')}`;
            transitionFingerprints.add(exactFingerprint);
        }

        // Resource Availability
        if (t.resourceAvailabilityStatus === "UNKNOWN") {
            resourceAvailabilityUnknown++;
        }

        // Transition consistency (Action must be in mask)
        if (t.actionMask && t.actionMask[t.action] === 0) {
            // The historically chosen action was deemed invalid by our own mask!
            resourceViolations++;
        }
        
        // Consistency: Did the state actually change? (Usually it should for successful interventions)
        if (t.state.join(',') === t.nextState.join(',')) {
            // Unchanged state isn't strictly invalid, but noted
        } else {
            consistentTransitions++;
        }

        // Resource Validation: (Used vs Available)
        if (t.resourcesUsed) {
             if (t.resourcesUsed.workers < 0 || t.resourcesUsed.vehicles < 0 || t.resourcesUsed.hours < 0 || t.resourcesUsed.cost < 0) {
                 resourceViolations++;
             }
        }
    });

    // 8. Leakage Audit
    // Enforced by examining the StateEncoder feature metadata
    let leakageDetected = false;
    const leakageAudit = stateEncoder.FEATURE_METADATA.map(f => {
        if (f.leaked || !f.preAction) leakageDetected = true;
        return {
            name: f.name,
            source: f.source,
            preAction: f.preAction,
            leaked: f.leaked,
            reason: f.reason
        };
    });

    // 10. Readiness Decision
    const reasons = [];
    if (transitions.length < THRESHOLDS.minimumEligibleTransitions) reasons.push(`Only ${transitions.length} eligible transitions (requires ${THRESHOLDS.minimumEligibleTransitions}).`);
    if (uniqueActions.size < THRESHOLDS.minimumUniqueActions) reasons.push(`Only ${uniqueActions.size} unique actions (requires ${THRESHOLDS.minimumUniqueActions}).`);
    if (positiveRewards < THRESHOLDS.minimumPositiveRewards) reasons.push(`Only ${positiveRewards} positive rewards (requires ${THRESHOLDS.minimumPositiveRewards}).`);
    if (negativeRewards < THRESHOLDS.minimumNegativeRewards) reasons.push(`Only ${negativeRewards} negative rewards (requires ${THRESHOLDS.minimumNegativeRewards}).`);
    if (uniqueCategories.size < THRESHOLDS.minimumCategories) reasons.push(`Only ${uniqueCategories.size} categories covered (requires ${THRESHOLDS.minimumCategories}).`);
    if (uniqueDepartments.size < THRESHOLDS.minimumDepartments) reasons.push(`Only ${uniqueDepartments.size} departments covered (requires ${THRESHOLDS.minimumDepartments}).`);
    if (coverageDays < THRESHOLDS.minimumTemporalCoverageDays) reasons.push(`Only ${coverageDays} days of coverage (requires ${THRESHOLDS.minimumTemporalCoverageDays}).`);
    if (leakageDetected) reasons.push(`Feature leakage detected in state encoder.`);
    if (missingCriticalValues > 0) reasons.push(`${missingCriticalValues} missing critical values detected.`);
    
    const isReady = reasons.length === 0;

    return {
        success: true,
        readiness: isReady ? "READY_FOR_RL" : "INSUFFICIENT_DATA",
        summary: {
            totalRecords,
            evaluatedRecords,
            liveDataRecords,
            trainingEligibleRecords,
            eligibleTransitions: transitions.length
        },
        actionDiversity: {
            uniqueActions: uniqueActions.size,
            actionCounts
        },
        rewardDistribution: {
            total: transitions.length,
            positive: positiveRewards,
            negative: negativeRewards,
            zero: zeroRewards
        },
        categoryDiversity: {
            uniqueCategories: uniqueCategories.size
        },
        departmentDiversity: {
            uniqueDepartments: uniqueDepartments.size
        },
        temporalCoverage: {
            earliest,
            latest,
            coverageDays,
            activeDays: activeDaysSet.size
        },
        missingValues: {
            missingCriticalValues,
            missingFeaturesVsZero
        },
        duplicates: {
            exactDuplicates,
            nearDuplicates
        },
        leakageAudit: {
            leakageDetected,
            features: leakageAudit
        },
        resourceQuality: {
            resourceViolations,
            resourceAvailabilityUnknown
        },
        consistency: {
            consistentTransitions,
            passed: consistentTransitions === transitions.length && resourceViolations === 0
        },
        thresholds: THRESHOLDS,
        reasons,
        recommendation: isReady ? "Data foundation is sufficient to proceed to Sprint 8.5 DQN design." : "Do not build/train DQN yet. Collect additional real Sprint 7 intervention outcomes."
    };
}

module.exports = {
    evaluateDataHealth
};
