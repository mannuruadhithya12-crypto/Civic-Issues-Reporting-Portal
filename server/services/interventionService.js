const config = require('../config/interventionOptimization');

/**
 * Maps an issue category to possible candidate interventions based on configuration.
 * Does not execute or optimize. Just calculates standard resource mappings.
 */
function getInterventionCandidatesForCategory(category) {
    const interventions = config.INTERVENTION_CATALOG[category] || config.DEFAULT_INTERVENTIONS;
    return interventions.map(inv => ({
        ...inv,
        // Clone to prevent modifying config references
        type: inv.type,
        name: inv.name,
        workers: inv.workers,
        vehicles: inv.vehicles,
        hours: inv.hours,
        estimatedCost: inv.estimatedCost,
        expectedImpact: inv.expectedImpact
    }));
}

/**
 * Validates if an intervention is fundamentally valid for a department
 * (In a real system, you'd check department capabilities. For now, we trust the mapping).
 */
function validateDepartmentCompatibility(department, intervention) {
    return true; // Simplified: assumes category mapping already matches department
}

module.exports = {
    getInterventionCandidatesForCategory,
    validateDepartmentCompatibility
};
