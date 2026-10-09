const mongoose = require('mongoose');

const rlTrainingRunSchema = new mongoose.Schema({
    version: { type: String, required: true },
    stateVersion: { type: String, required: true },
    actionVersion: { type: String, required: true },
    algorithm: { type: String, required: true }, // "DQN"
    mode: { type: String, required: true, enum: ['production', 'prototype'] },
    status: { type: String, required: true, enum: ['NOT_STARTED', 'VALIDATING_DATA', 'INSUFFICIENT_DATA', 'TRAINING', 'COMPLETED', 'FAILED', 'PROTOTYPE_ONLY'] },
    
    datasetSize: { type: Number, default: 0 },
    eligibleTransitions: { type: Number, default: 0 },
    episodes: { type: Number, default: 0 },
    steps: { type: Number, default: 0 },
    
    averageReward: { type: Number },
    maxReward: { type: Number },
    minReward: { type: Number },
    averageLoss: { type: Number },
    finalEpsilon: { type: Number },
    
    trainingStartedAt: { type: Date },
    trainingCompletedAt: { type: Date },
    
    modelPath: { type: String },
    configSnapshot: { type: Object },
    dataHealthSnapshot: { type: Object },
    
    createdBy: { type: String },
    reasons: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('RLTrainingRun', rlTrainingRunSchema);
