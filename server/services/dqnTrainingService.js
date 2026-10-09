const path = require('path');
const fs = require('fs');
const RLTrainingRun = require('../models/RLTrainingRun');
const RLModel = require('../models/RLModel');
const DQNAgent = require('../ml/reinforcementLearning/dqn/dqnAgent');
const DQN_CONFIG = require('../ml/reinforcementLearning/dqn/dqnConfig');
const rlDataQualityService = require('./rlDataQualityService');
const datasetBuilder = require('../ml/reinforcementLearning/datasetBuilder');
const { ACTION_CATALOG } = require('../ml/reinforcementLearning/actionEncoder');
const STATE_SPECIFICATION = require('../ml/reinforcementLearning/stateSpecification');

let isTrainingRunning = false;

async function trainDQN(mode = 'production', adminUserId = 'system') {
    if (isTrainingRunning) {
        throw new Error('TRAINING_ALREADY_RUNNING');
    }
    
    isTrainingRunning = true;
    
    // Create initial run record
    const runRecord = new RLTrainingRun({
        version: DQN_CONFIG.VERSION,
        stateVersion: DQN_CONFIG.STATE_VERSION,
        actionVersion: DQN_CONFIG.ACTION_VERSION,
        algorithm: 'DQN',
        mode: mode,
        status: 'VALIDATING_DATA',
        createdBy: adminUserId,
        trainingStartedAt: new Date()
    });
    
    await runRecord.save();
    
    try {
        // 1. Fetch data and analyze health
        const dataset = await datasetBuilder.buildRLDataset();
        const transitions = dataset.transitions;
        const health = await rlDataQualityService.evaluateDataHealth();
        
        runRecord.dataHealthSnapshot = health;
        runRecord.datasetSize = transitions.length;
        runRecord.eligibleTransitions = health.summary ? health.summary.eligibleTransitions : transitions.length;
        
        // 2. Validate Readiness
        if (health.readiness !== 'READY_FOR_RL') {
            if (mode === 'production') {
                runRecord.status = 'INSUFFICIENT_DATA';
                runRecord.reasons = health.reasons || ["Data failed health checks."];
                await runRecord.save();
                isTrainingRunning = false;
                return runRecord;
            } else {
                // In prototype mode, we log but continue
                runRecord.reasons = ["PROTOTYPE MODE: Bypassing health checks.", ...(health.reasons || [])];
            }
        }
        
        runRecord.status = 'TRAINING';
        await runRecord.save();
        
        // 3. Initialize Agent
        const agent = new DQNAgent(STATE_SPECIFICATION.dimension, ACTION_CATALOG.length);
        
        // Populate Replay Buffer
        for (const t of transitions) {
            // Encode state and action vectors
            // Wait, datasetBuilder returns objects with raw vectors. Let's ensure they are valid.
            if (!t.state || t.action === undefined || t.reward === undefined) {
                continue; // Skip invalid
            }
            
            // Assume terminal if nextStateVector is null (Sprint 8.3 env semantics)
            const nextState = t.nextState || new Array(STATE_SPECIFICATION.dimension).fill(0);
            
            agent.storeExperience(
                t.state,
                t.action,
                t.reward,
                nextState,
                t.done,
                t.actionMask,
                t.nextActionMask || new Array(ACTION_CATALOG.length).fill(1),
                { issueId: t.issueId }
            );
        }
        
        if (agent.replayBuffer.size() < DQN_CONFIG.MIN_REPLAY_SIZE) {
            runRecord.status = 'INSUFFICIENT_DATA';
            runRecord.reasons.push("INSUFFICIENT_REPLAY_DATA");
            await runRecord.save();
            isTrainingRunning = false;
            return runRecord;
        }
        
        // 4. Training Loop
        let totalLoss = 0;
        let successfulSteps = 0;
        
        for (let ep = 0; ep < DQN_CONFIG.MAX_EPISODES; ep++) {
            for (let step = 0; step < DQN_CONFIG.MAX_STEPS_PER_EPISODE; step++) {
                const loss = await agent.trainStep();
                if (loss !== null) {
                    totalLoss += loss;
                    successfulSteps++;
                }
            }
            agent.decayEpsilon();
        }
        
        // 5. Save Model
        const modelVersion = `${DQN_CONFIG.VERSION}-${Date.now()}`;
        const modelDir = path.join(__dirname, '..', 'ml', 'models', modelVersion);
        
        if (!fs.existsSync(modelDir)) {
            fs.mkdirSync(modelDir, { recursive: true });
        }
        
        await agent.save(modelDir);
        
        // 6. Finalize Run
        runRecord.status = mode === 'prototype' ? 'PROTOTYPE_ONLY' : 'COMPLETED';
        runRecord.episodes = DQN_CONFIG.MAX_EPISODES;
        runRecord.steps = successfulSteps;
        runRecord.averageLoss = successfulSteps > 0 ? (totalLoss / successfulSteps) : 0;
        runRecord.finalEpsilon = agent.epsilon;
        runRecord.modelPath = modelDir;
        runRecord.trainingCompletedAt = new Date();
        runRecord.configSnapshot = DQN_CONFIG;
        
        await runRecord.save();
        
        // Create Model Registry Entry
        const rlModel = new RLModel({
            modelVersion: modelVersion,
            algorithm: 'DQN',
            stateVersion: DQN_CONFIG.STATE_VERSION,
            actionVersion: DQN_CONFIG.ACTION_VERSION,
            status: mode === 'prototype' ? 'PROTOTYPE_ONLY' : 'UNVALIDATED',
            trainingRunId: runRecord._id,
            metadata: {
                datasetSize: runRecord.datasetSize,
                eligibleTransitions: runRecord.eligibleTransitions,
                averageLoss: runRecord.averageLoss
            }
        });
        await rlModel.save();
        
        isTrainingRunning = false;
        return runRecord;
        
    } catch (err) {
        runRecord.status = 'FAILED';
        runRecord.reasons.push(err.message);
        runRecord.trainingCompletedAt = new Date();
        await runRecord.save();
        
        isTrainingRunning = false;
        throw err;
    }
}

function getStatus() {
    return { isTrainingRunning };
}

module.exports = {
    trainDQN,
    getStatus
};
