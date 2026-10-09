const mongoose = require('mongoose');

const publicHistoricalIncidentSchema = new mongoose.Schema({
  sourceName: {
    type: String,
    required: true,
    index: true
  },
  sourceDataset: {
    type: String,
    required: true,
    index: true
  },
  sourceRecordId: {
    type: String,
    required: true,
    index: true
  },
  sourceUrl: {
    type: String
  },
  reportedAt: {
    type: Date,
    required: true
  },
  closedAt: {
    type: Date
  },
  category: {
    type: String,
    required: true
  },
  sourceCategory: {
    type: String
  },
  categoryMappingStatus: {
    type: String,
    enum: ['MAPPED', 'UNKNOWN'],
    default: 'MAPPED'
  },
  subcategory: {
    type: String
  },
  description: {
    type: String,
    required: true
  },
  department: {
    type: String
  },
  sourceDepartment: {
    type: String
  },
  departmentMappingStatus: {
    type: String,
    enum: ['MAPPED', 'UNKNOWN'],
    default: 'MAPPED'
  },
  status: {
    type: String,
    default: 'closed'
  },
  latitude: {
    type: Number
  },
  longitude: {
    type: Number
  },
  locationText: {
    type: String
  },
  resolutionDescription: {
    type: String
  },
  rawSourceMetadata: {
    type: mongoose.Schema.Types.Mixed
  },
  importedAt: {
    type: Date,
    default: Date.now
  }
});

// Create unique compound index for deduplication
publicHistoricalIncidentSchema.index({ sourceName: 1, sourceDataset: 1, sourceRecordId: 1 }, { unique: true });

const PublicHistoricalIncident = mongoose.model('PublicHistoricalIncident', publicHistoricalIncidentSchema);

module.exports = PublicHistoricalIncident;
