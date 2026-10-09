const { getPriorityRankings } = require('./priorityService');
const { getInterventionCandidatesForCategory } = require('./interventionService');
const { getModelStatus, predictGeographicRisk } = require('./predictionService');
const config = require('../config/interventionOptimization');
const Issue = require('../models/Issue');

/**
 * 1. Generates candidates by looking at Sprint 5 priorities and Sprint 6 predictions.
 * 2. Calculates the Deterministic Score.
 */
async function generateScoredCandidates() {
    // 1. Fetch Sprint 5 Priorities (Active issues)
    const rankedIssues = await getPriorityRankings();

    // 2. Fetch Sprint 6 Prediction Status to see if we can use it
    const mlStatus = getModelStatus();
    const usePredictions = (mlStatus.status === 'READY' || mlStatus.status === 'LOW_CONFIDENCE');

    const candidates = [];

    for (const issue of rankedIssues) {
        // Fetch candidate interventions for this category
        const options = getInterventionCandidatesForCategory(issue.category);

        let predictedRisk = 0;
        let predictionFactors = [];

        // If prediction model is active and issue has coordinates, get predicted risk for that area
        if (usePredictions) {
            try {
                const dbIssue = await Issue.findById(issue.issueId);
                if (dbIssue && dbIssue.coordinates && dbIssue.coordinates.coordinates.length === 2) {
                    const lat = dbIssue.coordinates.coordinates[1];
                    const lon = dbIssue.coordinates.coordinates[0];
                    const pred = await predictGeographicRisk(lat, lon, issue.category);
                    predictedRisk = pred.riskScore || 0;
                    predictionFactors = pred.factors || [];
                }
            } catch (err) {
                console.error(`Prediction lookup failed for issue ${issue.issueId}`, err);
            }
        }

        // Score each option
        for (const option of options) {
            // Normalization (0-100)
            const riskReduction = predictedRisk > 0 ? predictedRisk : (issue.priorityScore || 0); // Use prediction if available, else priority
            const citizenImpact = issue.priorityScore || 50; // Approximated
            const slaImprovement = (issue.slaStatus === 'BREACHED') ? 100 : (issue.slaStatus === 'AT_RISK' ? 75 : 25);
            const recurrenceReduction = issue.recurrenceCount ? Math.min(issue.recurrenceCount * 20, 100) : 0;
            
            // Resource Efficiency (Inverse of cost/workers relative to impact)
            // A simple heuristic: High impact, low cost = high efficiency
            // Max cost assumed around 20000 for scaling.
            let costFactor = Math.max(0, 100 - (option.estimatedCost / 20000 * 100));
            let workerFactor = Math.max(0, 100 - (option.workers / 10 * 100));
            let resourceEfficiency = (costFactor + workerFactor) / 2;

            // Deterministic Optimization Score
            const optimizationScore = Math.round(
                (riskReduction * config.OBJECTIVE_WEIGHTS.RISK_REDUCTION) +
                (citizenImpact * config.OBJECTIVE_WEIGHTS.CITIZEN_IMPACT) +
                (slaImprovement * config.OBJECTIVE_WEIGHTS.SLA_IMPROVEMENT) +
                (recurrenceReduction * config.OBJECTIVE_WEIGHTS.RECURRENCE_REDUCTION) +
                (resourceEfficiency * config.OBJECTIVE_WEIGHTS.RESOURCE_EFFICIENCY)
            );

            // Construct Explainability Evidence
            const evidence = [
                `Issue Priority Score: ${issue.priorityScore}`,
                `SLA Status: ${issue.slaStatus}`
            ];
            if (predictedRisk > 0) evidence.push(`Predicted Area Risk: ${predictedRisk} - ${predictionFactors[0] || ''}`);
            if (issue.recurrenceCount > 0) evidence.push(`Recurring History: ${issue.recurrenceCount} times`);
            evidence.push(`Expected Impact of ${option.name}: ${option.expectedImpact}/100`);

            candidates.push({
                issueId: issue.issueId,
                target: issue.location || issue.title,
                category: issue.category,
                department: issue.department,
                intervention: option.name,
                interventionType: option.type,
                priorityScore: issue.priorityScore,
                predictedRisk: predictedRisk,
                slaStatus: issue.slaStatus,
                expectedImpact: option.expectedImpact,
                cost: option.estimatedCost,
                workers: option.workers,
                vehicles: option.vehicles,
                hours: option.hours,
                optimizationScore,
                evidence,
                // Passing exact state before for future tracking
                stateBefore: {
                    priorityScore: issue.priorityScore,
                    riskScore: predictedRisk,
                    slaRisk: slaImprovement, // Numeric mapping
                    openIssues: 1, // Base 1 for this issue, technically area has more
                    recurringCount: issue.recurrenceCount || 0,
                    hotspotLevel: issue.densityScore || 0,
                    departmentWorkload: 0 // Mock for now, would use workloadService
                }
            });
        }
    }

    // Return sorted by highest optimization score
    return candidates.sort((a, b) => b.optimizationScore - a.optimizationScore);
}

/**
 * Deterministic Greedy Optimization Algorithm
 * Respects hard constraints: workers, vehicles, budget, hours
 */
function optimizePlan(candidates, resources) {
    const selected = [];
    const unused = { ...resources };
    let totalCost = 0;
    let totalWorkers = 0;
    let totalVehicles = 0;
    let totalHours = 0;
    let totalExpectedImpact = 0;
    let aggregateOptScore = 0;

    const seenIssues = new Set(); // Prevent assigning multiple interventions to the exact same issue

    for (const c of candidates) {
        // Individual Feasibility Check
        if (c.cost > unused.budget || 
            c.workers > unused.workers || 
            c.vehicles > unused.vehicles || 
            c.hours > unused.workingHours) {
            continue; // Infeasible individually
        }

        if (seenIssues.has(c.issueId)) {
            continue; // Already assigned an intervention for this specific issue
        }

        // Greedy Selection (Constraints Verification)
        selected.push(c);
        seenIssues.add(c.issueId);

        unused.budget -= c.cost;
        unused.workers -= c.workers;
        unused.vehicles -= c.vehicles;
        unused.workingHours -= c.hours;

        totalCost += c.cost;
        totalWorkers += c.workers;
        totalVehicles += c.vehicles;
        totalHours += c.hours;
        totalExpectedImpact += c.expectedImpact;
        aggregateOptScore += c.optimizationScore;
    }

    return {
        selectedPlan: selected,
        unusedResources: unused,
        resourcesUsed: {
            cost: totalCost,
            workers: totalWorkers,
            vehicles: totalVehicles,
            hours: totalHours
        },
        metrics: {
            totalExpectedImpact,
            averageOptimizationScore: selected.length > 0 ? Math.round(aggregateOptScore / selected.length) : 0
        }
    };
}

module.exports = {
    generateScoredCandidates,
    optimizePlan
};
