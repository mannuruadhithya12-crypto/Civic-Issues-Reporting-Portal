const AdaptiveStateService = require('./adaptiveStateService');
const SafetyConstraintEngine = require('./safetyConstraintEngine');
const EvidenceService = require('./evidenceService');
const { generateScoredCandidates } = require('./optimizationService');
const AdaptivePolicy = require('../models/AdaptivePolicy');
const DecisionRecord = require('../models/DecisionRecord');
const Issue = require('../models/Issue');
const DQNAgent = require('../ml/reinforcementLearning/dqn/dqnAgent');
const actionEncoder = require('../ml/reinforcementLearning/actionEncoder');
const { evaluateDataHealth } = require('./rlDataQualityService');
const RLModel = require('../models/RLModel');

class AdaptiveDecisionEngine {
    
    /**
     * Determines what strategies are currently available.
     * Deterministic is always available. DQN is available only if there is an ACTIVE policy for it.
     */
    static async getAvailableStrategies() {
        const strategies = [
            { id: 'DETERMINISTIC', status: 'AVAILABLE' }
        ];

        const activeDqnPolicy = await AdaptivePolicy.findOne({ strategyId: 'DQN', status: 'ACTIVE' }).sort({ createdAt: -1 });
        
        if (activeDqnPolicy) {
            const activeModel = await RLModel.findOne({ status: 'ACTIVE' });
            if (activeModel) {
                strategies.push({ id: 'DQN', status: 'AVAILABLE', policy: activeDqnPolicy });
            } else {
                strategies.push({ id: 'DQN', status: 'UNAVAILABLE', reason: 'ACTIVE policy found, but trained model artifact is pending.' });
            }
        } else {
            strategies.push({ id: 'DQN', status: 'UNAVAILABLE', reason: 'No ACTIVE DQN policy found.' });
        }

        return strategies;
    }

    /**
     * Makes a decision for a specific issue using the specified strategy.
     * Falls back to DETERMINISTIC if DQN is requested but unavailable.
     */
    static async makeDecision(issueId, strategyId = 'DETERMINISTIC', availableResources = {}) {
        const issue = await Issue.findById(issueId);
        if (!issue) throw new Error("Issue not found");

        const availableStrats = await this.getAvailableStrategies();
        let targetStrategy = availableStrats.find(s => s.id === strategyId);

        // Fallback safety
        if (!targetStrategy || targetStrategy.status !== 'AVAILABLE') {
            console.warn(`Strategy ${strategyId} is unavailable. Falling back to DETERMINISTIC.`);
            strategyId = 'DETERMINISTIC';
            targetStrategy = availableStrats.find(s => s.id === 'DETERMINISTIC');
        }

        // 1. Build Unified Civic State
        const civicState = AdaptiveStateService.buildState(issue, {}, 'state-v2');

        let recommendation = null;
        let evidence = null;
        let safetyResult = null;
        let policyId = null;
        let policyVersion = null;
        let modelId = null;
        let modelVersion = null;
        
        // 2. Execute Strategy
        if (strategyId === 'DETERMINISTIC') {
            const candidates = await generateScoredCandidates(); // Note: this gets all issues, we filter for this one
            const issueCandidates = candidates.filter(c => c.issueId.toString() === issueId.toString());
            
            if (issueCandidates.length > 0) {
                const bestCandidate = issueCandidates[0]; // Already sorted by optimizationScore
                recommendation = {
                    actionType: bestCandidate.interventionType,
                    actionName: bestCandidate.intervention,
                    expectedImpact: bestCandidate.expectedImpact,
                    cost: bestCandidate.cost,
                    workers: bestCandidate.workers,
                    vehicles: bestCandidate.vehicles,
                    hours: bestCandidate.hours
                };

                safetyResult = SafetyConstraintEngine.validateAction(
                    { type: recommendation.actionType, workers: recommendation.workers, vehicles: recommendation.vehicles, estimatedCost: recommendation.cost, hours: recommendation.hours },
                    issue.category,
                    availableResources
                );

                evidence = EvidenceService.buildDeterministicEvidence(bestCandidate, "rule-v1", safetyResult);
                policyVersion = "rule-v1";
            }
        } else if (strategyId === 'DQN') {
            const activePolicy = targetStrategy.policy;
            policyId = activePolicy._id;
            policyVersion = activePolicy.policyVersion;
            modelId = activePolicy.modelId;
            modelVersion = activePolicy.modelVersion;

            // Generate Action Mask for this specific situation
            const actionInfo = actionEncoder.generateActionMask(issue.category, availableResources);
            
            // Get prediction from DQN
            let prediction;
            try {
                const agent = new DQNAgent(7, actionEncoder.ACTION_CATALOG.length);
                const actResult = agent.act(civicState.stateV1.vector, actionInfo.mask, false);
                prediction = {
                    actionId: actResult.recommendedActionId ?? 0,
                    qValues: actResult.qValues ? (actResult.qValues.dataSync ? Array.from(actResult.qValues.dataSync()) : actResult.qValues) : new Array(actionEncoder.ACTION_CATALOG.length).fill(0.5)
                };
            } catch (pErr) {
                console.warn('DQN prediction fallback:', pErr.message);
                const validActions = actionInfo.mask.map((m, idx) => m === 1 ? idx : null).filter(x => x !== null);
                prediction = {
                    actionId: validActions.length > 0 ? validActions[0] : 0,
                    qValues: new Array(actionEncoder.ACTION_CATALOG.length).fill(0.5)
                };
            }
            
            const selectedActionObj = actionEncoder.ACTION_CATALOG.find(a => a.id === prediction.actionId);
            
            recommendation = {
                actionId: prediction.actionId,
                actionType: selectedActionObj.type,
                actionName: selectedActionObj.name,
                cost: selectedActionObj.estimatedCost,
                workers: selectedActionObj.workers,
                vehicles: selectedActionObj.vehicles,
                hours: selectedActionObj.hours
            };

            safetyResult = SafetyConstraintEngine.validateAction(
                { type: recommendation.actionType, workers: recommendation.workers, vehicles: recommendation.vehicles, estimatedCost: recommendation.cost, hours: recommendation.hours },
                issue.category,
                availableResources
            );

            const dataHealth = await evaluateDataHealth();

            evidence = EvidenceService.buildDQNEvidence(
                prediction.qValues,
                prediction.actionId,
                actionEncoder.ACTION_CATALOG,
                { modelVersion, status: 'ACTIVE', policyVersion, policyStatus: 'ACTIVE' },
                dataHealth,
                safetyResult
            );
        }

        if (!recommendation) {
            throw new Error("No recommendation could be generated for this issue.");
        }

        // 3. Create Traceable Decision Record
        const decisionRecord = new DecisionRecord({
            issueId,
            stateVersion: civicState.version,
            stateSnapshot: civicState,
            strategyId,
            strategyVersion: policyVersion || 'v1',
            policyId,
            policyVersion,
            modelId,
            modelType: strategyId === 'DQN' ? 'DQN' : 'NONE',
            modelVersion,
            recommendation,
            evidence,
            safetyValidation: safetyResult,
            constraints: availableResources,
            approvalRequired: true // Always required for adaptive decisions
        });

        await decisionRecord.save();

        return {
            decisionRecordId: decisionRecord._id,
            civicState,
            strategyId,
            recommendation,
            safetyResult,
            evidence,
            approvalRequired: decisionRecord.approvalRequired
        };
    }
}

module.exports = AdaptiveDecisionEngine;
