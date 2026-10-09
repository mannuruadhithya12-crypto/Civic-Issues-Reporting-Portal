const mongoose = require('mongoose');

const rlModelSchema = new mongoose.Schema({
    modelVersion: { type: String, required: true, unique: true },
    algorithm: { type: String, required: true },
    stateVersion: { type: String, required: true },
    actionVersion: { type: String, required: true },
    status: { type: String, required: true, enum: ['TRAINING', 'UNVALIDATED', 'PROTOTYPE_ONLY', 'VALIDATED', 'RETIRED'] },
    
    trainingRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'RLTrainingRun' },
    evaluationRunId: { type: mongoose.Schema.Types.ObjectId },
    
    validatedAt: { type: Date },
    metadata: { type: Object }
}, { timestamps: true });

module.exports = mongoose.model('RLModel', rlModelSchema);
