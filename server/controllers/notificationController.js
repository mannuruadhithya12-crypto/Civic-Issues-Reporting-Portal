// server/controllers/notificationController.js
const Notification = require('../models/Notification');
const Issue = require('../models/Issue');

// Categorize notification type into 4 distinct reference categories:
// 'Task Updates', 'New Assignments', 'Reminders', 'Announcements'
const categorizeType = (type) => {
  const t = (type || '').toLowerCase();
  if (['announcement', 'system_announcement', 'system'].includes(t)) {
    return 'Announcements';
  }
  if (['task_due', 'urgent', 'urgent_task', 'reminder', 'sla_warning', 'sla_breach', 'warning'].includes(t)) {
    return 'Reminders';
  }
  if (['new_task', 'new_assignment', 'assignment', 'task_reassigned'].includes(t)) {
    return 'New Assignments';
  }
  return 'Task Updates';
};

const getNotifications = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const notifications = await Notification.find({ user: userId })
            .populate({
                path: 'issue',
                select: 'title description department status priority location locationName images createdAt assignedAt assignedBy sla statusHistory timeline',
                populate: {
                    path: 'assignedBy',
                    select: 'name email department'
                }
            })
            .sort({ createdAt: -1 })
            .limit(100);

        const unreadCount = await Notification.countDocuments({ user: userId, read: false });

        // Calculate counts for categories
        let taskUpdatesCount = 0;
        let newAssignmentsCount = 0;
        let remindersCount = 0;
        let announcementsCount = 0;

        notifications.forEach(n => {
            const cat = categorizeType(n.type);
            if (cat === 'Task Updates') taskUpdatesCount++;
            else if (cat === 'New Assignments') newAssignmentsCount++;
            else if (cat === 'Reminders') remindersCount++;
            else if (cat === 'Announcements') announcementsCount++;
        });

        res.json({
            success: true,
            notifications,
            unreadCount,
            counts: {
                all: notifications.length,
                taskUpdates: taskUpdatesCount,
                newAssignments: newAssignmentsCount,
                reminders: remindersCount,
                announcements: announcementsCount
            },
            data: notifications
        });
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const count = await Notification.countDocuments({ user: userId, read: false });
        res.json({ count, unreadCount: count });
    } catch (err) {
        console.error('Error fetching unread count:', err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const markAsRead = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const mongoose = require('mongoose');
        
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.json({ success: true, notification: { _id: req.params.id, read: true }, unreadCount: 0 });
        }

        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: userId },
            { read: true },
            { new: true }
        ).populate({
            path: 'issue',
            select: 'title description department status priority location locationName images createdAt assignedAt assignedBy sla statusHistory timeline',
            populate: {
                path: 'assignedBy',
                select: 'name email department'
            }
        });

        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        const unreadCount = await Notification.countDocuments({ user: userId, read: false });
        res.json({ success: true, notification, unreadCount });
    } catch (err) {
        console.error('Error marking notification read:', err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const markAsUnread = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: userId },
            { read: false },
            { new: true }
        ).populate({
            path: 'issue',
            select: 'title description department status priority location locationName images createdAt assignedAt assignedBy sla statusHistory timeline',
            populate: {
                path: 'assignedBy',
                select: 'name email department'
            }
        });

        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        const unreadCount = await Notification.countDocuments({ user: userId, read: false });
        res.json({ success: true, notification, unreadCount });
    } catch (err) {
        console.error('Error marking notification unread:', err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        await Notification.updateMany(
            { user: userId, read: false },
            { read: true }
        );
        res.json({ success: true, message: "All notifications marked as read", unreadCount: 0 });
    } catch (err) {
        console.error('Error marking all read:', err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const deleteNotification = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const result = await Notification.findOneAndDelete({ _id: req.params.id, user: userId });
        if (!result) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }
        const unreadCount = await Notification.countDocuments({ user: userId, read: false });
        res.json({ success: true, message: "Notification deleted", unreadCount });
    } catch (err) {
        console.error('Error deleting notification:', err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    categorizeType
};

