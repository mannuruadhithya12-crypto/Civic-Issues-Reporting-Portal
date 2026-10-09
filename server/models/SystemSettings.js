const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'global' },
  slaHours: {
    urgent: { type: Number, default: 24 },
    high: { type: Number, default: 72 },
    normal: { type: Number, default: 168 },
    low: { type: Number, default: 336 }
  },
  optimizationDefaults: {
    workers: { type: Number, default: 10 },
    vehicles: { type: Number, default: 2 },
    budget: { type: Number, default: 100000 },
    workingHours: { type: Number, default: 40 }
  },
  safetyThresholds: {
    maxBudgetPerIntervention: { type: Number, default: 50000 },
    minRequiredRLTransitions: { type: Number, default: 25 },
    minEvaluationDelayHours: { type: Number, default: 24 }
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now }
});

systemSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne({ key: 'global' });
  if (!settings) {
    settings = await this.create({ key: 'global' });
  }
  return settings;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
