// server/controllers/workerController.js
const Issue = require('../models/Issue');
const Notification = require('../models/Notification');
const User = require('../models/User');

const getAssignedIssues = async (req, res) => {
    try {
        if (!req.user || (req.user.role !== 'worker' && req.user.role !== 'admin')) {
            return res.status(403).json({ message: "Access denied" });
        }

        const workerQuery = req.user.role === 'worker' 
            ? { assignedTo: req.user._id }
            : { assignedTo: { $exists: true, $ne: null } };

        let query = { ...workerQuery };

        // Status filter
        if (req.query.status && req.query.status !== 'all') {
            if (req.query.status === 'completed' || req.query.status === 'resolved') {
                query.status = { $in: ['resolved', 'closed'] };
            } else {
                query.status = req.query.status;
            }
        }

        // Priority filter
        if (req.query.priority && req.query.priority !== 'all') {
            query.priority = req.query.priority.toLowerCase();
        }

        // Category filter
        if (req.query.category && req.query.category !== 'all') {
            const catRegex = new RegExp(req.query.category, 'i');
            query.$or = [{ category: catRegex }, { department: catRegex }];
        }

        // Search query
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            const searchOr = [
                { title: searchRegex },
                { description: searchRegex },
                { locationName: searchRegex },
                { address: searchRegex },
                { category: searchRegex },
                { subCategory: searchRegex },
                { department: searchRegex }
            ];
            
            if (query.$or) {
                query = { $and: [workerQuery, { $or: searchOr }] };
            } else {
                query.$or = searchOr;
            }
        }

        const sortOption = req.query.sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

        const issues = await Issue.find(query)
            .populate('createdBy', 'name email phone')
            .populate('assignedTo', 'name email department')
            .sort(sortOption);

        res.json(issues);
    } catch (err) {
        console.error("getAssignedIssues error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

const getWorkerDashboard = async (req, res) => {
    try {
        if (!req.user || (req.user.role !== 'worker' && req.user.role !== 'admin')) {
            return res.status(403).json({ message: "Access denied" });
        }

        const workerId = req.user._id;

        // Fetch issues assigned to this worker (or all assigned issues if admin)
        const query = req.user.role === 'worker' 
            ? { assignedTo: workerId }
            : {};

        const issues = await Issue.find(query)
            .populate('createdBy', 'name email phone')
            .sort({ createdAt: -1 });

        const assignedTasks = issues.length;
        const inProgress = issues.filter(i => i && i.status === 'in_progress').length;
        const completed = issues.filter(i => i && (i.status === 'resolved' || i.status === 'closed')).length;
        const urgentTasks = issues.filter(i => i && (i.priority === 'urgent' || i.priority === 'high' || i.sla?.isBreached)).length;

        // Today tasks count
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const newTodayCount = issues.filter(i => i && new Date(i.assignedAt || i.createdAt) >= startOfToday).length;

        const completionRate = assignedTasks > 0 ? Math.round((completed / assignedTasks) * 100) : 0;

        // Today's tasks (assigned tasks)
        const todayTasks = issues;

        // Nearby tasks (with valid coordinates array)
        const nearbyTasks = issues.filter(i => i && i.coordinates && Array.isArray(i.coordinates.coordinates) && i.coordinates.coordinates.length === 2);

        // Recent activity
        let recentActivity = [];
        issues.forEach(issue => {
            if (!issue) return;
            if (issue.timeline && Array.isArray(issue.timeline) && issue.timeline.length > 0) {
                issue.timeline.forEach((event, idx) => {
                    if (!event) return;
                    recentActivity.push({
                        id: `${issue._id}-tl-${idx}`,
                        taskId: issue._id,
                        title: event.text || `Task update on ${issue.title || 'Task'}`,
                        issueTitle: issue.title || 'Task',
                        status: event.status || issue.status,
                        timestamp: event.at || issue.updatedAt || issue.createdAt || new Date(),
                        who: event.who || 'System'
                    });
                });
            } else if (issue.statusHistory && Array.isArray(issue.statusHistory) && issue.statusHistory.length > 0) {
                issue.statusHistory.forEach((history, idx) => {
                    if (!history) return;
                    recentActivity.push({
                        id: `${issue._id}-sh-${idx}`,
                        taskId: issue._id,
                        title: `Task status: ${history.status || 'Updated'}`,
                        issueTitle: issue.title || 'Task',
                        status: history.status || issue.status,
                        timestamp: history.changedAt || issue.updatedAt || new Date(),
                        who: 'Worker'
                    });
                });
            } else {
                recentActivity.push({
                    id: `${issue._id}-created`,
                    taskId: issue._id,
                    title: `Task assigned: ${issue.title || 'Task'}`,
                    issueTitle: issue.title || 'Task',
                    status: issue.status || 'assigned',
                    timestamp: issue.assignedAt || issue.createdAt || new Date(),
                    who: 'System'
                });
            }
        });

        recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        recentActivity = recentActivity.slice(0, 8);

        // Unread notifications count
        let unreadNotifications = 0;
        try {
            unreadNotifications = await Notification.countDocuments({ user: workerId, read: false });
        } catch (nErr) {
            console.error("Unread notifications count notice:", nErr.message);
        }

        res.json({
            stats: {
                assignedTasks,
                inProgress,
                completed,
                urgentTasks,
                newTodayCount,
                completionRate
            },
            todayTasks,
            nearbyTasks,
            recentActivity,
            unreadNotifications,
            worker: {
                _id: req.user._id,
                name: req.user.name || req.user.username || 'Worker',
                email: req.user.email || '',
                role: req.user.role || 'worker',
                department: req.user.department || 'Field Operations',
                dutyStatus: req.user.dutyStatus || 'on_duty'
            }
        });
    } catch (err) {
        console.error("getWorkerDashboard error:", err);
        res.status(500).json({ message: "Unable to load dashboard data." });
    }
};

const getTaskById = async (req, res) => {
    try {
        if (!req.user || (req.user.role !== 'worker' && req.user.role !== 'admin')) {
            return res.status(403).json({ message: "Access denied" });
        }

        const id = req.params.id;
        const mongoose = require('mongoose');
        let issue = null;

        if (mongoose.Types.ObjectId.isValid(id)) {
            issue = await Issue.findById(id)
                .populate('createdBy', 'name email phone')
                .populate('assignedTo', 'name email department');
        }

        if (!issue) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.json(issue);
    } catch (err) {
        console.error("getTaskById error:", err);
        res.status(500).json({ message: "Server error fetching task" });
    }
};

const startTask = async (req, res) => {
    try {
        if (req.user.role !== 'worker' && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        const mongoose = require('mongoose');
        let issue = null;
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            issue = await Issue.findById(req.params.id);
        }

        if (!issue) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (issue.assignedTo && issue.assignedTo.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Not authorized. Task is assigned to another worker." });
        }

        issue.status = 'in_progress';
        if (!issue.timeline) issue.timeline = [];
        issue.timeline.push({
            at: new Date(),
            who: req.user.name || req.user.username || 'Worker',
            text: 'Started task execution',
            status: 'in_progress'
        });

        if (!issue.statusHistory) issue.statusHistory = [];
        issue.statusHistory.push({
            status: 'in_progress',
            changedBy: req.user._id,
            changedAt: new Date(),
            comment: 'Worker started task'
        });

        await issue.save();

        if (issue.createdBy) {
            try {
                await Notification.create({
                    user: issue.createdBy,
                    type: 'status_update',
                    title: 'Work Started on Your Issue',
                    message: `A field worker has started working on "${issue.title}".`,
                    issue: issue._id,
                    read: false
                });
            } catch (nErr) {
                console.error("Notification creation notice:", nErr);
            }
        }

        res.json(issue);
    } catch (err) {
        console.error("startTask error:", err);
        res.status(500).json({ message: "Server error starting task" });
    }
};

const completeTask = async (req, res) => {
    try {
        if (req.user.role !== 'worker' && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        const mongoose = require('mongoose');
        let issue = null;
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            issue = await Issue.findById(req.params.id);
        }

        const proofPath = req.file ? `/uploads/${req.file.filename}` : req.body.resolutionProof;
        const resolutionNotes = req.body.resolutionNotes || req.body.notes || 'Task completed successfully.';

        if (!issue) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (issue.assignedTo && issue.assignedTo.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Not authorized. Task is assigned to another worker." });
        }

        issue.status = 'resolved';
        if (proofPath) issue.resolutionProof = proofPath;
        if (resolutionNotes) issue.resolutionNotes = resolutionNotes;
        issue.resolvedBy = req.user._id;
        issue.resolvedAt = new Date();

        if (!issue.timeline) issue.timeline = [];
        issue.timeline.push({
            at: new Date(),
            who: req.user.name || req.user.username || 'Worker',
            text: 'Task completed',
            status: 'resolved'
        });

        if (!issue.statusHistory) issue.statusHistory = [];
        issue.statusHistory.push({
            status: 'resolved',
            changedBy: req.user._id,
            changedAt: new Date(),
            comment: resolutionNotes || 'Worker completed task'
        });

        await issue.save();

        if (issue.createdBy) {
            try {
                await Notification.create({
                    user: issue.createdBy,
                    type: 'status_update',
                    title: 'Task Resolved',
                    message: `Your issue "${issue.title}" has been marked as resolved by the field team.`,
                    issue: issue._id,
                    read: false
                });
            } catch (nErr) {
                console.error("Notification creation notice:", nErr);
            }
        }

        res.json(issue);
    } catch (err) {
        console.error("completeTask error:", err);
        res.status(500).json({ message: "Server error completing task" });
    }
};

const uploadEvidence = async (req, res) => {
    try {
        if (req.user.role !== 'worker' && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        const mongoose = require('mongoose');
        let issue = null;
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            issue = await Issue.findById(req.params.id);
        }

        if (!issue) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (issue.assignedTo && issue.assignedTo.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Not authorized." });
        }

        if (req.file) {
            const imagePath = `/uploads/${req.file.filename}`;
            issue.resolutionProof = imagePath;
            if (!issue.images) issue.images = [];
            issue.images.push(imagePath);

            if (!issue.timeline) issue.timeline = [];
            issue.timeline.push({
                at: new Date(),
                who: req.user.name || req.user.username || 'Worker',
                text: 'Uploaded evidence photo',
                status: issue.status
            });

            await issue.save();
        }

        res.json(issue);
    } catch (err) {
        console.error("uploadEvidence error:", err);
        res.status(500).json({ message: "Server error uploading evidence" });
    }
};

module.exports = {
    getAssignedIssues,
    getWorkerDashboard,
    getTaskById,
    startTask,
    completeTask,
    uploadEvidence
};

