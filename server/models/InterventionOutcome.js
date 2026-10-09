const mongoose = require('mongoose');

// This schema acts as the future RL State-Action-Reward-NextState record
const interventionOutcomeSchema = new mongoose.Schema({
    issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue' },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
    targetArea: { type: String }, // General location or coordinates
    category: { type: String, required: true },
    department: { type: String, required: true },
    interventionType: { type: String, required: true },
    
    // ACTION (RL)
    resources: {
        workers: { type: Number, default: 0 },
        vehicles: { type: Number, default: 0 },
        hours: { type: Number, default: 0 },
        cost: { type: Number, default: 0 },
        availabilityStatus: { type: String, enum: ['KNOWN', 'UNKNOWN'] }
    },

    // STATE (RL - Before)
    beforeMetrics: {
        priorityScore: { type: Number },
        riskScore: { type: Number },
        slaRisk: { type: Number }, // 100 breached, 75 at risk, 0-50 on track
        openIssues: { type: Number },
        recurringCount: { type: Number },
        hotspotLevel: { type: Number },
        departmentWorkload: { type: Number },
        capturedAt: { type: Date },
        source: { type: String, enum: ['LIVE_DATA', 'SIMULATION', 'MANUAL_ADMIN_ENTRY'] }
    },

    // NEXT STATE (RL - After)
    afterMetrics: {
        priorityScore: { type: Number },
        riskScore: { type: Number },
        slaRisk: { type: Number },
        openIssues: { type: Number },
        recurringCount: { type: Number },
        hotspotLevel: { type: Number },
        departmentWorkload: { type: Number },
        capturedAt: { type: Date },
        source: { type: String, enum: ['LIVE_DATA', 'SIMULATION', 'MANUAL_ADMIN_ENTRY'] }
    },

    // REWARD (RL - Outcome Signal)
    // "Observed Change After Intervention" - Deterministic difference, not necessarily causal
    reward: {
        value: { type: Number }, // A composite reward score (calculated later)
        riskReduction: { type: Number },
        slaImprovement: { type: Number },
        issueReduction: { type: Number },
        recurrenceReduction: { type: Number },
        resourceEfficiency: { type: Number }
    },

    // Lifecycle
    status: {
        type: String,
        enum: ['RECOMMENDED', 'APPROVED', 'EXECUTED', 'EVALUATED', 'CANCELLED'],
        default: 'RECOMMENDED'
    },
    
    // ML/RL Pipeline Flags
    evaluationSource: {
        type: String,
        enum: ['LIVE_DATA', 'MANUAL_ADMIN_ENTRY', 'SIMULATION'],
        default: null
    },
    trainingEligible: {
        type: Boolean,
        default: false
    },

    recommendedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date },
    executedAt: { type: Date },
    evaluatedAt: { type: Date },
    
    // Who approved/executed
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    executedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    notes: { type: String }
});

// Indexes for quick lookups and RL training queries later
interventionOutcomeSchema.index({ status: 1 });
interventionOutcomeSchema.index({ executedAt: -1 });
interventionOutcomeSchema.index({ category: 1, interventionType: 1 });
interventionOutcomeSchema.index({ issueId: 1 });

module.exports = mongoose.model('InterventionOutcome', interventionOutcomeSchema);
