const tf = require('@tensorflow/tfjs');

/**
 * Selects an action using Epsilon-Greedy policy with Action Masking.
 *
 * @param {tf.Tensor} qValues - 1D Tensor of Q-values for all possible actions
 * @param {Array<number>} actionMask - Array of 1s and 0s indicating valid actions
 * @param {number} epsilon - Exploration rate
 * @returns {Object} { recommendedActionId, reason }
 */
function selectAction(qValues, actionMask, epsilon = 0) {
    const qArray = qValues.arraySync(); // Get raw values
    
    // Check if there are any valid actions at all
    const validCount = actionMask.reduce((sum, val) => sum + val, 0);
    if (validCount === 0) {
        return { recommendedActionId: null, reason: "NO_VALID_ACTION" };
    }
    
    // Epsilon-greedy logic
    if (Math.random() < epsilon) {
        // Explore: choose random valid action
        const validIndices = [];
        for (let i = 0; i < actionMask.length; i++) {
            if (actionMask[i] === 1) validIndices.push(i);
        }
        const randomAction = validIndices[Math.floor(Math.random() * validIndices.length)];
        return { recommendedActionId: randomAction, reason: "EXPLORATION" };
    }
    
    // Exploit: choose valid action with max Q-value
    let maxQ = -Infinity;
    let bestAction = null;
    
    for (let i = 0; i < qArray.length; i++) {
        if (actionMask[i] === 1) {
            if (qArray[i] > maxQ) {
                maxQ = qArray[i];
                bestAction = i;
            }
        }
    }
    
    return { recommendedActionId: bestAction, reason: "EXPLOITATION" };
}

/**
 * Applies mask to Q-values by setting invalid actions to -Infinity (or very low number)
 * so they are never selected by tf.argMax
 * @param {tf.Tensor} qValues 2D Tensor [batchSize, numActions]
 * @param {tf.Tensor} mask 2D Tensor [batchSize, numActions] of 0s and 1s
 */
function applyMaskToBatch(qValues, mask) {
    // We want to add a large negative number where mask is 0
    // mask == 0 => -1e9, mask == 1 => 0
    // So we can do: (mask - 1) * 1e9
    return tf.tidy(() => {
        const maskModifier = mask.sub(tf.scalar(1)).mul(tf.scalar(1e9));
        return qValues.add(maskModifier);
    });
}

module.exports = {
    selectAction,
    applyMaskToBatch
};
