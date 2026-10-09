class EvidenceService {
    /**
     * Builds structured evidence for a DQN decision without conflating Q-values with probabilities.
     */
    static buildDQNEvidence(qValues, selectedActionId, actionCatalog, modelMetadata, dataHealthSnapshot, safetyResult) {
        const selectedActionObj = actionCatalog.find(a => a.id === selectedActionId) || { name: 'Unknown' };
        
        return {
            MODEL_INFORMATION: {
                modelVersion: modelMetadata.modelVersion || 'unknown',
                modelStatus: modelMetadata.status || 'UNAVAILABLE',
                trainingDataCount: dataHealthSnapshot ? dataHealthSnapshot.summary.eligibleTransitions : 0
            },
            MODEL_OUTPUT: {
                selectedActionId: selectedActionId,
                selectedActionName: selectedActionObj.name,
                qValue: qValues[selectedActionId] !== undefined ? qValues[selectedActionId] : null,
                actionMaskApplied: true
            },
            DATA_EVIDENCE: {
                sampleSize: dataHealthSnapshot ? dataHealthSnapshot.summary.eligibleTransitions : 0,
                coverageDays: dataHealthSnapshot ? dataHealthSnapshot.temporalCoverage.coverageDays : 0,
                dataQuality: dataHealthSnapshot ? dataHealthSnapshot.readiness : 'UNKNOWN'
            },
            SAFETY_EVIDENCE: {
                constraintsChecked: true,
                constraintsPassed: safetyResult.allowed,
                constraintsFailed: !safetyResult.allowed ? safetyResult.reasons : []
            },
            GOVERNANCE: {
                policyVersion: modelMetadata.policyVersion || 'none',
                policyStatus: modelMetadata.policyStatus || 'none'
            }
        };
    }

    /**
     * Builds structured evidence for a Deterministic strategy decision.
     */
    static buildDeterministicEvidence(candidate, ruleVersion, safetyResult) {
        return {
            MODEL_INFORMATION: {
                modelVersion: ruleVersion,
                modelStatus: 'ACTIVE',
                trainingDataCount: 'N/A (Rule-based)'
            },
            MODEL_OUTPUT: {
                selectedActionName: candidate.intervention,
                selectedActionType: candidate.interventionType,
                optimizationScore: candidate.optimizationScore,
                rationale: candidate.evidence // The textual rules that fired
            },
            DATA_EVIDENCE: {
                sampleSize: 'N/A',
                coverageDays: 'N/A',
                dataQuality: 'N/A'
            },
            SAFETY_EVIDENCE: {
                constraintsChecked: true,
                constraintsPassed: safetyResult.allowed,
                constraintsFailed: !safetyResult.allowed ? safetyResult.reasons : []
            },
            GOVERNANCE: {
                policyVersion: 'N/A',
                policyStatus: 'ACTIVE'
            }
        };
    }
}

module.exports = EvidenceService;
