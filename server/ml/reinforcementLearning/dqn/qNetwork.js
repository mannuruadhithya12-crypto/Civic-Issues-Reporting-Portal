const tf = require('@tensorflow/tfjs');
const DQN_CONFIG = require('./dqnConfig');

/**
 * Creates the Q-Network using TensorFlow.js
 * Architecture: Input(7) -> Dense(64) -> Dense(64) -> Output(ActionCount)
 */
function createQNetwork(inputDim, outputDim) {
    const model = tf.sequential();
    
    // First Hidden Layer
    model.add(tf.layers.dense({
        units: DQN_CONFIG.HIDDEN_UNITS[0],
        inputShape: [inputDim],
        activation: 'relu'
    }));
    
    // Second Hidden Layer
    model.add(tf.layers.dense({
        units: DQN_CONFIG.HIDDEN_UNITS[1],
        activation: 'relu'
    }));
    
    // Output Layer - Linear activation for Q-values
    model.add(tf.layers.dense({
        units: outputDim,
        activation: 'linear'
    }));
    
    return model;
}

/**
 * Deep copy of network weights from source to target
 */
async function copyWeights(sourceModel, targetModel) {
    const weights = sourceModel.getWeights();
    targetModel.setWeights(weights);
}

module.exports = {
    createQNetwork,
    copyWeights
};
