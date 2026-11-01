const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    locationName: { type: String }, // Reverse geocoded address
    coordinates: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number] } // [longitude, latitude]
    },
    images: [{ type: String }], // Array of image URLs/paths
    status: {
        type: String,
        enum: ['reported', 'verified', 'assigned', 'in_progress', 'resolved', 'closed', 'reopened', 'rejected'],
        default: 'reported'
    },
    slaDeadline: { type: Date }, // legacy
    sla: {
        targetHours: { type: Number },
        dueAt: { type: Date },
        breachedAt: { type: Date },
        isBreached: { type: Boolean, default: false }
    },
    resolvedAt: { type: Date },
    resolutionProof: { type: String }, // URL to image
    resolutionNotes: { type: String },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    closedAt: { type: Date },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    citizenVerification: {
        status: { type: String, enum: ['approved', 'rejected'] },
        verifiedAt: { type: Date },
        comment: { type: String }
    },

    // Category/Department field with expanded categories
    department: {
        type: String,
        enum: [
            'Roads',
            'Waste',
            'Electricity',
            'Water',
            'Parks',
            'Sanitation',
            'Public Safety',
            'Potholes',
            'Garbage overflow',
            'Streetlight failures',
            'Water leakage',
            'Illegal parking',
            'Drainage issues',
            'Broken footpaths',
            'Noise pollution',
            'Sewage problems',
            'Public safety issues',
            'Other'
        ],
        default: 'Roads'
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comments: [{
        text: { type: String, required: true },
        by: { type: String, required: true }, // Username or email
        at: { type: Date, default: Date.now }
    }],
    timeline: [{
        at: { type: Date, default: Date.now },
        who: { type: String, required: true },
        text: { type: String, required: true },
        status: { type: String }
    }],
    statusHistory: [{
        status: { type: String },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now },
        comment: { type: String }
    }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },

    // Sprint 2: AI Metadata and Duplicate Detection
    aiAnalysis: {
        category: {
            value: { type: String },
            confidence: { type: Number }
        },
        severity: {
            value: { type: String },
            confidence: { type: Number }
        },
        summary: { type: String },
        analyzedAt: { type: Date }
    },
    citizenConfirmedCategory: { type: String },
    citizenConfirmedSeverity: { type: String },
    duplicateCandidates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
    isDemo: { type: Boolean, default: false }
});

// Geospatial index for geographic cluster & hotspot queries
issueSchema.index({ coordinates: '2dsphere' });

// Compound indexes for high-frequency portal query patterns
issueSchema.index({ createdBy: 1, createdAt: -1 });
issueSchema.index({ assignedTo: 1, status: 1 });
issueSchema.index({ status: 1, createdAt: -1 });
issueSchema.index({ department: 1, status: 1, createdAt: -1 });
issueSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Issue', issueSchema);
