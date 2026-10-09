// server/services/issueStatusService.js

const VALID_TRANSITIONS = {
    'reported': ['verified', 'rejected', 'assigned'],
    'verified': ['assigned'],
    'assigned': ['in_progress', 'assigned'], // reassignment
    'in_progress': ['resolved', 'assigned'], // assigned back if they can't do it
    'resolved': ['closed', 'reopened'],
    'reopened': ['assigned', 'in_progress'],
    'closed': [],
    'rejected': ['reported'] // maybe citizen can reopen
};

/**
 * Validates if a status transition is allowed.
 * @param {String} currentStatus 
 * @param {String} nextStatus 
 * @returns {Boolean}
 */
const canTransition = (currentStatus, nextStatus) => {
    // If statuses are the same (e.g. updating issue details but not status), allow it
    if (currentStatus === nextStatus) return true;

    // Check if transition is defined
    if (!VALID_TRANSITIONS[currentStatus]) return false;

    return VALID_TRANSITIONS[currentStatus].includes(nextStatus);
};

module.exports = {
    canTransition,
    VALID_TRANSITIONS
};
