// server/services/notificationService.js
const Notification = require('../models/Notification');

/**
 * Create a new notification for a user
 * @param {ObjectId} userId 
 * @param {String} type 
 * @param {String} title 
 * @param {String} message 
 * @param {ObjectId} issueId 
 */
const createNotification = async (userId, type, title, message, issueId = null) => {
    try {
        if (!userId) return null;
        
        const notification = new Notification({
            user: userId,
            type,
            title,
            message,
            issue: issueId
        });

        await notification.save();
        return notification;
    } catch (err) {
        console.error("Error creating notification:", err);
        return null;
    }
};

module.exports = {
    createNotification
};
