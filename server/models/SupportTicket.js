const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['ACCOUNT', 'REPORTING', 'ISSUE_TRACKING', 'LOCATION', 'MEDIA_UPLOAD', 'NOTIFICATIONS', 'TECHNICAL', 'OTHER'],
    default: 'OTHER'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'waiting_for_user', 'resolved', 'closed'],
    default: 'open'
  },
  relatedIssueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue' },
  attachments: [{ type: String }],
  messages: [{
    sender: { type: String, required: true },
    senderRole: { type: String, default: 'citizen' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date }
}, {
  timestamps: true
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
