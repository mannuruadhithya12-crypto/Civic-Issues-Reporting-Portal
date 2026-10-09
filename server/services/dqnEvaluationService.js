const tf = require('@tensorflow/tfjs');
const datasetBuilder = require('../ml/reinforcementLearning/datasetBuilder');
const { ACTION_CATALOG } = require('../ml/reinforcementLearning/actionEncoder');
const STATE_SPECIFICATION = require('../ml/reinforcementLearning/stateSpecification');
const RLModel = require('../models/RLModel');
const { selectAction } = require('../ml/reinforcementLearning/dqn/actionSelector');

async function evaluatePolicy(modelVersion) {
    const rlModel = await RLModel.findOne({ modelVersion });
    if (!rlModel) {
        throw new Error('MODEL_NOT_FOUND');
    }

    if (rlModel.stateVersion !== 'state-v1' || rlModel.actionVersion !== 'action-v1') {
        throw new Error('MODEL_VERSION_MISMATCH');
    }

    const runRecordId = rlModel.trainingRunId;
    const modelPath = (await require('../models/RLTrainingRun').findById(runRecordId)).modelPath;

    if (!modelPath) {
        throw new Error('MODEL_PATH_NOT_FOUND');
    }

    // Load Model
    const network = await tf.loadLayersModel(`file://${modelPath}/model.json`);

    // Fetch genuine data
    const dataset = await datasetBuilder.buildRLDataset();
    const transitions = dataset.transitions;
    
    const results = {
        evaluationTransitions: 0,
        actionAgreementRate: 0,
        averageHistoricalReward: 0,
        averageRewardForDQNAction: 0, // only when matched
        invalidActionRate: 0,
        maskedActionRate: 0,
        noValidActionCount: 0,
        actionDistribution: {},
        perCategoryDistribution: {},
        perDepartmentDistribution: {},
        resourceViolations: 0,
        observedRewardCoverage: 0
    };

    let agreements = 0;
    let validActionCount = 0;
    let totalHistoricalReward = 0;
    let totalDQNRewardMatch = 0;
    let matchCount = 0;

    for (const t of transitions) {
        if (!t.state || t.action === undefined) continue;

        results.evaluationTransitions++;
        totalHistoricalReward += (t.reward || 0);

        // Run DQN prediction
        const actionMask = t.actionMask || new Array(ACTION_CATALOG.length).fill(1);
        
        let recommendedActionId = null;
        let reason = null;

        tf.tidy(() => {
            const stateTensor = tf.tensor2d([t.state], [1, STATE_SPECIFICATION.dimension]);
            const qValues = network.predict(stateTensor).squeeze();
            const selection = selectAction(qValues, actionMask, 0); // Epsilon = 0
            recommendedActionId = selection.recommendedActionId;
            reason = selection.reason;
        });

        if (reason === "NO_VALID_ACTION" || recommendedActionId === null) {
            results.noValidActionCount++;
            continue;
        }
        
        validActionCount++;

        // Calculate distribution
        const actionName = ACTION_CATALOG[recommendedActionId].name;
        results.actionDistribution[actionName] = (results.actionDistribution[actionName] || 0) + 1;

        if (t.category) {
            if (!results.perCategoryDistribution[t.category]) results.perCategoryDistribution[t.category] = {};
            results.perCategoryDistribution[t.category][actionName] = (results.perCategoryDistribution[t.category][actionName] || 0) + 1;
        }

        if (t.department) {
            if (!results.perDepartmentDistribution[t.department]) results.perDepartmentDistribution[t.department] = {};
            results.perDepartmentDistribution[t.department][actionName] = (results.perDepartmentDistribution[t.department][actionName] || 0) + 1;
        }

        // Compare with historical
        if (recommendedActionId === t.action) {
            agreements++;
            matchCount++;
            totalDQNRewardMatch += (t.reward || 0);
        } else {
            // Check if DQN action had any counterfactual evidence. We don't invent reward!
            // In a real system, you'd look up if there's any identical state+action pair in history.
            // For now, reward coverage is only valid if it matches the historical action exactly.
        }
    }

    if (results.evaluationTransitions > 0) {
        results.actionAgreementRate = agreements / results.evaluationTransitions;
        results.averageHistoricalReward = totalHistoricalReward / results.evaluationTransitions;
    }

    if (matchCount > 0) {
        results.averageRewardForDQNAction = totalDQNRewardMatch / matchCount;
        results.observedRewardCoverage = matchCount / results.evaluationTransitions;
    } else {
        results.averageRewardForDQNAction = "UNKNOWN";
        results.observedRewardCoverage = 0;
    }

    return results;
}

module.exports = {
    evaluatePolicy
};
