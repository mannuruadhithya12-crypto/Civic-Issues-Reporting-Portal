const analyticsService = require('../services/analyticsService');
const clusteringService = require('../services/clusteringService');
const ANALYTICS_CONFIG = require('../config/analytics');
const anomalyService = require('../services/anomalyService');
const slaAnalyticsService = require('../services/slaAnalyticsService');
const reportService = require('../services/reportService');
const Issue = require('../models/Issue');

const buildMatchStage = (req) => {
  const { startDate, endDate, category, department, severity, status } = req.query;
  const match = {};

  // Date filtering
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  } else {
    // Default to configured days
    const d = new Date();
    d.setDate(d.getDate() - ANALYTICS_CONFIG.DEFAULT_ANALYTICS_DAYS);
    match.createdAt = { $gte: d };
  }

  // Other filters
  if (category) {
    // Attempt to match either the mapped AI category or department
    match.$or = [
      { 'aiAnalysis.category.value': category },
      { department: category }
    ];
  } else if (department) {
    match.department = department;
  }

  if (severity) match.priority = severity;
  if (status) match.status = status;

  return match;
};

exports.getOverview = async (req, res) => {
  try {
    const matchStage = buildMatchStage(req);
    const overview = await analyticsService.getOverview(matchStage);
    
    // Also get hotspot count quickly
    const { hotspots } = await clusteringService.getHotspots(matchStage);
    overview.hotspotCount = hotspots.length;

    // Get recurring issues count
    const recurring = await clusteringService.getRecurringIssues(matchStage);
    overview.recurringCount = recurring.length;

    res.json(overview);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching analytics overview' });
  }
};

exports.getGeographic = async (req, res) => {
  try {
    const matchStage = buildMatchStage(req);
    const { hotspots, rawClusters } = await clusteringService.getHotspots(matchStage);
    res.json({ hotspots, clusters: rawClusters });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching geographic analytics' });
  }
};

exports.getTrends = async (req, res) => {
  try {
    const matchStage = buildMatchStage(req);
    const granularity = req.query.granularity || ANALYTICS_CONFIG.TREND.DEFAULT_GRANULARITY;
    const trends = await analyticsService.getTrends(matchStage, granularity);
    res.json(trends);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching trend analytics' });
  }
};

exports.getDepartments = async (req, res) => {
  try {
    const matchStage = buildMatchStage(req);
    const departments = await analyticsService.getDepartments(matchStage);
    res.json(departments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching department analytics' });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const matchStage = buildMatchStage(req);
    const categories = await analyticsService.getCategories(matchStage);
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching category analytics' });
  }
};

exports.getRecurring = async (req, res) => {
  try {
    const matchStage = buildMatchStage(req);
    const recurring = await clusteringService.getRecurringIssues(matchStage);
    res.json(recurring);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching recurring analytics' });
  }
};

exports.getSla = async (req, res) => {
  try {
    const matchStage = buildMatchStage(req);
    const sla = await slaAnalyticsService.getSlaAnalytics(matchStage);
    res.json(sla);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching SLA analytics' });
  }
};

exports.getAnomalies = async (req, res) => {
  try {
    const matchStage = buildMatchStage(req);
    const anomalies = await anomalyService.detectAnomalies(matchStage);
    const trend = await anomalyService.getAnomalyTrend(matchStage);
    res.json({ anomalies, trend });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching anomaly analytics' });
  }
};

exports.getReports = async (req, res) => {
  try {
    const reports = await reportService.getReports();
    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching reports' });
  }
};

exports.generateReport = async (req, res) => {
  try {
    const { type, period } = req.body;
    const report = await reportService.createReport(req.user.id, type, period);
    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error generating report' });
  }
};

exports.deleteReport = async (req, res) => {
  try {
    await reportService.deleteReport(req.params.id);
    res.json({ message: 'Report deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting report' });
  }
};

exports.getRealtime = async (req, res) => {
  try {
    // Return recent 20 issues for live feed
    const recentIssues = await Issue.find().sort({ createdAt: -1 }).limit(20);
    
    // Calculate issues per hour over the last 24h
    const matchStage = { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } };
    const [recentStats] = await Issue.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 }
        }
      }
    ]);

    const issuesPerHour = recentStats ? Math.round(recentStats.total / 24) : 0;
    
    // Query genuine count of active users / on-duty personnel from MongoDB
    const User = require('../models/User');
    const activeUsers = await User.countDocuments({ status: { $in: ['active', undefined] } });

    res.json({
      feed: recentIssues,
      activeUsers,
      issuesPerHour,
      systemStatus: 'Online'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching realtime analytics' });
  }
};
