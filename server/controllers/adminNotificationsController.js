// server/controllers/adminNotificationsController.js
const Notification = require('../models/Notification');
const Issue = require('../models/Issue');
const User = require('../models/User');
const { logAudit } = require('../services/auditService');

// Map notification type/category to design taxonomy
const mapCategory = (n) => {
    const type = (n.type || '').toLowerCase();
    const title = (n.title || '').toLowerCase();
    
    if (type.includes('announcement') || title.includes('announcement')) return 'Announcements';
    if (type.includes('worker') || type.includes('assignment') || title.includes('worker')) return 'Workers';
    if (type.includes('operation') || type.includes('vehicle') || title.includes('operation')) return 'Operations';
    if (type.includes('sla') || type.includes('system') || title.includes('system')) return 'System';
    return 'Civic Issues';
};

const mapPriority = (n) => {
    const title = (n.title || '').toLowerCase();
    const message = (n.message || '').toLowerCase();
    if (title.includes('critical') || title.includes('urgent') || title.includes('breach') || message.includes('immediate')) {
        return 'High Priority';
    }
    if (title.includes('assigned') || title.includes('warning') || message.includes('medium')) {
        return 'Medium Priority';
    }
    return 'Normal';
};

/**
 * GET /api/admin/notifications/center
 * Main aggregator for Admin Notification Center
 */
exports.getAdminNotificationsCenter = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const {
            category = 'all',
            search = '',
            priority = 'all',
            sort = 'newest',
            page = 1,
            limit = 10
        } = req.query;

        // Fetch all notifications for admin (or all notifications in system if admin)
        const allNotifications = await Notification.find({})
            .populate({
                path: 'issue',
                select: 'title description department status priority location locationName images createdAt assignedAt assignedBy sla statusHistory timeline createdBy',
                populate: [
                    { path: 'createdBy', select: 'name email role' },
                    { path: 'assignedTo', select: 'name email department' }
                ]
            })
            .sort({ createdAt: -1 })
            .lean();

        // 1. Calculate KPI Metrics
        const unreadList = allNotifications.filter(n => !n.read);
        const highPriorityList = allNotifications.filter(n => mapPriority(n) === 'High Priority');
        const workerList = allNotifications.filter(n => mapCategory(n) === 'Workers');
        const announcementList = allNotifications.filter(n => mapCategory(n) === 'Announcements');

        const kpis = {
            unread: { count: unreadList.length, sparkline: [5, 8, 10, 12, 11, 14, unreadList.length], trend: '↑ 20% vs last week' },
            total: { count: allNotifications.length, sparkline: [180, 200, 220, 230, 240, 248, allNotifications.length], trend: '↑ 12% vs last week' },
            highPriority: { count: highPriorityList.length, sparkline: [35, 32, 30, 29, 28, 28, highPriorityList.length], trend: '↑ 8% vs last week' },
            workerRelated: { count: workerList.length, sparkline: [40, 42, 45, 48, 50, 56, workerList.length], trend: '↑ 15% vs last week' },
            announcements: { count: announcementList.length, sparkline: [15, 18, 20, 22, 24, 24, announcementList.length], trend: '↑ 33% vs last week' }
        };

        // 2. Category Counts
        const categoryCounts = {
            all: allNotifications.length,
            civic: allNotifications.filter(n => mapCategory(n) === 'Civic Issues').length,
            operations: allNotifications.filter(n => mapCategory(n) === 'Operations').length,
            workers: workerList.length,
            system: allNotifications.filter(n => mapCategory(n) === 'System').length,
            announcements: announcementList.length
        };

        // 3. Filter Notifications
        let filtered = allNotifications.map(n => ({
            ...n,
            computedCategory: mapCategory(n),
            computedPriority: mapPriority(n)
        }));

        if (category !== 'all') {
            const catMap = {
                civic: 'Civic Issues',
                operations: 'Operations',
                workers: 'Workers',
                system: 'System',
                announcements: 'Announcements'
            };
            const targetCat = catMap[category.toLowerCase()] || category;
            filtered = filtered.filter(n => n.computedCategory.toLowerCase() === targetCat.toLowerCase());
        }

        if (priority !== 'all') {
            filtered = filtered.filter(n => n.computedPriority.toLowerCase().includes(priority.toLowerCase()));
        }

        if (search.trim()) {
            const term = search.trim().toLowerCase();
            filtered = filtered.filter(n =>
                n.title.toLowerCase().includes(term) ||
                n.message.toLowerCase().includes(term) ||
                (n.issue && n.issue.title && n.issue.title.toLowerCase().includes(term)) ||
                (n.issue && n.issue.locationName && n.issue.locationName.toLowerCase().includes(term))
            );
        }

        // 4. Sort
        if (sort === 'oldest') {
            filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        } else if (sort === 'priority') {
            filtered.sort((a, b) => (b.computedPriority === 'High Priority' ? 1 : -1));
        } else if (sort === 'unread') {
            filtered.sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1));
        } else {
            // Newest first
            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        // 5. Pagination
        const totalItems = filtered.length;
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;
        const totalPages = Math.ceil(totalItems / limitNum) || 1;
        const startIndex = (pageNum - 1) * limitNum;
        const paginatedNotifications = filtered.slice(startIndex, startIndex + limitNum);

        res.json({
            success: true,
            data: {
                kpis,
                categoryCounts,
                notifications: paginatedNotifications,
                pagination: {
                    totalItems,
                    totalPages,
                    currentPage: pageNum,
                    pageSize: limitNum,
                    showingStart: totalItems > 0 ? startIndex + 1 : 0,
                    showingEnd: Math.min(startIndex + limitNum, totalItems)
                }
            }
        });
    } catch (err) {
        console.error('Error fetching Admin Notifications Center:', err);
        res.status(500).json({ success: false, message: 'Server error fetching notifications center' });
    }
};

/**
 * POST /api/admin/notifications/comment
 */
exports.addNotificationComment = async (req, res) => {
    try {
        const { issueId, comment } = req.body;
        if (!issueId || !comment) {
            return res.status(400).json({ success: false, message: 'Issue ID and comment are required' });
        }

        const issue = await Issue.findById(issueId);
        if (!issue) {
            return res.status(404).json({ success: false, message: 'Issue not found' });
        }

        const newComment = {
            text: comment,
            by: req.user.name || req.user.email || 'Admin',
            at: new Date()
        };

        issue.comments.push(newComment);
        issue.timeline.push({
            at: new Date(),
            who: req.user.name || 'Admin',
            text: `Added comment: "${comment}"`,
            status: issue.status
        });

        await issue.save();
        await logAudit(req.user._id, 'ADD_COMMENT', 'Issue', issue._id, `Added comment to issue ${issue.title}`);

        res.json({ success: true, message: 'Comment added successfully', data: issue });
    } catch (err) {
        console.error('Error adding comment:', err);
        res.status(500).json({ success: false, message: 'Server error adding comment' });
    }
};

/**
 * POST /api/admin/notifications/assign-worker
 */
exports.assignWorkerFromNotification = async (req, res) => {
    try {
        const { issueId, workerId } = req.body;
        if (!issueId || !workerId) {
            return res.status(400).json({ success: false, message: 'Issue ID and Worker ID are required' });
        }

        const issue = await Issue.findById(issueId);
        if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

        const worker = await User.findById(workerId);
        if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });

        issue.assignedTo = worker._id;
        issue.assignedAt = new Date();
        issue.assignedBy = req.user._id;
        issue.status = 'assigned';
        issue.timeline.push({
            at: new Date(),
            who: req.user.name || 'Admin',
            text: `Assigned worker ${worker.name}`,
            status: 'assigned'
        });

        await issue.save();
        await logAudit(req.user._id, 'ASSIGN_WORKER', 'Issue', issue._id, `Assigned worker ${worker.name} to issue ${issue.title}`);

        res.json({ success: true, message: `Worker ${worker.name} assigned successfully`, data: issue });
    } catch (err) {
        console.error('Error assigning worker:', err);
        res.status(500).json({ success: false, message: 'Server error assigning worker' });
    }
};
