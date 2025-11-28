const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    locationName: { type: String }, // Reverse geocoded address
    coordinates: {
        latitude: { type: Number },
        longitude: { type: Number }
    },
    images: [{ type: String }], // Array of image URLs/paths
    status: {
        type: String,
        enum: ['submitted', 'verified', 'assigned', 'in-progress', 'pending-verification', 'resolved'],
        default: 'submitted'
    },
    slaDeadline: { type: Date },
    resolvedAt: { type: Date },
    resolutionProof: { type: String }, // URL to image
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Category/Department field with new categories
    department: {
        type: String,
        enum: [
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
        default: 'Potholes'
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },
    assignedTo: { type: String }, // Worker ID or name
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

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Issue', issueSchema);
