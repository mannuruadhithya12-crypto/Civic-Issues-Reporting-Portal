/**
 * Deterministic Action Encoder for CivicConnect RL
 * Version: action-v1
 * 
 * Maps intervention types from the exact Sprint 7 catalog into integer IDs.
 */

const { INTERVENTION_CATALOG, DEFAULT_INTERVENTIONS } = require('../../config/interventionOptimization');

const VERSION = "action-v1";

// Flatten and extract unique actions deterministically
function buildActionCatalog() {
    const actionMap = new Map();
    let currentId = 0;

    // We process categories alphabetically to maintain determinism
    const categories = Object.keys(INTERVENTION_CATALOG).sort();
    
    for (const cat of categories) {
        for (const action of INTERVENTION_CATALOG[cat]) {
            if (!actionMap.has(action.type)) {
                actionMap.set(action.type, {
                    id: currentId++,
                    type: action.type,
                    name: action.name,
                    workers: action.workers,
                    vehicles: action.vehicles,
                    hours: action.hours,
                    estimatedCost: action.estimatedCost
                });
            }
        }
    }

    // Include defaults
    for (const action of DEFAULT_INTERVENTIONS) {
        if (!actionMap.has(action.type)) {
            actionMap.set(action.type, {
                id: currentId++,
                type: action.type,
                name: action.name,
                workers: action.workers,
                vehicles: action.vehicles,
                hours: action.hours,
                estimatedCost: action.estimatedCost
            });
        }
    }

    return Array.from(actionMap.values());
}

const ACTION_CATALOG = buildActionCatalog();

function encodeAction(interventionType) {
    const action = ACTION_CATALOG.find(a => a.type === interventionType);
    if (!action) {
        throw new Error(`Unknown action type: ${interventionType}`);
    }
    return action.id;
}

function generateActionMask(category, availableResources) {
    // 1 for valid, 0 for invalid
    const mask = new Array(ACTION_CATALOG.length).fill(0);
    let resourceAvailabilityStatus = "KNOWN";
    
    // Valid actions for category
    let validTypes = [];
    if (INTERVENTION_CATALOG[category]) {
        validTypes = INTERVENTION_CATALOG[category].map(a => a.type);
    } else {
        validTypes = DEFAULT_INTERVENTIONS.map(a => a.type);
    }

    if (!availableResources || Object.keys(availableResources).length === 0) {
        resourceAvailabilityStatus = "UNKNOWN";
    }

    for (let i = 0; i < ACTION_CATALOG.length; i++) {
        const action = ACTION_CATALOG[i];
        
        // Is it allowed for this category?
        if (!validTypes.includes(action.type)) {
            continue; // mask remains 0
        }

        if (resourceAvailabilityStatus === "UNKNOWN") {
            // If historical resources are unknown, we cannot confidently mask by resources.
            // We assume valid based solely on category compatibility, but we document the missing constraints.
            mask[i] = 1;
        } else {
            // Are there enough resources?
            if (
                action.workers <= (availableResources.workers || 0) &&
                action.vehicles <= (availableResources.vehicles || 0) &&
                action.estimatedCost <= (availableResources.budget || 0) &&
                action.hours <= (availableResources.workingHours || 0)
            ) {
                mask[i] = 1;
            }
        }
    }

    return { mask, resourceAvailabilityStatus };
}

module.exports = {
    VERSION,
    ACTION_CATALOG,
    encodeAction,
    generateActionMask
};
