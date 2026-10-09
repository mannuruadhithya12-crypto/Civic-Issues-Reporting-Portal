// server/controllers/adaptiveController.js
const AdaptiveStateService = require('../services/adaptiveStateService');
const AdaptiveDecisionEngine = require('../services/adaptiveDecisionEngine');
const ChampionChallengerService = require('../services/championChallengerService');
const AdaptivePolicy = require('../models/AdaptivePolicy');
const DecisionRecord = require('../models/DecisionRecord');
const Issue = require('../models/Issue');
const { logAudit } = require('../services/auditService');
const workloadService = require('../services/workloadService');
const clusteringService = require('../services/clusteringService');
const { evaluateSafety } = require('../services/safetyConstraintEngine');
const { generateEvidenceRecord } = require('../services/evidenceService');
const { emitDomainEvent } = require('../events/eventEmitter');

/**
 * 9.1 Authoritative Unified Civic State Generation
 */
exports.getCivicState = async (req, res) => {
    try {
        const { issueId } = req.params;
        let issue = null;
        if (issueId && issueId !== 'global') {
            issue = await Issue.findById(issueId);
        }

        const openIssues = await Issue.countDocuments({
            status: { $in: ['reported', 'verified', 'assigned', 'in_progress', 'reopened'] }
        });

        const workloads = await workloadService.getDepartmentWorkload({});
        const avgWorkload = workloads.length > 0 
            ? Math.round(workloads.reduce((acc, w) => acc + (w.workloadPercentage || 0), 0) / workloads.length)
            : 50;

        const { hotspots } = await clusteringService.getHotspots({});
        const recurring = await clusteringService.getRecurringIssues({});

        const realContext = {
            predictedRisk: issue ? (issue.priority === 'urgent' ? 90 : issue.priority === 'high' ? 70 : 40) : 50,
            openIssues,
            recurringCount: issue ? (issue.recurrenceCount || recurring.length) : recurring.length,
            hotspotLevel: hotspots.length > 0 ? 3 : 1,
            departmentWorkload: avgWorkload
        };

        const state = AdaptiveStateService.buildState(issue || { _id: 'global', category: 'General' }, realContext, 'state-v2');

        res.json({ success: true, state });
    } catch (err) {
        console.error("Error building civic state:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Get all Decision Records
 */
exports.getDecisions = async (req, res) => {
    try {
        const decisions = await DecisionRecord.find().sort({ createdAt: -1 }).limit(100);
        res.json({ success: true, decisions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * 9.2 Strategies
 */
exports.getAvailableStrategies = async (req, res) => {
    try {
        const strategies = await AdaptiveDecisionEngine.getAvailableStrategies();
        res.json({ success: true, strategies });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * 9.2/9.3/9.4 Adaptive Decision Generation
 */
exports.getDecision = async (req, res) => {
    try {
        const strategyId = req.query.strategyId || 'DETERMINISTIC';
        const availableResources = req.body.resources || {}; 
        
        const decision = await AdaptiveDecisionEngine.makeDecision(req.params.issueId, strategyId, availableResources);
        res.json({ success: true, decision });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Champion / Challenger Shadow Mode Evaluation
 */
exports.getChampionChallenger = async (req, res) => {
    try {
        const activeChampion = await AdaptivePolicy.findOne({ status: 'ACTIVE' }) || { strategyId: 'DETERMINISTIC_STRATEGY', policyId: 'CHAMPION_DEFAULT' };
        const shadowChallenger = await AdaptivePolicy.findOne({ status: 'SHADOW' }) || { strategyId: 'DQN_STRATEGY', policyId: 'CHALLENGER_DEFAULT' };

        res.json({
            success: true,
            champion: {
                status: 'ACTIVE',
                policy: activeChampion
            },
            challenger: {
                status: 'SHADOW',
                policy: shadowChallenger,
                influencesProduction: false
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Compare Champion and Challenger for an issue
 */
exports.compareStrategies = async (req, res) => {
    try {
        const availableResources = req.body.resources || {}; 
        const comparison = await ChampionChallengerService.compareStrategies(req.params.issueId, availableResources);
        res.json({ success: true, comparison });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Evidence Generation & Records
 */
exports.getEvidence = async (req, res) => {
    try {
        const decisions = await DecisionRecord.find().sort({ createdAt: -1 }).limit(20);
        const evidenceList = decisions.map(d => ({
            decisionId: d.decisionId || d._id,
            evidence: d.evidenceRecord || null,
            createdAt: d.createdAt
        }));

        res.json({ success: true, evidence: evidenceList });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Safety Constraints Check
 */
exports.getSafety = async (req, res) => {
    try {
        const sampleCandidate = {
            candidateId: 'SAFETY_CHECK',
            actionType: 'RESOURCE_DISPATCH',
            cost: 500,
            workersRequired: 2
        };
        const sampleState = {
            workloadScore: 50
        };

        const safetyResult = evaluateSafety(sampleCandidate, sampleState, {});
        res.json({ success: true, safetyEngineStatus: 'ACTIVE', sampleCheck: safetyResult });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Governance - List Policies
 */
exports.getPolicies = async (req, res) => {
    try {
        const policies = await AdaptivePolicy.find().sort({ createdAt: -1 });
        res.json({ success: true, policies });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Governance - Get Policy by ID
 */
exports.getPolicyById = async (req, res) => {
    try {
        const policy = await AdaptivePolicy.findById(req.params.id);
        if (!policy) return res.status(404).json({ success: false, message: "Policy not found" });
        res.json({ success: true, policy });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Governance - Create DRAFT Policy
 */
exports.createPolicy = async (req, res) => {
    try {
        const { policyId, policyVersion, strategyId, stateVersion, actionVersion, modelId, modelType } = req.body;
        
        const existing = await AdaptivePolicy.findOne({ policyId });
        if (existing) {
            return res.status(400).json({ success: false, message: "Policy ID already exists" });
        }

        const policy = new AdaptivePolicy({
            policyId,
            policyVersion: policyVersion || '1.0.0',
            strategyId: strategyId || 'DETERMINISTIC',
            stateVersion: stateVersion || 'state-v1',
            actionVersion: actionVersion || 'action-v1',
            modelId: modelId || null,
            modelType: modelType || 'NONE',
            status: 'DRAFT',
            createdBy: req.user ? req.user.id : null
        });

        await policy.save();

        await logAudit({
            req,
            action: 'POLICY_CREATE',
            targetType: 'AdaptivePolicy',
            targetId: policy._id,
            targetLabel: `${policy.policyId} (${policy.strategyId})`,
            details: { strategyId, modelType, policyVersion }
        });

        res.json({ success: true, policy });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Helper to transition policy with lifecycle validation
 */
const handlePolicyTransition = async (policy, targetStatus, req) => {
    const validTransitions = {
        'DRAFT': ['VALIDATING', 'REJECTED'],
        'VALIDATING': ['SHADOW', 'REJECTED'],
        'SHADOW': ['APPROVED', 'REJECTED'],
        'APPROVED': ['ACTIVE', 'REJECTED'],
        'ACTIVE': ['RETIRED'],
        'RETIRED': [],
        'REJECTED': []
    };

    if (!validTransitions[policy.status].includes(targetStatus)) {
        throw new Error(`Invalid policy transition from ${policy.status} to ${targetStatus}. Allowed: ${validTransitions[policy.status].join(', ')}`);
    }

    const oldStatus = policy.status;
    policy.status = targetStatus;

    if (targetStatus === 'APPROVED') {
        policy.approvedAt = new Date();
        policy.approvedBy = req.user ? req.user.id : null;
    } else if (targetStatus === 'ACTIVE') {
        await AdaptivePolicy.updateMany(
            { strategyId: policy.strategyId, status: 'ACTIVE' },
            { $set: { status: 'RETIRED', retiredAt: new Date() } }
        );
        policy.activatedAt = new Date();
    } else if (targetStatus === 'RETIRED') {
        policy.retiredAt = new Date();
    }

    await policy.save();

    await logAudit({
        req,
        action: 'POLICY_TRANSITION',
        targetType: 'AdaptivePolicy',
        targetId: policy._id,
        targetLabel: `${policy.policyId} (${policy.strategyId})`,
        details: { oldStatus, newStatus: targetStatus }
    });

    await emitDomainEvent('POLICY_CHANGED', {
        title: `Policy Transitioned to ${targetStatus}`,
        message: `Policy ${policy.policyId} transitioned from ${oldStatus} to ${targetStatus}`,
        targetId: policy._id,
        targetType: 'AdaptivePolicy'
    }, req);

    return policy;
};

exports.validatePolicy = async (req, res) => {
    try {
        const policy = await AdaptivePolicy.findById(req.params.id);
        if (!policy) return res.status(404).json({ message: "Policy not found" });

        const updated = await handlePolicyTransition(policy, 'VALIDATING', req);
        res.json({ success: true, policy: updated });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.approvePolicy = async (req, res) => {
    try {
        const policy = await AdaptivePolicy.findById(req.params.id);
        if (!policy) return res.status(404).json({ message: "Policy not found" });

        const updated = await handlePolicyTransition(policy, 'APPROVED', req);
        res.json({ success: true, policy: updated });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.activatePolicy = async (req, res) => {
    try {
        const policy = await AdaptivePolicy.findById(req.params.id);
        if (!policy) return res.status(404).json({ message: "Policy not found" });

        const updated = await handlePolicyTransition(policy, 'ACTIVE', req);
        res.json({ success: true, policy: updated });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.retirePolicy = async (req, res) => {
    try {
        const policy = await AdaptivePolicy.findById(req.params.id);
        if (!policy) return res.status(404).json({ message: "Policy not found" });

        const updated = await handlePolicyTransition(policy, 'RETIRED', req);
        res.json({ success: true, policy: updated });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.transitionPolicy = async (req, res) => {
    try {
        const { id, targetStatus } = req.params;
        const policy = await AdaptivePolicy.findById(id);
        if (!policy) return res.status(404).json({ message: "Policy not found" });

        const updated = await handlePolicyTransition(policy, targetStatus, req);
        res.json({ success: true, policy: updated });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
