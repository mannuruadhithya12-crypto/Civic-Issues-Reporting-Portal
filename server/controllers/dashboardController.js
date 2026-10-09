// server/controllers/dashboardController.js
const Issue = require('../models/Issue');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { calculateSLARisk } = require('../services/slaRiskService');

exports.getOverview = async (req, res) => {
  try {
    const [
      totalIssues,
      pendingCount,
      inProgressCount,
      resolvedCount,
      urgentCount,
      workers
    ] = await Promise.all([
      Issue.countDocuments(),
      Issue.countDocuments({ status: { $in: ['reported', 'verified', 'reopened'] } }),
      Issue.countDocuments({ status: { $in: ['assigned', 'in_progress'] } }),
      Issue.countDocuments({ status: { $in: ['resolved', 'closed'] } }),
      Issue.countDocuments({ priority: { $in: ['urgent', 'high'] }, status: { $nin: ['resolved', 'closed'] } }),
      User.find({ role: 'worker' }).select('_id dutyStatus')
    ]);

    const activeWorkers = workers.filter(w => w.dutyStatus === 'on_duty').length;

    res.json({
      freshness: new Date().toISOString(),
      stats: {
        totalIssues,
        pendingCount,
        inProgressCount,
        resolvedCount,
        urgentCount,
        totalWorkers: workers.length,
        activeWorkers
      }
    });
  } catch (err) {
    console.error("Dashboard Overview Error:", err);
    res.status(500).json({ error: "Server error fetching dashboard overview" });
  }
};

exports.getKpis = async (req, res) => {
  try {
    const totalIssues = await Issue.countDocuments();
    const resolvedIssues = await Issue.find({ status: { $in: ['resolved', 'closed'] } });

    let totalResolutionHours = 0;
    resolvedIssues.forEach(issue => {
      if (issue.createdAt && issue.updatedAt) {
        totalResolutionHours += (new Date(issue.updatedAt) - new Date(issue.createdAt)) / (1000 * 60 * 60);
      }
    });

    const avgResolutionHours = resolvedIssues.length > 0 
      ? Math.round((totalResolutionHours / resolvedIssues.length) * 10) / 10 
      : 0;

    const activeIssues = await Issue.find({ status: { $nin: ['resolved', 'closed', 'rejected'] } });
    let breachedCount = 0;
    activeIssues.forEach(issue => {
      const risk = calculateSLARisk(issue);
      if (risk.status === 'BREACHED') breachedCount++;
    });

    const slaComplianceRate = activeIssues.length > 0
      ? Math.round(((activeIssues.length - breachedCount) / activeIssues.length) * 100)
      : 100;

    res.json({
      freshness: new Date().toISOString(),
      kpis: {
        totalIssues,
        resolvedCount: resolvedIssues.length,
        avgResolutionHours,
        slaComplianceRate,
        breachedCount
      }
    });
  } catch (err) {
    console.error("Dashboard KPIs Error:", err);
    res.status(500).json({ error: "Server error fetching KPIs" });
  }
};

exports.getStatusBreakdown = async (req, res) => {
  try {
    const statusCounts = await Issue.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {};
    statusCounts.forEach(sc => {
      result[sc._id] = sc.count;
    });

    res.json({
      freshness: new Date().toISOString(),
      statusBreakdown: result
    });
  } catch (err) {
    console.error("Dashboard Status Error:", err);
    res.status(500).json({ error: "Server error fetching status breakdown" });
  }
};

exports.getSlaStatus = async (req, res) => {
  try {
    const activeIssues = await Issue.find({
      status: { $in: ['reported', 'verified', 'assigned', 'in_progress', 'reopened'] }
    }).select('title department status priority createdAt assignedAt sla');

    let onTrack = 0;
    let atRisk = 0;
    let breached = 0;
    const issueRisks = [];

    activeIssues.forEach(issue => {
      const risk = calculateSLARisk(issue);
      if (risk.status === 'ON_TRACK') onTrack++;
      else if (risk.status === 'AT_RISK') atRisk++;
      else if (risk.status === 'BREACHED') breached++;

      issueRisks.push({
        issueId: issue._id,
        title: issue.title,
        department: issue.department,
        status: issue.status,
        slaStatus: risk.status,
        remainingHours: risk.remainingHours
      });
    });

    res.json({
      freshness: new Date().toISOString(),
      summary: {
        onTrack,
        atRisk,
        breached,
        totalActive: activeIssues.length
      },
      issues: issueRisks
    });
  } catch (err) {
    console.error("Dashboard SLA Error:", err);
    res.status(500).json({ error: "Server error fetching SLA status" });
  }
};

exports.getWorkers = async (req, res) => {
  try {
    const workers = await User.find({ role: 'worker' }).select('-password').lean();
    const workerIds = workers.map(w => w._id);
    const issues = await Issue.find({ assignedTo: { $in: workerIds } }).select('assignedTo status priority sla').lean();

    const workersData = workers.map(worker => {
      const wIssues = issues.filter(i => i.assignedTo && i.assignedTo.toString() === worker._id.toString());
      return {
        ...worker,
        dutyStatus: worker.dutyStatus || 'on_duty',
        taskStats: {
          total: wIssues.length,
          active: wIssues.filter(i => ['assigned', 'in_progress'].includes(i.status)).length,
          completed: wIssues.filter(i => ['resolved', 'closed'].includes(i.status)).length
        }
      };
    });

    res.json({
      freshness: new Date().toISOString(),
      count: workersData.length,
      workers: workersData
    });
  } catch (err) {
    console.error("Dashboard Workers Error:", err);
    res.status(500).json({ error: "Server error fetching dashboard workers" });
  }
};

exports.getIssues = async (req, res) => {
  try {
    const { status, priority, department, limit = 50, page = 1 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (department) query.department = department;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [issues, total] = await Promise.all([
      Issue.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('assignedTo', 'name email department')
        .populate('createdBy', 'name email'),
      Issue.countDocuments(query)
    ]);

    res.json({
      freshness: new Date().toISOString(),
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      issues
    });
  } catch (err) {
    console.error("Dashboard Issues Error:", err);
    res.status(500).json({ error: "Server error fetching dashboard issues" });
  }
};

exports.getMapData = async (req, res) => {
  try {
    const geoIssues = await Issue.find({
      'coordinates.coordinates': { $exists: true, $ne: [] }
    }).select('title department priority status locationName coordinates createdAt');

    const validMarkers = [];
    let invalidCount = 0;

    geoIssues.forEach(issue => {
      const coords = issue.coordinates?.coordinates;
      if (Array.isArray(coords) && coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        validMarkers.push({
          issueId: issue._id,
          title: issue.title,
          department: issue.department,
          priority: issue.priority,
          status: issue.status,
          locationName: issue.locationName || '',
          longitude: coords[0],
          latitude: coords[1],
          createdAt: issue.createdAt
        });
      } else {
        invalidCount++;
      }
    });

    res.json({
      freshness: new Date().toISOString(),
      markerCount: validMarkers.length,
      invalidCoordinateCount: invalidCount,
      markers: validMarkers
    });
  } catch (err) {
    console.error("Dashboard Map Error:", err);
    res.status(500).json({ error: "Server error fetching dashboard map data" });
  }
};

exports.getActivity = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('actor', 'name email role');

    const activities = (logs || []).map(l => ({
      id: l._id,
      action: l.action || 'SYSTEM_ACTION',
      user: l.actor ? (l.actor.name || l.actor.email) : (l.actorName || 'System'),
      targetType: l.targetType || 'System',
      targetLabel: l.targetLabel || '',
      timestamp: l.timestamp || l.createdAt || new Date(),
      details: l.details || {}
    }));

    res.json({
      freshness: new Date().toISOString(),
      activities
    });
  } catch (err) {
    console.error("Dashboard Activity Error:", err);
    res.status(500).json({ error: "Server error fetching activity log" });
  }
};
