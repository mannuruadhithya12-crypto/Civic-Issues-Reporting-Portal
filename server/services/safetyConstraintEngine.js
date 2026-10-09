const { INTERVENTION_CATALOG, DEFAULT_INTERVENTIONS } = require('../config/interventionOptimization');

class SafetyConstraintEngine {
    /**
     * Validates a proposed intervention against resource limits and category rules.
     * @param {Object} proposedAction - e.g. { type: 'inspection', workers: 1, ... }
     * @param {Object} issueCategory - The issue's category
     * @param {Object} availableResources - Global available resources { workers, vehicles, budget, workingHours }
     * @returns {Object} { allowed: boolean, status: string, reasons: [] }
     */
    static validateAction(proposedAction, issueCategory, availableResources) {
        const reasons = [];
        let status = 'SAFE';
        let allowed = true;

        // 1. Check if resource availability is unknown
        if (!availableResources || Object.keys(availableResources).length === 0) {
            allowed = false;
            status = 'REQUIRES_REVIEW';
            reasons.push("Resource availability is UNKNOWN. Cannot automatically guarantee safety.");
            
            // We return early here because without resource bounds, we cannot check constraints.
            // But we still check category mapping below for evidence.
        }

        // 2. Validate category compatibility
        let validTypes = [];
        if (INTERVENTION_CATALOG[issueCategory]) {
            validTypes = INTERVENTION_CATALOG[issueCategory].map(a => a.type);
        } else {
            validTypes = DEFAULT_INTERVENTIONS.map(a => a.type);
        }

        if (!validTypes.includes(proposedAction.type)) {
            allowed = false;
            status = 'INVALID_ACTION';
            reasons.push(`Action type '${proposedAction.type}' is not mapped to category '${issueCategory}' or defaults.`);
        }

        // 3. Check hard resource constraints (if we know them)
        if (status !== 'REQUIRES_REVIEW' && status !== 'INVALID_ACTION') {
            if (proposedAction.workers > (availableResources.workers || 0)) {
                allowed = false;
                status = 'RESOURCE_CONSTRAINT';
                reasons.push(`Action requires ${proposedAction.workers} workers, but only ${availableResources.workers || 0} are available.`);
            }
            if (proposedAction.vehicles > (availableResources.vehicles || 0)) {
                allowed = false;
                status = 'RESOURCE_CONSTRAINT';
                reasons.push(`Action requires ${proposedAction.vehicles} vehicles, but only ${availableResources.vehicles || 0} are available.`);
            }
            if (proposedAction.estimatedCost > (availableResources.budget || 0)) {
                allowed = false;
                status = 'RESOURCE_CONSTRAINT';
                reasons.push(`Action costs ${proposedAction.estimatedCost}, but only ${availableResources.budget || 0} is available.`);
            }
            if (proposedAction.hours > (availableResources.workingHours || 0)) {
                allowed = false;
                status = 'RESOURCE_CONSTRAINT';
                reasons.push(`Action takes ${proposedAction.hours} hours, but only ${availableResources.workingHours || 0} are available.`);
            }
        }

        return {
            allowed,
            status,
            reasons,
            constraintsChecked: {
                resourcesKnown: status !== 'REQUIRES_REVIEW',
                categoryMatched: validTypes.includes(proposedAction.type),
                resourceMetrics: availableResources
            }
        };
    }
}

module.exports = SafetyConstraintEngine;
