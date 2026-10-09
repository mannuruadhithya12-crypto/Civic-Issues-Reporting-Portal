const AuditLog = require('../models/AuditLog');

/**
 * Log an auditable event
 */
async function logAudit({
  req,
  actor,
  actorName,
  actorRole,
  action,
  targetType,
  targetId,
  targetLabel,
  details = {},
  outcome = 'SUCCESS'
}) {
  try {
    const finalActor = actor || (req?.user?._id || req?.user?.id);
    const finalActorName = actorName || req?.user?.name || req?.user?.username || req?.user?.email || 'System';
    const finalActorRole = actorRole || req?.user?.role || 'system';
    const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || 'local';

    const entry = new AuditLog({
      actor: finalActor,
      actorName: finalActorName,
      actorRole: finalActorRole,
      action: action || 'OPERATION_EVENT',
      targetType: targetType || 'SYSTEM',
      targetId: targetId ? targetId.toString() : undefined,
      targetLabel: targetLabel || 'Operational Log',
      details,
      outcome,
      ipAddress
    });

    await entry.save();
    return entry;
  } catch (err) {
    console.error('Audit logging error:', err.message);
    // Never throw from audit logger to avoid blocking business operations
    return null;
  }
}

/**
 * Retrieve audit logs with filtering and pagination
 */
async function getAuditLogs({ limit = 50, page = 1, action, targetType, search } = {}) {
  const query = {};
  if (action) query.action = action;
  if (targetType) query.targetType = targetType;
  if (search) {
    query.$or = [
      { actorName: { $regex: search, $options: 'i' } },
      { action: { $regex: search, $options: 'i' } },
      { targetLabel: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (Math.max(1, page) - 1) * limit;
  const [total, logs] = await Promise.all([
    AuditLog.countDocuments(query),
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('actor', 'name email role department')
  ]);

  return { total, page: Number(page), limit: Number(limit), logs };
}

module.exports = {
  logAudit,
  getAuditLogs
};
