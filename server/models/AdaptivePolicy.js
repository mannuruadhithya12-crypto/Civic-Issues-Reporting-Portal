const mongoose = require('mongoose');

const adaptivePolicySchema = new mongoose.Schema({
    policyId: { type: String, required: true, unique: true }, // e.g. "POLICY-DQN-v1"
    policyVersion: { type: String, required: true },
    
    strategyId: { type: String, required: true, enum: ['DETERMINISTIC', 'DQN', 'RANDOM_FOREST'] },
    
    // Versions
    stateVersion: { type: String, required: true },
    actionVersion: { type: String, required: true },
    
    // Underlying Model reference (Generic)
    modelId: { type: mongoose.Schema.Types.ObjectId, default: null },
    modelType: { type: String, enum: ['DQN', 'RANDOM_FOREST', 'OTHER', 'NONE'], default: 'NONE' },
    modelVersion: { type: String }, // optional denormalization
    
    // Lifecycle
    // DRAFT -> VALIDATING -> SHADOW -> APPROVED -> ACTIVE -> RETIRED
    status: { 
        type: String, 
        required: true, 
        enum: ['DRAFT', 'VALIDATING', 'SHADOW', 'APPROVED', 'ACTIVE', 'RETIRED', 'REJECTED'],
        default: 'DRAFT'
    },
    
    // Governance Metadata
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    approvedAt: { type: Date },
    activatedAt: { type: Date },
    retiredAt: { type: Date },
    
    governanceMetadata: { type: Object }
}, { timestamps: true });

module.exports = mongoose.model('AdaptivePolicy', adaptivePolicySchema);
