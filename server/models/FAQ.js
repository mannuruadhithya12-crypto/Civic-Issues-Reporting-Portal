const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['Reporting', 'Tracking', 'Account', 'Notifications', 'Map', 'Privacy', 'General'],
    default: 'Reporting'
  },
  order: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('FAQ', faqSchema);
