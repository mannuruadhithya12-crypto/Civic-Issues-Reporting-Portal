const config = require('../config/decisionSupport');

/**
 * Calculates SLA risk for a given issue.
 * @param {Object} issue 
 * @returns {Object} { status, percentageElapsed, remainingTime, reason }
 */
const calculateSLARisk = (issue) => {
  // If issue is resolved/closed, SLA is no longer active
  if (['resolved', 'closed', 'rejected'].includes(issue.status)) {
    return {
      status: 'RESOLVED',
      percentageElapsed: null,
      remainingTime: null,
      reason: 'Issue is no longer active.'
    };
  }

  // Missing SLA or targetHours
  if (!issue.sla || !issue.sla.dueAt || !issue.sla.targetHours) {
    return {
      status: 'UNKNOWN',
      percentageElapsed: null,
      remainingTime: null,
      reason: 'SLA data is missing.'
    };
  }

  const dueAt = new Date(issue.sla.dueAt);
  const now = new Date();
  
  // Calculate start time based on dueAt and targetHours
  // (This handles reopened issues because targetHours and dueAt are reset on reopen)
  const targetMs = issue.sla.targetHours * 60 * 60 * 1000;
  const startAt = new Date(dueAt.getTime() - targetMs);
  
  const elapsedMs = now.getTime() - startAt.getTime();
  
  let percentageElapsed = elapsedMs / targetMs;
  if (percentageElapsed < 0) percentageElapsed = 0; // Edge case: now is before startAt

  let status = 'ON_TRACK';
  let reason = 'Operating within SLA bounds.';

  if (percentageElapsed >= config.SLA_RISK.BREACHED_THRESHOLD) {
    status = 'BREACHED';
    reason = 'SLA time limit has been exceeded.';
  } else if (percentageElapsed >= config.SLA_RISK.AT_RISK_THRESHOLD) {
    status = 'AT_RISK';
    reason = 'Approaching SLA deadline.';
  }

  const remainingMs = dueAt.getTime() - now.getTime();
  
  return {
    status,
    percentageElapsed: parseFloat(percentageElapsed.toFixed(4)),
    remainingTime: remainingMs > 0 ? remainingMs : 0,
    reason
  };
};

module.exports = {
  calculateSLARisk
};
