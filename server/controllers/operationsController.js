// server/controllers/operationsController.js
const { eventEmitter } = require('../events/eventEmitter');
const AuditLog = require('../models/AuditLog');

/**
 * Real-time Server-Sent Events (SSE) Stream for Live Operations
 */
exports.getLiveStream = (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send initial handshake message
    res.write(`data: ${JSON.stringify({ eventType: 'CONNECTED', timestamp: new Date().toISOString(), message: 'Live operations event stream active' })}\n\n`);

    const handleEvent = (eventData) => {
        try {
            res.write(`data: ${JSON.stringify(eventData)}\n\n`);
        } catch (err) {
            console.error("Error pushing event to SSE client:", err.message);
        }
    };

    eventEmitter.on('live_event', handleEvent);

    req.on('close', () => {
        eventEmitter.removeListener('live_event', handleEvent);
        res.end();
    });
};

/**
 * Get recent operation logs / events
 */
exports.getRecentEvents = async (req, res) => {
    try {
        const auditLogs = await AuditLog.find()
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('actor', 'name email role');

        res.json({
            count: auditLogs.length,
            events: auditLogs.map(log => ({
                id: log._id,
                eventType: log.action,
                user: log.actor ? (log.actor.name || log.actor.email) : (log.actorName || 'System'),
                targetType: log.targetType,
                targetId: log.targetId,
                targetLabel: log.targetLabel,
                details: log.details,
                timestamp: log.createdAt
            }))
        });
    } catch (err) {
        console.error("Error fetching recent operation events:", err);
        res.status(500).json({ error: "Server error fetching operational events" });
    }
};
