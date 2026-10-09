module.exports = {
  readiness: {
    // We need enough transitions to train a basic offline RL algorithm (like DQN).
    // 50 is extremely low for deep RL, but reasonable for a prototype checkpoint.
    minimumEligibleTransitions: 50,
    
    // An RL agent cannot learn if there is only one possible action.
    minimumUniqueActions: 2,
    
    // We need both successful and unsuccessful interventions to learn the difference.
    minimumPositiveRewards: 5,
    minimumNegativeRewards: 2,
    
    // Need varied context so the agent doesn't overfit to one area.
    minimumCategories: 2,
    minimumDepartments: 2,
    
    // Prevents evaluating RL readiness if all interventions occurred on the same day.
    minimumTemporalCoverageDays: 7
  }
};
