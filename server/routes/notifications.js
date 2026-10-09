// server/routes/notifications.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { auth } = require('../middleware/auth');

router.get('/', auth, notificationController.getNotifications);
router.get('/unread-count', auth, notificationController.getUnreadCount);
router.patch('/:id/read', auth, notificationController.markAsRead);
router.put('/:id/read', auth, notificationController.markAsRead);
router.patch('/:id/unread', auth, notificationController.markAsUnread);
router.put('/:id/unread', auth, notificationController.markAsUnread);
router.patch('/read-all', auth, notificationController.markAllAsRead);
router.put('/read-all', auth, notificationController.markAllAsRead);
router.put('/mark-all-read', auth, notificationController.markAllAsRead);
router.delete('/:id', auth, notificationController.deleteNotification);

module.exports = router;

