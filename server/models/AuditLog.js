const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName: { type: String, required: true },
  actorRole: { type: String, default: 'admin' },
  action: { type: String, required: true },
  targetType: { type: String, required: true },
  targetId: { type: String },
  targetLabel: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
  outcome: { type: String, enum: ['SUCCESS', 'FAILED'], default: 'SUCCESS' },
  ipAddress: { type: String },
  isDemo: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
