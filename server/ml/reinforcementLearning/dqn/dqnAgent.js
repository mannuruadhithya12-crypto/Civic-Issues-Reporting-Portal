const tf = require('@tensorflow/tfjs');
const DQN_CONFIG = require('./dqnConfig');
const ReplayBuffer = require('./replayBuffer');
const { createQNetwork, copyWeights } = require('./qNetwork');
const { selectAction, applyMaskToBatch } = require('./actionSelector');

class DQNAgent {
    constructor(stateDim, actionDim) {
        this.stateDim = stateDim;
        this.actionDim = actionDim;
        
        this.onlineNetwork = createQNetwork(stateDim, actionDim);
        this.targetNetwork = createQNetwork(stateDim, actionDim);
        
        // Initialize target network with same weights
        copyWeights(this.onlineNetwork, this.targetNetwork);
        
        this.optimizer = tf.train.adam(DQN_CONFIG.LEARNING_RATE);
        this.replayBuffer = new ReplayBuffer(DQN_CONFIG.REPLAY_BUFFER_SIZE);
        
        this.epsilon = DQN_CONFIG.INITIAL_EPSILON;
        this.steps = 0;
    }
    
    act(state, actionMask, isTraining = true) {
        const currentEpsilon = isTraining ? this.epsilon : 0;
        
        return tf.tidy(() => {
            const stateTensor = tf.tensor2d([state], [1, this.stateDim]);
            const qValues = this.onlineNetwork.predict(stateTensor).squeeze();
            return selectAction(qValues, actionMask, currentEpsilon);
        });
    }
    
    storeExperience(state, action, reward, nextState, done, actionMask, nextActionMask, metadata) {
        this.replayBuffer.add({
            state, action, reward, nextState, done, actionMask, nextActionMask, metadata
        });
    }
    
    decayEpsilon() {
        this.epsilon = Math.max(DQN_CONFIG.MIN_EPSILON, this.epsilon * DQN_CONFIG.EPSILON_DECAY);
    }
    
    async trainStep() {
        if (this.replayBuffer.size() < DQN_CONFIG.MIN_REPLAY_SIZE) {
            return null; // Not enough data
        }
        
        const batch = this.replayBuffer.sample(DQN_CONFIG.BATCH_SIZE);
        
        const states = batch.map(e => e.state);
        const actions = batch.map(e => e.action);
        const rewards = batch.map(e => e.reward);
        const nextStates = batch.map(e => e.nextState);
        const dones = batch.map(e => (e.done ? 1 : 0));
        const nextActionMasks = batch.map(e => e.nextActionMask);
        
        const lossValue = tf.tidy(() => {
            const stateTensor = tf.tensor2d(states, [DQN_CONFIG.BATCH_SIZE, this.stateDim]);
            const actionTensor = tf.tensor1d(actions, 'int32');
            const rewardTensor = tf.tensor1d(rewards);
            const nextStateTensor = tf.tensor2d(nextStates, [DQN_CONFIG.BATCH_SIZE, this.stateDim]);
            const doneTensor = tf.tensor1d(dones);
            const nextMaskTensor = tf.tensor2d(nextActionMasks, [DQN_CONFIG.BATCH_SIZE, this.actionDim]);
            
            // Get target Q-values for next states
            const nextQValues = this.targetNetwork.predict(nextStateTensor);
            
            // Apply mask to prevent selecting invalid actions in the target network
            const maskedNextQValues = applyMaskToBatch(nextQValues, nextMaskTensor);
            const bestNextQValues = maskedNextQValues.max(1);
            
            // Bellman update: reward + (1 - done) * gamma * max(Q(s', a'))
            const targetQValues = rewardTensor.add(
                tf.scalar(1).sub(doneTensor).mul(tf.scalar(DQN_CONFIG.GAMMA)).mul(bestNextQValues)
            );
            
            // Compute loss
            const lossFunction = () => {
                const qValues = this.onlineNetwork.predict(stateTensor);
                // Get the Q-values for the actions that were actually taken
                const actionMaskOneHot = tf.oneHot(actionTensor, this.actionDim);
                const predictedQValues = qValues.mul(actionMaskOneHot).sum(1);
                
                // Huber loss is more stable for DQN
                return tf.losses.huberLoss(targetQValues, predictedQValues);
            };
            
            const loss = this.optimizer.minimize(lossFunction, true, this.onlineNetwork.getWeights());
            return loss.dataSync()[0];
        });
        
        this.steps++;
        if (this.steps % DQN_CONFIG.TARGET_UPDATE_FREQUENCY === 0) {
            await copyWeights(this.onlineNetwork, this.targetNetwork);
        }
        
        return lossValue;
    }
    
    async save(modelPath) {
        // TFJS allows saving to file:// in node.js, but standard CivicConnect seems to prefer memory/database
        // For local filesystem save, assuming modelPath is a valid directory
        await this.onlineNetwork.save(`file://${modelPath}`);
    }
    
    async load(modelPath) {
        this.onlineNetwork = await tf.loadLayersModel(`file://${modelPath}/model.json`);
        await copyWeights(this.onlineNetwork, this.targetNetwork);
    }
}

module.exports = DQNAgent;
