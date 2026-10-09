module.exports = {
  // Prediction horizon in days
  HORIZON_DAYS: 7,

  // Grid size in meters for grouping issues geospatially
  GRID_SIZE_METERS: 250,

  // Data sufficiency minimums
  // Default values set slightly lower for testing viability if database is small, but realistically they should be strictly enforced.
  MIN_TOTAL_SAMPLES: 20, 
  MIN_POSITIVE_SAMPLES: 5,
  MIN_NEGATIVE_SAMPLES: 5,

  // What constitutes "High Activity" during the future horizon?
  // 1 if >= this threshold
  TARGET_ACTIVITY_THRESHOLD: 2,

  // The chronological train/test split percentage
  // Example: 0.8 means 80% oldest data for training, 20% newest for test
  TRAIN_SPLIT_RATIO: 0.8,

  // Risk translation thresholds (probabilities)
  RISK_THRESHOLDS: {
    LOW: 0.40,
    MEDIUM: 0.60,
    HIGH: 0.80
  },

  MODEL_VERSION: '1.0.0',

  // Directory to store trained models and metadata
  ARTIFACT_DIR: './ml/artifacts/',

  SUPPORTED_CATEGORIES: [
    'Potholes',
    'Garbage overflow',
    'Streetlight failures',
    'Water leakage',
    'Illegal parking',
    'Drainage issues',
    'Broken footpaths',
    'Noise pollution',
    'Sewage problems',
    'Public safety issues',
    'Other'
  ]
};
