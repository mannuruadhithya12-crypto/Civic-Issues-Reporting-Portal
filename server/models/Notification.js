const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, default: 'general' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue' },
    read: { type: Boolean, default: false },
    isDemo: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
