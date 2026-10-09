module.exports = {
  OBJECTIVE_WEIGHTS: {
    RISK_REDUCTION: 0.30,
    CITIZEN_IMPACT: 0.20,
    SLA_IMPROVEMENT: 0.20,
    RECURRENCE_REDUCTION: 0.15,
    RESOURCE_EFFICIENCY: 0.15
  },

  DEFAULT_SIMULATION_RESOURCES: {
    workers: 10,
    vehicles: 2,
    budget: 100000,
    workingHours: 40
  },

  // The base catalog of interventions mapped by category
  INTERVENTION_CATALOG: {
    'Potholes': [
      { type: 'inspection', name: 'Site Inspection', workers: 1, vehicles: 1, hours: 2, estimatedCost: 1000, expectedImpact: 30 },
      { type: 'temporary_repair', name: 'Temporary Patch', workers: 2, vehicles: 1, hours: 3, estimatedCost: 4000, expectedImpact: 60 },
      { type: 'full_repair', name: 'Full Repair', workers: 4, vehicles: 2, hours: 8, estimatedCost: 15000, expectedImpact: 95 }
    ],
    'Garbage overflow': [
      { type: 'inspection', name: 'Site Inspection', workers: 1, vehicles: 0, hours: 1, estimatedCost: 500, expectedImpact: 20 },
      { type: 'extra_collection', name: 'Extra Collection', workers: 2, vehicles: 1, hours: 2, estimatedCost: 3000, expectedImpact: 70 },
      { type: 'container_deployment', name: 'Deploy Large Container', workers: 2, vehicles: 1, hours: 4, estimatedCost: 8000, expectedImpact: 90 },
      { type: 'collection_frequency_increase', name: 'Increase Frequency', workers: 0, vehicles: 0, hours: 0, estimatedCost: 20000, expectedImpact: 85 } // structural
    ],
    'Streetlight failures': [
      { type: 'inspection', name: 'Site Inspection', workers: 1, vehicles: 1, hours: 1, estimatedCost: 800, expectedImpact: 30 },
      { type: 'bulb_replacement', name: 'Bulb Replacement', workers: 1, vehicles: 1, hours: 2, estimatedCost: 2500, expectedImpact: 80 },
      { type: 'electrical_repair', name: 'Electrical Repair', workers: 2, vehicles: 1, hours: 5, estimatedCost: 7000, expectedImpact: 95 }
    ],
    'Water leakage': [
      { type: 'inspection', name: 'Site Inspection', workers: 1, vehicles: 1, hours: 2, estimatedCost: 1000, expectedImpact: 30 },
      { type: 'leak_repair', name: 'Leak Repair', workers: 3, vehicles: 1, hours: 6, estimatedCost: 12000, expectedImpact: 90 }
    ],
    'Drainage issues': [
      { type: 'inspection', name: 'Site Inspection', workers: 1, vehicles: 1, hours: 2, estimatedCost: 1000, expectedImpact: 30 },
      { type: 'blockage_removal', name: 'Blockage Removal', workers: 2, vehicles: 1, hours: 4, estimatedCost: 6000, expectedImpact: 80 },
      { type: 'cleaning', name: 'Deep Cleaning', workers: 3, vehicles: 2, hours: 8, estimatedCost: 15000, expectedImpact: 95 }
    ]
  },

  // Fallback for categories without specific mapping
  DEFAULT_INTERVENTIONS: [
    { type: 'inspection', name: 'Standard Inspection', workers: 1, vehicles: 1, hours: 2, estimatedCost: 1000, expectedImpact: 40 },
    { type: 'standard_resolution', name: 'Standard Resolution', workers: 2, vehicles: 1, hours: 4, estimatedCost: 5000, expectedImpact: 80 }
  ]
};
