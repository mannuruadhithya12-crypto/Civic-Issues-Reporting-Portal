const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: '' },
  password: { type: String, required: true },
  role: { type: String, enum: ['citizen', 'admin', 'worker'], default: 'citizen' },
  department: { type: String }, // For workers
  dutyStatus: { type: String, enum: ['on_duty', 'off_duty', 'busy', 'unavailable'], default: 'on_duty' },

  // Profile fields
  avatar: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  postalCode: { type: String, default: '' },
  country: { type: String, default: 'United States' },
  status: { type: String, enum: ['active', 'deactivated', 'suspended'], default: 'active' },
  lastLogin: { type: Date, default: Date.now },

  // Preferences & Settings
  notificationPreferences: {
    issueStatusUpdates: { type: Boolean, default: true },
    issueComments: { type: Boolean, default: true },
    communityAnnouncements: { type: Boolean, default: true },
    announcements: { type: Boolean, default: true },
    systemNotifications: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: false }
  },

  accountSettings: {
    language: { type: String, default: 'English (US)' },
    timezone: { type: String, default: 'UTC-05:00 (Eastern Time)' },
    theme: { type: String, default: 'light' },
    accessibilityMode: { type: Boolean, default: false },
    defaultMapView: { type: String, default: 'standard' }
  },

  privacySettings: {
    publicProfile: { type: Boolean, default: false },
    showActivity: { type: Boolean, default: true },
    twoFactorEnabled: { type: Boolean, default: false }
  },

  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  isDemo: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);

