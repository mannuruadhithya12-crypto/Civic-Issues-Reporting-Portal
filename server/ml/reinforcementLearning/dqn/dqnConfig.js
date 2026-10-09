const DQN_CONFIG = {
    VERSION: "dqn-v1",
    STATE_VERSION: "state-v1",
    ACTION_VERSION: "action-v1",
    
    GAMMA: 0.95,
    LEARNING_RATE: 0.001,
    BATCH_SIZE: 32,
    REPLAY_BUFFER_SIZE: 10000,
    MIN_REPLAY_SIZE: 32,
    TARGET_UPDATE_FREQUENCY: 100,
    
    INITIAL_EPSILON: 1.0,
    MIN_EPSILON: 0.05,
    EPSILON_DECAY: 0.995,
    
    MAX_EPISODES: 500,
    MAX_STEPS_PER_EPISODE: 1, // Single-step historical transitions
    
    HIDDEN_UNITS: [64, 64]
};

module.exports = DQN_CONFIG;
