// server/services/slaService.js

// SLA targets in hours based on priority
const SLA_TARGETS = {
    'urgent': 4,
    'high': 24,
    'normal': 72,
    'low': 168 // 7 days
};

/**
 * Calculates SLA due date and metrics based on priority.
 * @param {String} priority 
 * @returns {Object} sla object
 */
const calculateSLA = (priority = 'normal') => {
    const targetHours = SLA_TARGETS[priority] || SLA_TARGETS['normal'];
    const dueAt = new Date(Date.now() + targetHours * 60 * 60 * 1000);

    return {
        targetHours,
        dueAt,
        breachedAt: null,
        isBreached: false
    };
};

/**
 * Checks if an SLA is breached and updates the object.
 * @param {Object} sla 
 * @returns {Object} updated sla object
 */
const checkSLABreach = (sla) => {
    if (!sla || !sla.dueAt) return sla;
    
    if (new Date() > new Date(sla.dueAt) && !sla.isBreached) {
        sla.isBreached = true;
        sla.breachedAt = new Date();
    }
    return sla;
};

module.exports = {
    SLA_TARGETS,
    calculateSLA,
    checkSLABreach
};
