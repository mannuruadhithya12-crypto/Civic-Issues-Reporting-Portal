const mongoose = require('mongoose');

const decisionRecordSchema = new mongoose.Schema({
    issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true },
    
    // State
    stateVersion: { type: String, required: true },
    stateSnapshot: { type: Object, required: true }, // Store the exact state at decision time
    
    // Strategy
    strategyId: { type: String, required: true }, // e.g. "DETERMINISTIC", "DQN"
    strategyVersion: { type: String },
    
    // Policy/Model Governance
    policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdaptivePolicy' },
    policyVersion: { type: String },
    modelId: { type: mongoose.Schema.Types.ObjectId },
    modelType: { type: String, enum: ['DQN', 'RANDOM_FOREST', 'OTHER', 'NONE'], default: 'NONE' },
    modelVersion: { type: String },
    
    // The Decision
    recommendation: { type: Object, required: true }, // The selected intervention action + details
    
    // Evidence & Explainability
    evidence: { type: Object, required: true },
    
    // Safety & Constraints
    safetyValidation: { type: Object, required: true }, // allowed: boolean, status: string, reasons: []
    constraints: { type: Object }, // The constraints checked (workersAvailable, etc.)
    
    // Workflow tracking
    approvalRequired: { type: Boolean, default: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    
    executionReference: { type: String }, // Links to execution if it happens
    outcomeReference: { type: mongoose.Schema.Types.ObjectId, ref: 'InterventionOutcome' } // Links to final outcome
    
}, { timestamps: true });

// Index for traceability queries
decisionRecordSchema.index({ issueId: 1, createdAt: -1 });

module.exports = mongoose.model('DecisionRecord', decisionRecordSchema);
