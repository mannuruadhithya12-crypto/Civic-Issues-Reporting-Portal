const AdaptiveDecisionEngine = require('./adaptiveDecisionEngine');

class ChampionChallengerService {
    /**
     * Compares the Current Policy (Deterministic) vs Candidate Policy (DQN) in shadow mode.
     * @param {String} issueId - The issue to evaluate on
     * @param {Object} availableResources - Global resources
     * @returns {Object} Comparison result
     */
    static async compareStrategies(issueId, availableResources = {}) {
        // We know DETERMINISTIC is our current reliable baseline (Champion)
        const currentPolicyDecision = await AdaptiveDecisionEngine.makeDecision(issueId, 'DETERMINISTIC', availableResources);
        
        let candidatePolicyDecision = null;
        let comparisonStatus = 'CANDIDATE_UNAVAILABLE';
        
        // Check if DQN is available (Candidate)
        const strategies = await AdaptiveDecisionEngine.getAvailableStrategies();
        const dqnStrat = strategies.find(s => s.id === 'DQN');
        
        if (dqnStrat && dqnStrat.status === 'AVAILABLE') {
            try {
                // Generate a candidate decision (Shadow Mode execution)
                candidatePolicyDecision = await AdaptiveDecisionEngine.makeDecision(issueId, 'DQN', availableResources);
                comparisonStatus = 'COMPARISON_COMPLETE';
            } catch (err) {
                console.error("Failed to generate candidate decision for comparison", err);
                comparisonStatus = 'CANDIDATE_FAILED';
            }
        }

        const result = {
            executionAllowed: false, // SHADOW MODE IS ALWAYS READ-ONLY
            shadowOnly: true,
            status: comparisonStatus,
            currentPolicy: {
                strategyId: 'DETERMINISTIC',
                recommendation: currentPolicyDecision.recommendation,
                safetyStatus: currentPolicyDecision.safetyResult.status
            },
            candidatePolicy: candidatePolicyDecision ? {
                strategyId: 'DQN',
                modelStatus: candidatePolicyDecision.evidence.MODEL_INFORMATION.modelStatus,
                recommendation: candidatePolicyDecision.recommendation,
                safetyStatus: candidatePolicyDecision.safetyResult.status
            } : null,
            metrics: null,
            recommendation: 'REVIEW_REQUIRED'
        };

        if (comparisonStatus === 'COMPARISON_COMPLETE') {
            // Compute comparison metrics
            const currentRec = currentPolicyDecision.recommendation;
            const candidateRec = candidatePolicyDecision.recommendation;
            
            const actionAgreement = currentRec.actionType === candidateRec.actionType;
            const currentSafe = currentPolicyDecision.safetyResult.allowed;
            const candidateSafe = candidatePolicyDecision.safetyResult.allowed;

            result.metrics = {
                sampleSize: candidatePolicyDecision.evidence.DATA_EVIDENCE.sampleSize,
                actionAgreement,
                currentConstraintViolations: currentSafe ? 0 : currentPolicyDecision.safetyResult.reasons.length,
                candidateConstraintViolations: candidateSafe ? 0 : candidatePolicyDecision.safetyResult.reasons.length,
                safetyBlocks: {
                    current: !currentSafe,
                    candidate: !candidateSafe
                },
                executionCoverage: 'N/A (Shadow)',
                evaluationCoverage: 'N/A (Shadow)'
            };
        }

        return result;
    }
}

module.exports = ChampionChallengerService;
