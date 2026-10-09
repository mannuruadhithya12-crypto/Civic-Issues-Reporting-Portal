const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Executive Summary', 'Department Analysis', 'Category Analysis', 'Geographic Report', 'SLA Performance', 'Trend Analysis', 'AI Insights Report', 'Custom Report'],
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed'],
    default: 'Completed'
  },
  period: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Report', reportSchema);
