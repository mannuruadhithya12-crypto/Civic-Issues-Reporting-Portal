// server/controllers/rlController.js
const { buildRLDataset } = require('../ml/reinforcementLearning/datasetBuilder');
const { evaluateDataHealth } = require('../services/rlDataQualityService');
const dqnTrainingService = require('../services/dqnTrainingService');
const dqnEvaluationService = require('../services/dqnEvaluationService');
const RLTrainingRun = require('../models/RLTrainingRun');
const RLModel = require('../models/RLModel');
const InterventionOutcome = require('../models/InterventionOutcome');
const Issue = require('../models/Issue');
const STATE_SPECIFICATION = require('../ml/reinforcementLearning/stateSpecification');
const { ACTION_CATALOG, generateActionMask } = require('../ml/reinforcementLearning/actionEncoder');
const { encodeState } = require('../ml/reinforcementLearning/stateEncoder');
const { selectAction } = require('../ml/reinforcementLearning/dqn/actionSelector');
const { getOptimizationPlan } = require('../services/optimizationService');
const tf = require('@tensorflow/tfjs');

/**
 * RL Health & Readiness Evaluator
 */
exports.getHealth = async (req, res) => {
    try {
        const report = await evaluateDataHealth();
        const activeModel = await RLModel.findOne({ status: 'VALIDATED' });

        const requiredTransitions = report.datasetPolicy?.minTransitionsThreshold || 50;
        const eligibleCount = report.trainingEligibleTransitions || 0;
        const isDataReady = eligibleCount >= requiredTransitions;
        const modelAvailable = Boolean(activeModel);

        let status = 'INSUFFICIENT_DATA';
        if (!isDataReady) {
            status = 'INSUFFICIENT_DATA';
        } else if (!modelAvailable) {
            status = 'NO_MODEL';
        } else {
            status = 'READY';
        }

        res.json({
            status,
            trainingEligibleTransitions: eligibleCount,
            totalTransitions: report.totalTransitions || 0,
            requiredTransitions,
            modelAvailable,
            trainingAllowed: isDataReady,
            inferenceAllowed: modelAvailable && isDataReady,
            dataHealthReport: report
        });
    } catch (err) {
        console.error("Error evaluating RL health:", err);
        res.status(500).json({ success: false, message: "Server error evaluating RL health" });
    }
};

exports.getDataset = async (req, res) => {
    try {
        const dataset = await buildRLDataset();
        res.json(dataset);
    } catch (err) {
        console.error("Error building RL dataset:", err);
        res.status(500).json({ success: false, message: "Server error building RL dataset" });
    }
};

exports.getTransitions = async (req, res) => {
    try {
        const transitions = await InterventionOutcome.find({
            status: 'EVALUATED'
        }).sort({ evaluatedAt: -1 }).limit(100);

        res.json({
            count: transitions.length,
            transitions: transitions.map(t => ({
                id: t._id,
                issueId: t.issueId,
                category: t.category,
                interventionType: t.interventionType,
                evaluationSource: t.evaluationSource,
                trainingEligible: t.trainingEligible,
                beforeMetrics: t.beforeMetrics,
                afterMetrics: t.afterMetrics,
                reward: t.reward,
                executedAt: t.executedAt,
                evaluatedAt: t.evaluatedAt
            }))
        });
    } catch (err) {
        console.error("Error fetching RL transitions:", err);
        res.status(500).json({ success: false, message: "Server error fetching transitions" });
    }
};

exports.getRewards = async (req, res) => {
    try {
        const evaluated = await InterventionOutcome.find({
            status: 'EVALUATED',
            reward: { $exists: true }
        });

        const rewardDistribution = evaluated.map(e => ({
            id: e._id,
            category: e.category,
            rewardValue: e.reward?.value || 0,
            riskReduction: e.reward?.riskReduction || 0,
            slaImprovement: e.reward?.slaImprovement || 0,
            issueReduction: e.reward?.issueReduction || 0
        }));

        res.json({
            count: rewardDistribution.length,
            rewards: rewardDistribution
        });
    } catch (err) {
        console.error("Error fetching RL rewards:", err);
        res.status(500).json({ success: false, message: "Server error fetching rewards" });
    }
};

exports.getModels = async (req, res) => {
    try {
        const models = await RLModel.find().sort({ createdAt: -1 });
        const activeModel = await RLModel.findOne({ status: 'VALIDATED' });

        res.json({
            activeModel,
            models
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error fetching models" });
    }
};

exports.getTraining = async (req, res) => {
    try {
        const status = dqnTrainingService.getStatus();
        const runs = await RLTrainingRun.find().sort({ createdAt: -1 }).limit(50);
        res.json({
            isTrainingRunning: status.isTrainingRunning,
            runs
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error fetching training info" });
    }
};

exports.getValidation = async (req, res) => {
    try {
        const activeModel = await RLModel.findOne({ status: 'VALIDATED' }) || await RLModel.findOne().sort({ createdAt: -1 });
        if (!activeModel) {
            return res.json({ status: 'NO_MODEL', message: 'No RL model available for validation.' });
        }

        res.json({
            status: activeModel.status,
            modelVersion: activeModel.modelVersion,
            validationMetrics: activeModel.evaluationMetrics || null,
            createdAt: activeModel.createdAt
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error fetching validation data" });
    }
};

exports.getInferenceStatus = async (req, res) => {
    try {
        const report = await evaluateDataHealth();
        const activeModel = await RLModel.findOne({ status: 'VALIDATED' });
        
        const isReady = Boolean(activeModel) && (report.trainingEligibleTransitions >= (report.datasetPolicy?.minTransitionsThreshold || 50));

        res.json({
            inferenceAllowed: isReady,
            status: isReady ? 'READY' : (activeModel ? 'INSUFFICIENT_DATA' : 'NO_MODEL'),
            activeModelVersion: activeModel?.modelVersion || null
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error checking inference status" });
    }
};

exports.trainDQN = async (req, res) => {
    try {
        const { mode } = req.body;
        const adminUserId = req.user ? req.user.id : 'system';

        const health = await evaluateDataHealth();
        const requiredTransitions = health.datasetPolicy?.minTransitionsThreshold || 50;

        if (mode === 'production' && health.trainingEligibleTransitions < requiredTransitions) {
            return res.status(400).json({
                success: false,
                status: 'INSUFFICIENT_DATA',
                message: `Cannot start production training. Eligible transitions: ${health.trainingEligibleTransitions}, Required: ${requiredTransitions}.`
            });
        }
        
        dqnTrainingService.trainDQN(mode || 'production', adminUserId).catch(err => {
            console.error("DQN Training Background Error:", err);
        });
        
        res.json({ success: true, message: "Training initiated asynchronously" });
    } catch (err) {
        if (err.message === 'TRAINING_ALREADY_RUNNING') {
            return res.status(409).json({ success: false, message: 'TRAINING_ALREADY_RUNNING' });
        }
        res.status(500).json({ success: false, message: "Server error initiating training" });
    }
};

exports.evaluateModel = async (req, res) => {
    try {
        const { modelVersion } = req.body;
        const results = await dqnEvaluationService.evaluatePolicy(modelVersion);
        res.json({ success: true, results });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.runInference = async (req, res) => {
    try {
        const { issueId } = req.body;
        if (!issueId) {
            return res.status(400).json({ success: false, message: "issueId is required for RL inference" });
        }
        
        const issue = await Issue.findById(issueId);
        if (!issue) return res.status(404).json({ success: false, message: "Issue not found" });

        const activeModel = await RLModel.findOne({ status: 'VALIDATED' }).sort({ createdAt: -1 });
        if (!activeModel || !activeModel.trainingRunId) {
            return res.json({
                status: "MODEL_UNAVAILABLE",
                issueId,
                inferenceAllowed: false,
                reason: "No validated DQN model exists in model registry.",
                recommendedAction: null,
                qValues: null
            });
        }

        const runRecord = await RLTrainingRun.findById(activeModel.trainingRunId);
        if (!runRecord || !runRecord.modelPath) {
            return res.json({
                status: "MODEL_UNAVAILABLE",
                issueId,
                inferenceAllowed: false,
                reason: "DQN model artifact path not found.",
                recommendedAction: null,
                qValues: null
            });
        }

        const stateVector = encodeState(issue);
        const resourceAvailability = { workers: 10, vehicles: 5, workingHours: 24, budget: 10000 };
        const maskObj = generateActionMask(issue.category, resourceAvailability);

        let recommendedActionId = null;
        let recommendedAction = null;
        let qValuesArray = [];
        
        const network = await tf.loadLayersModel(`file://${runRecord.modelPath}/model.json`);
        
        tf.tidy(() => {
            const stateTensor = tf.tensor2d([stateVector], [1, STATE_SPECIFICATION.dimension]);
            const qValues = network.predict(stateTensor).squeeze();
            qValuesArray = qValues.arraySync();
            const selection = selectAction(qValues, maskObj.mask, 0);
            recommendedActionId = selection.recommendedActionId;
        });

        if (recommendedActionId !== null) {
            recommendedAction = ACTION_CATALOG[recommendedActionId].name;
        }

        res.json({
            status: "READY",
            issueId,
            inferenceAllowed: true,
            modelVersion: activeModel.modelVersion,
            recommendedAction,
            recommendedActionId,
            qValues: qValuesArray,
            actionMask: maskObj.mask,
            stateVector
        });

    } catch (err) {
        console.error("Inference Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.shadowRecommendation = async (req, res) => {
    try {
        const { issueId } = req.body;
        const issue = await Issue.findById(issueId);
        if (!issue) return res.status(404).json({ success: false, message: "Issue not found" });

        const deterministicPlan = await getOptimizationPlan(issueId);

        const activeModel = await RLModel.findOne({ status: 'VALIDATED' }).sort({ createdAt: -1 })
            || await RLModel.findOne({ status: 'PROTOTYPE_ONLY' }).sort({ createdAt: -1 });
        
        if (!activeModel || !activeModel.trainingRunId) {
            return res.json({
                mode: "SHADOW",
                issueId,
                dqn: { available: false, reason: "DQN_UNAVAILABLE" },
                deterministicOptimizer: deterministicPlan,
                executionAllowed: false
            });
        }

        const runRecord = await RLTrainingRun.findById(activeModel.trainingRunId);
        if (!runRecord || !runRecord.modelPath) {
            return res.json({
                mode: "SHADOW",
                issueId,
                dqn: { available: false, reason: "MODEL_PATH_NOT_FOUND" },
                deterministicOptimizer: deterministicPlan,
                executionAllowed: false
            });
        }

        const stateVector = encodeState(issue);
        const resourceAvailability = { workers: 10, vehicles: 5, workingHours: 24, budget: 10000 };
        const maskObj = generateActionMask(issue.category, resourceAvailability);

        let recommendedActionId = null;
        let recommendedAction = null;
        let qValuesArray = [];
        
        const network = await tf.loadLayersModel(`file://${runRecord.modelPath}/model.json`);
        
        tf.tidy(() => {
            const stateTensor = tf.tensor2d([stateVector], [1, STATE_SPECIFICATION.dimension]);
            const qValues = network.predict(stateTensor).squeeze();
            qValuesArray = qValues.arraySync();
            const selection = selectAction(qValues, maskObj.mask, 0);
            recommendedActionId = selection.recommendedActionId;
        });

        if (recommendedActionId !== null) {
            recommendedAction = ACTION_CATALOG[recommendedActionId].name;
        }

        res.json({
            mode: "SHADOW",
            issueId,
            dqn: {
                available: true,
                modelVersion: activeModel.modelVersion,
                recommendedAction,
                recommendedActionId,
                qValues: qValuesArray,
                actionMask: maskObj.mask,
                stateVector
            },
            deterministicOptimizer: deterministicPlan,
            comparison: {
                sameAction: deterministicPlan && deterministicPlan.interventions && deterministicPlan.interventions.length > 0
                    && deterministicPlan.interventions[0].intervention === recommendedAction
            },
            executionAllowed: false
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};
