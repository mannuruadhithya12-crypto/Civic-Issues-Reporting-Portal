const Issue = require('../models/Issue');
const config = require('../config/decisionSupport');
const { calculateSLARisk } = require('./slaRiskService');
const clusteringService = require('./clusteringService');

// Helper for distance
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const getPriorityRankings = async (matchStage = {}) => {
  // Fetch active issues
  const activeIssues = await Issue.find({
    ...matchStage,
    status: { $in: ['reported', 'verified', 'assigned', 'in_progress', 'reopened'] }
  });

  if (!activeIssues.length) return [];

  // Fetch contextual intelligence (Hotspots & Recurring)
  const { hotspots } = await clusteringService.getHotspots(matchStage);
  const recurring = await clusteringService.getRecurringIssues(matchStage);

  const rankedIssues = activeIssues.map(issue => {
    let score = 0;
    const reasons = [];
    
    const lat = issue.coordinates?.coordinates?.[1];
    const lon = issue.coordinates?.coordinates?.[0];

    // 1. Severity Score (0-100)
    let severityVal = 0;
    if (issue.priority === 'urgent') severityVal = 100;
    else if (issue.priority === 'high') severityVal = 75;
    else if (issue.priority === 'normal') severityVal = 50;
    else if (issue.priority === 'low') severityVal = 25;
    
    score += severityVal * config.PRIORITY.SEVERITY_WEIGHT;
    if (severityVal >= 75) reasons.push('High severity');

    // 2. SLA Risk Score (0-100)
    const slaInfo = calculateSLARisk(issue);
    let slaVal = 0;
    if (slaInfo.status === 'BREACHED') slaVal = 100;
    else if (slaInfo.status === 'AT_RISK') slaVal = 75;
    else if (slaInfo.percentageElapsed > 0) slaVal = slaInfo.percentageElapsed * 50; // scales 0-50 for on track
    
    score += slaVal * config.PRIORITY.SLA_RISK_WEIGHT;
    if (slaInfo.status === 'BREACHED') reasons.push('SLA breached');
    else if (slaInfo.status === 'AT_RISK') reasons.push('SLA at risk');

    // 3. Density / Hotspot Score (0-100)
    let densityVal = 0;
    if (lat && lon) {
      for (const hs of hotspots) {
        const dist = getDistanceMeters(lat, lon, hs.center[0], hs.center[1]);
        if (dist <= 250) { // arbitrary match radius
           // max 100 if >= 10 issues in hotspot
           densityVal = Math.min((hs.issueCount / 10) * 100, 100);
           break;
        }
      }
    }
    score += densityVal * config.PRIORITY.DENSITY_WEIGHT;
    if (densityVal >= 50) reasons.push('High issue density');

    // 4. Recurrence Score (0-100)
    let recurrenceVal = 0;
    let recurringCount = 0;
    if (lat && lon) {
      for (const rec of recurring) {
        const issueCat = issue.aiAnalysis?.category?.value || issue.department;
        if (rec.category === issueCat) {
          const dist = getDistanceMeters(lat, lon, rec.center[0], rec.center[1]);
          if (dist <= 250) {
            recurrenceVal = Math.min((rec.occurrenceCount / 5) * 100, 100);
            recurringCount = rec.occurrenceCount;
            break;
          }
        }
      }
    }
    score += recurrenceVal * config.PRIORITY.RECURRENCE_WEIGHT;
    if (recurrenceVal > 0) reasons.push('Recurring problem');

    // 5. Age Score (0-100)
    const ageDays = (new Date() - new Date(issue.createdAt)) / (1000 * 60 * 60 * 24);
    const ageVal = Math.min((ageDays / 30) * 100, 100); // Caps at 30 days
    score += ageVal * config.PRIORITY.AGE_WEIGHT;

    // 6. Impact Score (0-100) - Defaulting as requested by user
    const impactVal = issue.impactScore ?? config.PRIORITY.DEFAULT_IMPACT_SCORE;
    score += impactVal * config.PRIORITY.IMPACT_WEIGHT;

    const finalScore = Math.round(score);
    let priorityLevel = 'LOW';
    if (finalScore >= 80) priorityLevel = 'CRITICAL';
    else if (finalScore >= 60) priorityLevel = 'HIGH';
    else if (finalScore >= 40) priorityLevel = 'MEDIUM';

    return {
      issueId: issue._id,
      title: issue.title,
      category: issue.aiAnalysis?.category?.value || issue.department,
      department: issue.department,
      location: issue.locationName || issue.location,
      severity: issue.priority,
      status: issue.status,
      priorityScore: finalScore,
      priorityLevel,
      slaStatus: slaInfo.status,
      reasons,
      // Pass these for Gemini explainability context if requested
      densityScore: Math.round(densityVal),
      recurrenceCount: recurringCount,
      ageScore: Math.round(ageVal)
    };
  });

  return rankedIssues.sort((a, b) => b.priorityScore - a.priorityScore);
};

module.exports = {
  getPriorityRankings
};
