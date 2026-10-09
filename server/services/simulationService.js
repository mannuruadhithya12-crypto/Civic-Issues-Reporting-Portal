const Issue = require('../models/Issue');
const { calculateSLARisk } = require('./slaRiskService');

/**
 * Runs a deterministic simulation scenario based on current active workload.
 */
const runSimulation = async (department, additionalWorkers, capacityPerWorkerPerDay) => {
  // Fetch active issues for the department
  const activeIssues = await Issue.find({
    department,
    status: { $in: ['reported', 'verified', 'assigned', 'in_progress', 'reopened'] }
  });

  const currentOpenBacklog = activeIssues.length;
  
  // Base assumptions: we assume current capacity is roughly handling the daily influx,
  // so additional workers strictly reduce the backlog.
  // Or, if we want to be more accurate, we calculate how much additional backlog
  // will be cleared over a 3-day period (as requested in the prompt).
  
  const simulationDays = 3;
  const additionalDailyCapacity = additionalWorkers * capacityPerWorkerPerDay;
  const additionalTotalCapacity = additionalDailyCapacity * simulationDays;

  // Let's also find how many currently AT_RISK or BREACHED items exist
  let currentAtRiskOrBreached = 0;
  activeIssues.forEach(issue => {
    const sla = calculateSLARisk(issue);
    if (sla.status === 'AT_RISK' || sla.status === 'BREACHED') {
      currentAtRiskOrBreached++;
    }
  });

  // Calculate scenario outcomes
  let estimatedRemainingBacklog = currentOpenBacklog - additionalTotalCapacity;
  if (estimatedRemainingBacklog < 0) estimatedRemainingBacklog = 0;

  // Assume additional capacity attacks the at-risk backlog first
  let estimatedRemainingAtRisk = currentAtRiskOrBreached - additionalTotalCapacity;
  if (estimatedRemainingAtRisk < 0) estimatedRemainingAtRisk = 0;

  return {
    department,
    currentOpenBacklog,
    currentAtRiskOrBreached,
    additionalDailyCapacity,
    simulationDays,
    scenario: {
      estimatedBacklogAfter3Days: estimatedRemainingBacklog,
      estimatedAtRiskAccommodated: currentAtRiskOrBreached - estimatedRemainingAtRisk
    },
    disclaimer: "Simulation estimate based on current data and selected capacity assumptions. This is an operational scenario calculation, not a prediction."
  };
};

module.exports = {
  runSimulation
};
