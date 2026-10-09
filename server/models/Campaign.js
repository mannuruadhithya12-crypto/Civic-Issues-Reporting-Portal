const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    objective: { type: String },
    category: { type: String, required: true },
    targetArea: { type: String, required: true },
    
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    
    status: {
        type: String,
        enum: ['PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'],
        default: 'PLANNED'
    },
    
    progress: { type: Number, default: 0, min: 0, max: 100 },
    
    resources: {
        workers: { type: Number, default: 0 },
        vehicles: { type: Number, default: 0 },
        hours: { type: Number, default: 0 },
        budget: { type: Number, default: 0 }
    },
    
    spent: { type: Number, default: 0 },
    
    targetIssues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
    
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Campaign', campaignSchema);
