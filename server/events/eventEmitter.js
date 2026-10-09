// server/events/eventEmitter.js
const EventEmitter = require('events');
const Notification = require('../models/Notification');
const { logAudit } = require('../services/auditService');

class OperationsEventEmitter extends EventEmitter {}

const eventEmitter = new OperationsEventEmitter();

// Helper function to emit real domain events
const emitDomainEvent = async (eventType, payload, req = null) => {
  const eventData = {
    eventType,
    timestamp: new Date().toISOString(),
    payload
  };

  // Broadcast to live SSE subscribers
  eventEmitter.emit('live_event', eventData);

  // Persistence / Notification logic for key events
  try {
    if (payload.userId) {
      await Notification.create({
        user: payload.userId,
        type: eventType.toLowerCase(),
        title: payload.title || `Event: ${eventType}`,
        message: payload.message || `An update occurred: ${eventType}`,
        issue: payload.issueId || null,
        read: false
      });
    }

    // Optional audit log recording if req is passed
    if (req && req.user) {
      await logAudit({
        req,
        action: eventType,
        targetType: payload.targetType || 'System',
        targetId: payload.targetId || payload.issueId || null,
        targetLabel: payload.title || eventType,
        details: payload
      });
    }
  } catch (err) {
    console.error(`Error processing domain event ${eventType}:`, err.message);
  }

  return eventData;
};

module.exports = {
  eventEmitter,
  emitDomainEvent
};
