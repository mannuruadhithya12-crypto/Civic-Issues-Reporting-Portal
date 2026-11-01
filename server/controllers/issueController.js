const Issue = require('../models/Issue');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Announcement = require('../models/Announcement');
const mongoose = require('mongoose');
const locationService = require('../services/locationService');
const duplicateService = require('../services/duplicateService');
const issueStatusService = require('../services/issueStatusService');
const slaService = require('../services/slaService');
const notificationService = require('../services/notificationService');
const { analyzeIssueReport } = require('../services/gemini/issueIntelligence');
const { logAudit } = require('../services/auditService');
const { emitDomainEvent } = require('../events/eventEmitter');

exports.getMyTickets = async (req, res) => {
  try {
    const { page = 1, limit = 5, search, status, category, sort } = req.query;
    const query = { createdBy: req.user.id };

    if (status && status !== 'All Status') {
      const s = status.toLowerCase().replace(/\s+/g, '_');
      if (s === 'under_review') {
        query.status = { $in: ['under_review', 'verified', 'reported'] };
      } else if (s === 'in_progress') {
        query.status = { $in: ['in_progress', 'assigned'] };
      } else if (s === 'resolved') {
        query.status = 'resolved';
      } else if (s === 'closed') {
        query.status = { $in: ['closed', 'rejected'] };
      } else {
        query.status = s;
      }
    }

    if (category && category !== 'All Categories') {
      query.department = { $regex: new RegExp(category, 'i') };
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { title: regex },
        { location: regex },
        { locationName: regex },
        { department: regex }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 5);
    const skip = (pageNum - 1) * limitNum;

    let sortObj = { createdAt: -1 };
    if (sort === 'Oldest First') {
      sortObj = { createdAt: 1 };
    }

    const total = await Issue.countDocuments(query);
    const issues = await Issue.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email department");

    // Return structured payload supporting both formats
    res.json({
      success: true,
      issues,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1
      },
      data: issues
    });
  } catch (err) {
    console.error("Error in getMyTickets:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getMySummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const userIssues = await Issue.find({ createdBy: userId });

    const totalReported = userIssues.length;
    const resolved = userIssues.filter(i => ['resolved'].includes((i.status || '').toLowerCase())).length;
    const inProgress = userIssues.filter(i => ['in_progress', 'assigned'].includes((i.status || '').toLowerCase())).length;
    const underReview = userIssues.filter(i => ['under_review', 'verified', 'reported'].includes((i.status || '').toLowerCase())).length;
    const closed = userIssues.filter(i => ['closed', 'rejected'].includes((i.status || '').toLowerCase())).length;

    res.json({
      success: true,
      data: {
        totalReported,
        resolved,
        inProgress,
        underReview,
        closed
      }
    });
  } catch (err) {
    console.error("Error in getMySummary:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.getIssueById = async (req, res) => {
  try {
    const id = req.params.id;
    let issue = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      issue = await Issue.findById(id)
        .populate("createdBy", "name username email")
        .populate("assignedTo", "name username email department dutyStatus")
        .populate("resolvedBy", "name email")
        .populate("duplicateCandidates", "title department status priority locationName coordinates");
    }

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    res.json(issue);
  } catch (err) {
    console.error("getIssueById error:", err.message);
    res.status(500).json({ message: "Server error fetching issue" });
  }
};

exports.getAllIssues = async (req, res) => {
  try {
    const { status, department, category, priority, assignedTo, search, startDate, endDate } = req.query;
    const query = { isDemo: req.isDemo ? true : { $ne: true } };

    if (status) query.status = status;
    const targetDept = department || category;
    if (targetDept) query.department = targetDept;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { locationName: { $regex: search, $options: 'i' } }
      ];
    }

    const issues = await Issue.find(query)
      .populate("createdBy", "name email username")
      .populate("assignedTo", "name email department dutyStatus")
      .populate("resolvedBy", "name email")
      .populate("duplicateCandidates", "title department status priority locationName");

    const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
    issues.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;

      if (aPriority !== bPriority) {
        return bPriority - aPriority; 
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(issues);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.createIssue = async (req, res) => {
  console.log('Received issue submission:', req.body);
  const { title, description, location, coordinates, department, priority, aiAnalysis, citizenConfirmedCategory, citizenConfirmedSeverity, duplicateCandidates } = req.body;
  try {
    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required." });
    }

    let locationName = location;
    let parsedCoordinates = coordinates ? (typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates) : null;
    
    // Normalize coordinates if it's an array [lng, lat] to { longitude, latitude }
    if (Array.isArray(parsedCoordinates) && parsedCoordinates.length === 2) {
      parsedCoordinates = {
        longitude: parsedCoordinates[0],
        latitude: parsedCoordinates[1]
      };
    }

    if (parsedCoordinates && parsedCoordinates.latitude && parsedCoordinates.longitude) {
      try {
        const addr = await locationService.reverseGeocode(parsedCoordinates.latitude, parsedCoordinates.longitude);
        if (addr) locationName = addr;
      } catch (geoErr) {
        console.error('Geocoding error:', geoErr);
      }
    }

    const normPriority = (priority || 'normal').toLowerCase();
    let slaHours = 24 * 7; 
    if (normPriority === 'urgent') slaHours = 24;
    else if (normPriority === 'high') slaHours = 24 * 3;
    else if (normPriority === 'low') slaHours = 24 * 14;

    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);
    const imagePaths = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    // Format coordinates for GeoJSON (Longitude, Latitude)
    const geoJsonCoords = parsedCoordinates ? {
      type: 'Point',
      coordinates: [parsedCoordinates.longitude, parsedCoordinates.latitude]
    } : undefined;

    // Safely parse aiAnalysis
    let parsedAiAnalysis;
    if (aiAnalysis) {
      try {
        parsedAiAnalysis = typeof aiAnalysis === 'string' ? JSON.parse(aiAnalysis) : aiAnalysis;
        if (parsedAiAnalysis) parsedAiAnalysis.analyzedAt = new Date();
      } catch (e) {
        parsedAiAnalysis = undefined;
      }
    }

    // Safely parse duplicateCandidates
    let parsedDuplicateCandidates;
    if (duplicateCandidates && duplicateCandidates !== 'undefined') {
      try {
        parsedDuplicateCandidates = typeof duplicateCandidates === 'string' ? JSON.parse(duplicateCandidates) : duplicateCandidates;
      } catch (e) {
        parsedDuplicateCandidates = undefined;
      }
    }

    const userId = req.user._id || req.user.id;
    const userName = req.user.name || req.user.username || 'Citizen';

    const newIssue = new Issue({
      title: title.trim(),
      description: description.trim(),
      location: locationName || location || 'Municipal Area',
      locationName: locationName || location || 'Municipal Area',
      coordinates: geoJsonCoords,
      images: imagePaths,
      department: department || 'Roads',
      priority: normPriority,
      createdBy: userId,
      slaDeadline,
      status: 'reported',
      isDemo: Boolean(req.isDemo || req.body.isDemo),
      timeline: [{
        who: userName,
        text: 'Issue reported',
        status: 'reported'
      }],
      statusHistory: [{
        status: 'reported',
        changedBy: userId,
        changedAt: new Date(),
        comment: 'Issue reported'
      }],
      aiAnalysis: parsedAiAnalysis,
      citizenConfirmedCategory,
      citizenConfirmedSeverity,
      duplicateCandidates: parsedDuplicateCandidates
    });

    const savedIssue = await newIssue.save();
    
    emitDomainEvent('issue.created', {
      issueId: savedIssue._id,
      title: savedIssue.title,
      category: savedIssue.department,
      priority: savedIssue.priority,
      location: savedIssue.locationName || savedIssue.location,
      userId: userId
    }, req);

    res.status(201).json(savedIssue);
  } catch (err) {
    console.error("Error creating issue:", err);
    res.status(500).json({ message: err.message || "Server error submitting issue" });
  }
};

exports.updateStatus = async (req, res) => {
  const { status } = req.body;
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    issue.status = status;
    if (!issue.timeline) issue.timeline = [];
    issue.timeline.push({
      at: new Date(),
      who: req.user.email || req.user.name,
      text: `Status changed to ${status}`,
      status: status
    });

    await issue.save();
    res.json(issue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.addComment = async (req, res) => {
  const { text } = req.body;
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    const comment = {
      text,
      by: req.user.email || req.user.name,
      at: new Date()
    };

    if (!issue.comments) issue.comments = [];
    issue.comments.push(comment);

    await issue.save();
    res.json(issue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updatePriority = async (req, res) => {
  const { priority } = req.body;
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    issue.priority = priority;
    if (!issue.timeline) issue.timeline = [];
    issue.timeline.push({
      at: new Date(),
      who: req.user.email || req.user.name,
      text: `Priority changed to ${priority}`
    });

    await issue.save();
    res.json(issue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---- SPRINT 3 OPERATIONAL WORKFLOW ----

exports.verifyIssue = async (req, res) => {
    try {
        const issue = await Issue.findById(req.params.id);
        if (!issue) return res.status(404).json({ message: "Issue not found" });

        if (!issueStatusService.canTransition(issue.status, 'verified')) {
            return res.status(400).json({ message: `Cannot transition from ${issue.status} to verified` });
        }

        issue.status = 'verified';
        issue.verifiedAt = new Date();
        issue.verifiedBy = req.user.id;

        // Create SLA based on priority when verified
        issue.sla = slaService.calculateSLA(issue.priority);

        issue.statusHistory.push({
            status: 'verified',
            changedBy: req.user.id,
            changedAt: new Date(),
            comment: 'Admin verified issue'
        });

        await issue.save();

        await logAudit({
            req,
            action: 'ISSUE_VERIFY',
            targetType: 'Issue',
            targetId: issue._id,
            targetLabel: issue.title,
            details: { priority: issue.priority, slaDueAt: issue.sla?.dueAt }
        });

        res.json(issue);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.assignWorker = async (req, res) => {
  const { assignedTo } = req.body;
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    // Validate worker exists and is authorized
    if (assignedTo) {
      const worker = await User.findById(assignedTo);
      if (!worker || worker.role !== 'worker') {
        return res.status(400).json({ message: "Assigned user must be a valid field worker" });
      }
    }

    if (!issueStatusService.canTransition(issue.status, 'assigned')) {
        return res.status(400).json({ message: `Cannot transition from ${issue.status} to assigned` });
    }

    if (issue.status === 'reported') {
        issue.sla = slaService.calculateSLA(issue.priority);
    }

    issue.assignedTo = assignedTo; // ObjectId
    issue.status = 'assigned';
    issue.assignedAt = new Date();
    issue.assignedBy = req.user.id;

    if (!issue.timeline) issue.timeline = [];
    issue.timeline.push({
      at: new Date(),
      who: req.user.email || req.user.name || 'Admin',
      text: `Assigned to worker`
    });

    issue.statusHistory.push({
        status: 'assigned',
        changedBy: req.user.id,
        changedAt: new Date(),
        comment: 'Admin assigned issue'
    });

    await issue.save();

    await logAudit({
        req,
        action: 'WORKER_ASSIGNMENT',
        targetType: 'Issue',
        targetId: issue._id,
        targetLabel: issue.title,
        details: { assignedWorkerId: assignedTo }
    });

    // Notify worker
    if (assignedTo) {
      await notificationService.createNotification(
          assignedTo,
          'new_assignment',
          'New Task Assigned',
          `You have been assigned to: ${issue.title}`,
          issue._id
      );
    }

    emitDomainEvent('issue.assigned', {
      issueId: issue._id,
      title: issue.title,
      assignedTo,
      targetType: 'Issue',
      targetId: issue._id
    }, req);

    res.json(issue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.startWork = async (req, res) => {
    try {
        const mongoose = require('mongoose');
        let issue = null;
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            issue = await Issue.findById(req.params.id);
        }

        if (!issue) {
            return res.status(404).json({ message: "Issue not found" });
        }

        const isWorker = req.user.role === 'worker';
        const isAdmin = req.user.role === 'admin';
        if (!isWorker && !isAdmin) {
            return res.status(403).json({ message: "Not authorized. Field worker or administrator privileges required." });
        }

        const currentUserId = (req.user._id || req.user.id).toString();
        const assignedId = issue.assignedTo ? (issue.assignedTo._id || issue.assignedTo).toString() : null;

        if (isWorker && (!assignedId || assignedId !== currentUserId)) {
            return res.status(403).json({ message: "Not authorized. Only the assigned worker can start work." });
        }

        if (issue.status !== 'in_progress' && !issueStatusService.canTransition(issue.status, 'in_progress')) {
            return res.status(400).json({ message: `Cannot transition from ${issue.status} to in_progress` });
        }

        issue.status = 'in_progress';
        if (!issue.statusHistory) issue.statusHistory = [];
        issue.statusHistory.push({
            status: 'in_progress',
            changedBy: req.user.id || req.user._id,
            changedAt: new Date(),
            comment: 'Worker started work'
        });

        await issue.save();

        emitDomainEvent('task.started', {
            issueId: issue._id,
            title: issue.title,
            userId: req.user.id || req.user._id,
            targetType: 'Issue',
            targetId: issue._id
        }, req);

        res.json(issue);
    } catch (err) {
        console.error("startWork error:", err.message);
        res.status(500).json({ message: "Server error starting task" });
    }
};

exports.resolveIssue = async (req, res) => {
    try {
        const mongoose = require('mongoose');
        let issue = null;
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            issue = await Issue.findById(req.params.id);
        }

        if (!issue) {
            return res.status(404).json({ message: "Issue not found" });
        }

        const isWorker = req.user.role === 'worker';
        const isAdmin = req.user.role === 'admin';
        if (!isWorker && !isAdmin) {
            return res.status(403).json({ message: "Not authorized. Field worker or administrator privileges required." });
        }

        const currentUserId = (req.user._id || req.user.id).toString();
        const assignedId = issue.assignedTo ? (issue.assignedTo._id || issue.assignedTo).toString() : null;

        if (isWorker && (!assignedId || assignedId !== currentUserId)) {
            return res.status(403).json({ message: "Not authorized. Only the assigned worker can resolve." });
        }

        if (issue.status !== 'resolved' && !issueStatusService.canTransition(issue.status, 'resolved')) {
            return res.status(400).json({ message: `Cannot transition from ${issue.status} to resolved` });
        }

        const proofPath = req.file ? `/uploads/${req.file.filename}` : null;
        if (!proofPath && !req.body.resolutionNotes && !req.body.notes) {
            return res.status(400).json({ message: "Proof image or resolution notes are required" });
        }

        issue.status = 'resolved';
        if (proofPath) {
            issue.resolutionProof = proofPath;
            if (!issue.proofOfWork) issue.proofOfWork = [];
            issue.proofOfWork.push(proofPath);
        }
        if (req.body.resolutionNotes || req.body.notes) {
            issue.resolutionNotes = req.body.resolutionNotes || req.body.notes;
        }
        issue.resolvedBy = req.user.id || req.user._id;
        issue.resolvedAt = new Date();

        if (!issue.statusHistory) issue.statusHistory = [];
        issue.statusHistory.push({
            status: 'resolved',
            changedBy: req.user.id || req.user._id,
            changedAt: new Date(),
            comment: 'Worker resolved issue'
        });

        await issue.save();

        emitDomainEvent('task.completed', {
            issueId: issue._id,
            title: issue.title,
            userId: issue.createdBy,
            targetType: 'Issue',
            targetId: issue._id
        }, req);

        if (issue.createdBy) {
            try {
                await notificationService.createNotification(
                    issue.createdBy,
                    'status_update',
                    'Issue Resolved',
                    `Your issue "${issue.title}" has been resolved. Please verify.`,
                    issue._id
                );
            } catch (nErr) {
                console.error("Notification notice:", nErr);
            }
        }

        res.json(issue);
    } catch (err) {
        console.error("resolveIssue error:", err.message);
        res.status(500).json({ message: "Server error resolving issue" });
    }
};

exports.closeIssue = async (req, res) => {
    try {
        const issue = await Issue.findById(req.params.id);
        if (!issue) return res.status(404).json({ message: "Issue not found" });

        const creatorId = issue.createdBy?._id?.toString() || issue.createdBy?.toString();
        const currentUserId = (req.user._id || req.user.id).toString();

        if ((!creatorId || creatorId !== currentUserId) && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Not authorized. Only the reporter or admin can close." });
        }

        if (!issueStatusService.canTransition(issue.status, 'closed')) {
            return res.status(400).json({ message: `Cannot transition from ${issue.status} to closed` });
        }

        issue.status = 'closed';
        issue.closedAt = new Date();
        issue.closedBy = req.user.id;
        
        issue.citizenVerification = {
            status: 'approved',
            verifiedAt: new Date(),
            comment: req.body.comment || ''
        };

        issue.statusHistory.push({
            status: 'closed',
            changedBy: req.user.id,
            changedAt: new Date(),
            comment: 'Citizen confirmed resolution and closed issue'
        });

        await issue.save();
        res.json(issue);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.reopenIssue = async (req, res) => {
    try {
        const issue = await Issue.findById(req.params.id);
        if (!issue) return res.status(404).json({ message: "Issue not found" });

        const creatorId = issue.createdBy?._id?.toString() || issue.createdBy?.toString();
        const currentUserId = (req.user._id || req.user.id).toString();

        if ((!creatorId || creatorId !== currentUserId) && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Not authorized. Only the reporter or admin can reopen." });
        }

        if (!issueStatusService.canTransition(issue.status, 'reopened')) {
            return res.status(400).json({ message: `Cannot transition from ${issue.status} to reopened` });
        }

        issue.status = 'reopened';
        
        issue.citizenVerification = {
            status: 'rejected',
            verifiedAt: new Date(),
            comment: req.body.comment || ''
        };

        // NEW SLA CYCLE on Reopen as per user decision
        issue.sla = slaService.calculateSLA(issue.priority);

        issue.statusHistory.push({
            status: 'reopened',
            changedBy: req.user.id,
            changedAt: new Date(),
            comment: `Citizen rejected resolution: ${req.body.comment || ''}`
        });

        await issue.save();

        // Notify worker that issue was reopened
        if (issue.assignedTo) {
            await notificationService.createNotification(
                issue.assignedTo,
                'status_update',
                'Issue Reopened',
                `The citizen rejected the resolution for "${issue.title}".`,
                issue._id
            );
        }

        res.json(issue);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.addImages = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    const newImagePaths = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    if (!issue.images) issue.images = [];
    issue.images = issue.images.concat(newImagePaths);

    await issue.save();
    res.json(issue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.checkDuplicates = async (req, res) => {
  const {
    latitude,
    lat,
    longitude,
    lng,
    lon,
    category,
    department,
    title,
    description,
    radius,
    radiusMeters,
    excludeIssueId
  } = req.body;

  const targetLat = latitude !== undefined ? latitude : lat;
  const targetLon = longitude !== undefined ? longitude : (lng !== undefined ? lng : lon);

  if (targetLat === undefined || targetLon === undefined) {
    return res.status(400).json({
      success: false,
      message: "Latitude and longitude are required."
    });
  }

  try {
    const result = await duplicateService.findDuplicates({
      latitude: targetLat,
      longitude: targetLon,
      title: title || '',
      description: description || '',
      category: category || department,
      department: department || category,
      radiusMeters: radiusMeters || radius || 300,
      excludeIssueId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    if (req.user) {
      await logAudit({
        req,
        action: 'AI_DUPLICATE_CHECK',
        targetType: 'DUPLICATE_EVALUATION',
        details: {
          hasDuplicates: result.hasDuplicates,
          candidateCount: result.candidates?.length || 0,
          aiAvailable: result.aiAvailable,
          modelVersion: result.modelVersion
        }
      });
    }

    res.json(result);
  } catch (err) {
    console.error("Error checking duplicates:", err);
    res.status(500).json({
      success: false,
      message: "Server error checking duplicates"
    });
  }
};

// In-memory sliding window rate limiter for /ai-assist: 20 reqs / min per user/IP
const aiAssistRateLimit = new Map();
const AI_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const AI_RATE_LIMIT_MAX = 20;

exports.aiAssist = async (req, res) => {
  try {
    const userId = (req.user && (req.user._id || req.user.id)) || req.ip;
    const now = Date.now();

    // Check rate limit
    let userRequests = aiAssistRateLimit.get(userId) || [];
    userRequests = userRequests.filter(timestamp => now - timestamp < AI_RATE_LIMIT_WINDOW_MS);
    if (userRequests.length >= AI_RATE_LIMIT_MAX) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded for AI assistance. Please wait a moment before trying again.'
      });
    }
    userRequests.push(now);
    aiAssistRateLimit.set(userId, userRequests);

    const { title, description, department, category, language } = req.body || {};

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Description is required for AI assistance.'
      });
    }

    if (description.length > 3000) {
      return res.status(400).json({
        success: false,
        message: 'Description exceeds maximum allowed length of 3000 characters.'
      });
    }

    if (title && (typeof title !== 'string' || title.length > 200)) {
      return res.status(400).json({
        success: false,
        message: 'Title must not exceed 200 characters.'
      });
    }

    const result = await analyzeIssueReport({
      title: title || '',
      description: description.trim(),
      department: department || '',
      category: category || '',
      language: language || 'en'
    });

    if (!result.available) {
      return res.json({
        success: false,
        available: false,
        message: result.message || 'AI issue assistance is currently unavailable.',
        suggestions: null
      });
    }

    const requestId = `ai_req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return res.json({
      success: true,
      available: true,
      requestId,
      model: result.model,
      original: result.original,
      suggestions: result.suggestions,
      limitations: result.suggestions.limitations || []
    });

  } catch (error) {
    console.error('aiAssist controller error:', error.message || error);
    // Never expose stack trace or API credentials
    return res.status(500).json({
      success: false,
      message: 'Failed to process AI issue assistance.',
      error: error.code || 'AI_PROCESSING_ERROR'
    });
  }
};

exports.bulkUpdate = async (req, res) => {
  const { ids, status } = req.body;
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Invalid issue IDs" });
    }

    const result = await Issue.updateMany(
      { _id: { $in: ids } },
      {
        $set: { status },
        $push: {
          timeline: {
            at: new Date(),
            who: req.user.email || req.user.name,
            text: `Bulk status update to ${status}`,
            status: status
          }
        }
      }
    );

    res.json({ message: `Updated ${result.modifiedCount} issues`, count: result.modifiedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.exportCsv = async (req, res) => {
  try {
    const issues = await Issue.find().populate("createdBy", "name email");

    const csvHeader = "ID,Title,Description,Department,Status,Priority,Location,Assigned To,Created By,Created At\n";
    const csvRows = issues.map(issue => {
      const row = [
        issue._id,
        `"${(issue.title || '').replace(/"/g, '""')}"`,
        `"${(issue.description || '').replace(/"/g, '""')}"`,
        issue.department || 'Other',
        issue.status || 'open',
        issue.priority || 'normal',
        `"${(issue.locationName || issue.location || '').replace(/"/g, '""')}"`,
        issue.assignedTo || 'Unassigned',
        issue.createdBy ? (issue.createdBy.name || issue.createdBy.email) : 'Unknown',
        new Date(issue.createdAt).toISOString()
      ];
      return row.join(',');
    });

    const csv = csvHeader + csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=issues-${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getNearbyIssues = async (req, res) => {
  try {
    const issues = await Issue.find().populate("createdBy", "name email");
    const validIssues = issues.filter(issue => {
      if (issue.coordinates) {
        if (Array.isArray(issue.coordinates) && issue.coordinates.length === 2) return true;
        if (issue.coordinates.coordinates && Array.isArray(issue.coordinates.coordinates) && issue.coordinates.coordinates.length === 2) return true;
      }
      return false;
    });
    res.json(validIssues);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching nearby issues" });
  }
};

const MOCK_DEMO_ISSUES = [
  {
    _id: "demo_issue_101",
    title: "Hazardous Deep Pothole on MG Road Junction",
    description: "Large deep pothole creating severe traffic congestion and danger for commuters.",
    locationName: "MG Road, Central Sector",
    location: "MG Road, Central Sector",
    department: "Roads & Maintenance",
    category: "Pothole",
    status: "in_progress",
    priority: "high",
    createdAt: new Date(Date.now() - 2 * 3600 * 1000),
    images: ["https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80"],
    coordinates: [77.5946, 12.9716]
  },
  {
    _id: "demo_issue_102",
    title: "Overflowing Garbage Bin & Littering",
    description: "Community waste container overflowing near public park entrance.",
    locationName: "Indiranagar 100ft Road",
    location: "Indiranagar 100ft Road",
    department: "Sanitation & Waste",
    category: "Garbage",
    status: "resolved",
    priority: "medium",
    createdAt: new Date(Date.now() - 14 * 3600 * 1000),
    resolvedAt: new Date(Date.now() - 2 * 3600 * 1000),
    images: ["https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=80"],
    coordinates: [77.6412, 12.9784]
  },
  {
    _id: "demo_issue_103",
    title: "Broken Streetlight Near Pedestrian Crossing",
    description: "Streetlight fixture broken and dark at night near high school.",
    locationName: "Koramangala 5th Block",
    location: "Koramangala 5th Block",
    department: "Electrical & Lighting",
    category: "Streetlight",
    status: "reported",
    priority: "medium",
    createdAt: new Date(Date.now() - 28 * 3600 * 1000),
    images: ["https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80"],
    coordinates: [77.6245, 12.9352]
  },
  {
    _id: "demo_issue_104",
    title: "Major Water Pipe Leakage on Main Avenue",
    description: "Main supply pipe ruptured causing water logging across two lanes.",
    locationName: "Jayanagar 4th Block",
    location: "Jayanagar 4th Block",
    department: "Water Supply & Drainage",
    category: "Water Leakage",
    status: "assigned",
    priority: "high",
    createdAt: new Date(Date.now() - 40 * 3600 * 1000),
    images: ["https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?w=600&auto=format&fit=crop&q=80"],
    coordinates: [77.5810, 12.9250]
  },
  {
    _id: "demo_issue_105",
    title: "Blocked Storm Drain Damaging Road Surface",
    description: "Stormwater drain choked with fallen branches and plastic debris.",
    locationName: "Whitefield Inner Circle",
    location: "Whitefield Inner Circle",
    department: "Water Supply & Drainage",
    category: "Drainage",
    status: "verified",
    priority: "normal",
    createdAt: new Date(Date.now() - 52 * 3600 * 1000),
    images: ["https://images.unsplash.com/photo-1584467735815-f778f274e296?w=600&auto=format&fit=crop&q=80"],
    coordinates: [77.7499, 12.9698]
  }
];

const MOCK_DEMO_ANNOUNCEMENTS = [
  {
    _id: "demo_ann_101",
    title: "Annual Citywide Cleanliness Drive 2026",
    content: "Join municipal teams and citizen volunteers this weekend for the community cleanliness initiative.",
    date: new Date(),
    category: "Community Event"
  },
  {
    _id: "demo_ann_102",
    title: "Scheduled Utility & Water Supply Maintenance",
    content: "Upgrades to water pipelines scheduled for Sunday from 10:00 AM to 2:00 PM in Central Sector.",
    date: new Date(Date.now() - 86400000),
    category: "Utility Update"
  },
  {
    _id: "demo_ann_103",
    title: "AI Issue Dup Detection System Deployed",
    content: "Citizens get instant notification if an issue in their vicinity has already been reported.",
    date: new Date(Date.now() - 172800000),
    category: "Platform Notice"
  }
];

exports.getCitizenDashboard = async (req, res) => {
  try {
    const allIssues = await Issue.find()
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email department");
      
    const allAnnouncements = await Announcement.find({ active: true }).sort({ date: -1 }).limit(5);

    const reportedCount = allIssues.length;
    const resolvedIssues = allIssues.filter(i => i.status === 'resolved' || i.status === 'closed');
    const resolvedCount = resolvedIssues.length;

    const activeCitizensCount = await User.countDocuments({ role: 'citizen' });

    let avgResolutionDays = "2.3 days";
    if (resolvedIssues.length > 0) {
      const totalMs = resolvedIssues.reduce((sum, issue) => {
        const end = issue.resolvedAt || issue.closedAt || new Date();
        const start = new Date(issue.createdAt);
        return sum + Math.max(0, new Date(end) - start);
      }, 0);
      const avgMs = totalMs / resolvedIssues.length;
      const days = (avgMs / (1000 * 60 * 60 * 24)).toFixed(1);
      avgResolutionDays = `${days} days`;
    }

    const recentIssues = [...allIssues]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    const nearbyIssues = allIssues.filter(issue => {
      if (issue.coordinates) {
        if (Array.isArray(issue.coordinates) && issue.coordinates.length === 2) return true;
        if (issue.coordinates.coordinates && Array.isArray(issue.coordinates.coordinates) && issue.coordinates.coordinates.length === 2) return true;
      }
      return false;
    });

    let unreadCount = 2;
    if (req.user && req.user.id) {
      const actualUnread = await Notification.countDocuments({ user: req.user.id, read: false });
      if (actualUnread > 0) unreadCount = actualUnread;
    }

    res.json({
      stats: {
        issuesReported: reportedCount,
        issuesResolved: resolvedCount,
        activeCitizens: activeCitizensCount,
        avgResolutionTime: avgResolutionDays,
        reportedPercentChange: 0
      },
      recentIssues: recentIssues,
      nearbyIssues: nearbyIssues,
      unreadNotificationsCount: unreadCount,
      announcements: allAnnouncements
    });
  } catch (err) {
    console.error("Dashboard endpoint error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getMapData = async (req, res) => {
  try {
    const { search, category, status, timeRange, lat, lng } = req.query;
    const query = {};

    // 1. Search Filter (title, description, location, locationName, department, _id)
    if (search && search.trim()) {
      const term = search.trim();
      const regex = new RegExp(term, 'i');
      query.$or = [
        { title: regex },
        { description: regex },
        { location: regex },
        { locationName: regex },
        { department: regex }
      ];
      if (term.match(/^[0-9a-fA-F]{24}$/)) {
        query.$or.push({ _id: term });
      }
    }

    // 2. Category Filter
    if (category && category !== 'All Categories' && category !== 'all') {
      query.department = { $regex: new RegExp(`^${category}`, 'i') };
    }

    // 3. Status Filter
    if (status && status !== 'All Status' && status !== 'all') {
      const s = status.toLowerCase().replace(/\s+/g, '_');
      if (s === 'reported') {
        query.status = 'reported';
      } else if (s === 'under_review' || s === 'under review') {
        query.status = { $in: ['under_review', 'verified'] };
      } else if (s === 'in_progress' || s === 'in progress') {
        query.status = { $in: ['in_progress', 'assigned'] };
      } else if (s === 'resolved') {
        query.status = 'resolved';
      } else if (s === 'closed') {
        query.status = { $in: ['closed', 'rejected'] };
      } else {
        query.status = s;
      }
    }

    // 4. Time Range Filter
    if (timeRange && timeRange !== 'All Time' && timeRange !== 'all') {
      const now = new Date();
      let startDate = null;
      if (timeRange === 'Today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (timeRange === 'This Week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (timeRange === 'This Month') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (timeRange === 'Last 3 Months') {
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      }

      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }

    // Fetch matching issues
    const allMatchingIssues = await Issue.find(query)
      .populate("createdBy", "name email username")
      .populate("assignedTo", "name email department")
      .sort({ createdAt: -1 });

    const userLat = lat ? parseFloat(lat) : null;
    const userLng = lng ? parseFloat(lng) : null;
    const hasUserLocation = userLat !== null && userLng !== null && !isNaN(userLat) && !isNaN(userLng);

    function getDistanceMeters(lat1, lon1, lat2, lon2) {
      const R = 6371e3;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    const issuesWithCoords = [];

    allMatchingIssues.forEach(issue => {
      let itemLat = null;
      let itemLng = null;

      if (issue.coordinates) {
        if (issue.coordinates.coordinates && Array.isArray(issue.coordinates.coordinates) && issue.coordinates.coordinates.length === 2) {
          // Standard GeoJSON Point is [longitude, latitude]
          itemLng = issue.coordinates.coordinates[0];
          itemLat = issue.coordinates.coordinates[1];
        } else if (Array.isArray(issue.coordinates) && issue.coordinates.length === 2) {
          const val0 = issue.coordinates[0];
          const val1 = issue.coordinates[1];
          if (Math.abs(val0) > 90 && Math.abs(val1) <= 90) {
            itemLng = val0;
            itemLat = val1;
          } else if (Math.abs(val1) > 90 && Math.abs(val0) <= 90) {
            itemLat = val0;
            itemLng = val1;
          } else {
            // Default GeoJSON convention [longitude, latitude]
            itemLng = val0;
            itemLat = val1;
          }
        }
      }

      if (itemLat !== null && itemLng !== null && !isNaN(itemLat) && !isNaN(itemLng) && itemLat >= -90 && itemLat <= 90 && itemLng >= -180 && itemLng <= 180) {
        let distance = null;
        if (hasUserLocation) {
          distance = getDistanceMeters(userLat, userLng, itemLat, itemLng);
        }

        const issueObj = issue.toObject();
        issueObj.lat = itemLat;
        issueObj.lng = itemLng;
        issueObj.distance = distance;
        issuesWithCoords.push(issueObj);
      }
    });

    const finalIssues = issuesWithCoords;

    const nearbyIssues = [...finalIssues];
    if (hasUserLocation) {
      nearbyIssues.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    const totalCount = allMatchingIssues.length;
    const resolvedCount = allMatchingIssues.filter(i => ['resolved', 'closed'].includes((i.status || '').toLowerCase())).length;
    const inProgressCount = allMatchingIssues.filter(i => ['in_progress', 'assigned'].includes((i.status || '').toLowerCase())).length;

    const uniqueAreas = new Set();
    allMatchingIssues.forEach(i => {
      const loc = i.locationName || i.location;
      if (loc && loc.trim()) {
        const areaName = loc.split(',')[0].trim();
        if (areaName) uniqueAreas.add(areaName.toLowerCase());
      }
    });

    res.json({
      success: true,
      issues: finalIssues,
      nearbyIssues: nearbyIssues,
      total: totalCount,
      statistics: {
        total: totalCount,
        resolved: resolvedCount,
        inProgress: inProgressCount,
        activeAreas: uniqueAreas.size
      }
    });
  } catch (err) {
    console.error("Error in getMapData:", err);
    res.status(500).json({ success: false, message: "Server error loading map data" });
  }
};

