const priorityService = require('../services/priorityService');
const workloadService = require('../services/workloadService');
const recommendationService = require('../services/recommendationService');
const simulationService = require('../services/simulationService');
const { calculateSLARisk } = require('../services/slaRiskService');
const Issue = require('../models/Issue');
const clusteringService = require('../services/clusteringService');
const aiService = require('../services/aiService');
const config = require('../config/decisionSupport');

exports.getOverview = async (req, res) => {
  try {
    const activeIssues = await Issue.find({
      status: { $in: ['reported', 'verified', 'assigned', 'in_progress', 'reopened'] }
    });

    let highPriority = 0;
    let criticalPriority = 0;
    let slaAtRisk = 0;
    let slaBreached = 0;

    // Approximating priority based on existing fields for overview speed
    // A true priority calculation requires getting hotspots/recurring, which we do
    const priorities = await priorityService.getPriorityRankings({});
    priorities.forEach(p => {
      if (p.priorityLevel === 'CRITICAL') criticalPriority++;
      else if (p.priorityLevel === 'HIGH') highPriority++;
      
      if (p.slaStatus === 'AT_RISK') slaAtRisk++;
      if (p.slaStatus === 'BREACHED') slaBreached++;
    });

    const { hotspots } = await clusteringService.getHotspots({});
    const recurring = await clusteringService.getRecurringIssues({});

    res.json({
      totalOpenIssues: activeIssues.length,
      highPriority,
      criticalPriority,
      slaAtRisk,
      slaBreached,
      hotspots: hotspots.length,
      recurringProblems: recurring.length
    });

  } catch (error) {
    console.error("Decision Support Overview Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getPriorities = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const rankings = await priorityService.getPriorityRankings({});
    res.json(rankings.slice(0, limit));
  } catch (error) {
    console.error("Decision Support Priorities Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getSLARisk = async (req, res) => {
  try {
    const activeIssues = await Issue.find({
      status: { $in: ['reported', 'verified', 'assigned', 'in_progress', 'reopened'] }
    });

    let onTrackCount = 0;
    let atRiskCount = 0;
    let breachedCount = 0;
    const affectedDepartments = new Set();
    const affectedIssues = [];

    activeIssues.forEach(issue => {
      const risk = calculateSLARisk(issue);
      if (risk.status === 'ON_TRACK') onTrackCount++;
      else if (risk.status === 'AT_RISK') {
        atRiskCount++;
        affectedDepartments.add(issue.department);
        affectedIssues.push({ issueId: issue._id, title: issue.title, status: 'AT_RISK' });
      }
      else if (risk.status === 'BREACHED') {
        breachedCount++;
        affectedDepartments.add(issue.department);
        affectedIssues.push({ issueId: issue._id, title: issue.title, status: 'BREACHED' });
      }
    });

    res.json({
      onTrackCount,
      atRiskCount,
      breachedCount,
      affectedDepartments: Array.from(affectedDepartments),
      affectedIssues
    });
  } catch (error) {
    console.error("Decision Support SLA Risk Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getWorkload = async (req, res) => {
  try {
    const workloads = await workloadService.getDepartmentWorkload({});
    res.json(workloads);
  } catch (error) {
    console.error("Decision Support Workload Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    // Generate recommendations based on top ranked issues
    const rankings = await priorityService.getPriorityRankings({});
    const recs = recommendationService.getRecommendations(rankings);
    res.json(recs);
  } catch (error) {
    console.error("Decision Support Recommendations Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.simulate = async (req, res) => {
  try {
    const { department, additionalWorkers, capacityPerWorkerPerDay } = req.body;
    
    if (!department) return res.status(400).json({ message: "Department is required" });
    
    const workers = Math.max(0, parseInt(additionalWorkers) || 0);
    const capacity = Math.max(0, parseInt(capacityPerWorkerPerDay) || config.SIMULATION.DEFAULT_WORKER_CAPACITY_PER_DAY);

    const result = await simulationService.runSimulation(department, workers, capacity);
    res.json(result);
  } catch (error) {
    console.error("Decision Support Simulation Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.explain = async (req, res) => {
  try {
    const { contextData } = req.body;
    if (!contextData) return res.status(400).json({ message: "Context data is required for explanation" });

    const explanation = await aiService.explainDecision(contextData);
    res.json(explanation);
  } catch (error) {
    console.error("Decision Support Explain Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
