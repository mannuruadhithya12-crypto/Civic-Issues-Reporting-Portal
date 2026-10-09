const { getPriorityRankings } = require('./priorityService');
const { getModelStatus, predictGeographicRisk } = require('./predictionService');
const Issue = require('../models/Issue');

/**
 * Fetches the current metrics for an intervention's target area/issue.
 * This is used to build the real "afterMetrics" based on actual current civic data.
 */
async function getCurrentInterventionMetrics(outcome) {
    // 1. Fetch current priority ranking for the specific issue.
    // If the issue is already resolved, getPriorityRankings might not return it if it filters by active status.
    // However, the issue should still be active/in_progress until AFTER evaluation.
    const rankedIssues = await getPriorityRankings({ _id: outcome.issueId });
    
    // If we can't find the issue in active rankings (e.g., if it was already closed),
    // we may need to fallback or fetch it directly. For this evaluation, we assume it's still active.
    let currentIssueRank = rankedIssues.find(i => i.issueId.toString() === outcome.issueId.toString());

    if (!currentIssueRank) {
        // Fallback: If issue is no longer active in priorityService, we can't calculate its full active context easily.
        // We throw an error to reject evaluation, as missing data shouldn't be zeroed out.
        throw new Error('Current issue context not found in active priority rankings. Cannot calculate accurate after-metrics. Ensure the issue is still active before evaluation.');
    }

    // 2. Fetch current predicted risk for the geographic area
    const mlStatus = getModelStatus();
    const usePredictions = (mlStatus.status === 'READY' || mlStatus.status === 'LOW_CONFIDENCE');
    
    let currentPredictedRisk = 0;
    
    if (usePredictions) {
        const dbIssue = await Issue.findById(outcome.issueId);
        if (dbIssue && dbIssue.coordinates && dbIssue.coordinates.coordinates.length === 2) {
            const lat = dbIssue.coordinates.coordinates[1];
            const lon = dbIssue.coordinates.coordinates[0];
            
            try {
                const pred = await predictGeographicRisk(lat, lon, outcome.category);
                currentPredictedRisk = pred.riskScore || 0;
            } catch (err) {
                console.error(`Prediction lookup failed during evaluation for issue ${outcome.issueId}`, err);
                // Depending on requirements, we could fail evaluation here, but we will fallback to priorityScore.
            }
        }
    }

    // Normalization to match beforeMetrics structure
    const riskScore = currentPredictedRisk > 0 ? currentPredictedRisk : (currentIssueRank.priorityScore || 0);
    const slaRisk = (currentIssueRank.slaStatus === 'BREACHED') ? 100 : (currentIssueRank.slaStatus === 'AT_RISK' ? 75 : 25);
    
    return {
        priorityScore: currentIssueRank.priorityScore,
        riskScore: riskScore,
        slaRisk: slaRisk,
        openIssues: 1, // Represents the specific targeted issue
        recurringCount: currentIssueRank.recurrenceCount || 0,
        hotspotLevel: currentIssueRank.densityScore || 0,
        departmentWorkload: 0 // Mock consistent with optimizationService
    };
}

module.exports = {
    getCurrentInterventionMetrics
};
