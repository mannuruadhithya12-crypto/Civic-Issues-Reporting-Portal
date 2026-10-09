const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const FAQ = require('../models/FAQ');
const SupportTicket = require('../models/SupportTicket');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

// Multer storage for support ticket attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ticket-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// GET /api/support/faqs - Get published FAQs with optional category or search filtering
router.get('/faqs', async (req, res) => {
  try {
    const { category, search } = req.query;
    const query = { isPublished: true };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { question: searchRegex },
        { answer: searchRegex },
        { category: searchRegex }
      ];
    }

    const faqs = await FAQ.find(query).sort({ order: 1, createdAt: -1 });
    res.json({ faqs });
  } catch (err) {
    console.error('Get FAQs error:', err);
    res.status(500).json({ message: 'Failed to fetch FAQs' });
  }
});

// GET /api/support/contact-info - Get support contact details from SystemSettings or unconfigured state
router.get('/contact-info', async (req, res) => {
  try {
    const SystemSettings = require('../models/SystemSettings');
    const settings = await SystemSettings.getSettings();
    const contact = settings.supportContact || {};
    if (contact && (contact.email || contact.phone || contact.address)) {
      return res.json({
        isConfigured: true,
        email: contact.email || '',
        responseTimeText: contact.responseTimeText || 'We typically respond within 24 hours.',
        phone: contact.phone || '',
        phoneHours: contact.phoneHours || '',
        address: contact.address || '',
        addressHours: contact.addressHours || ''
      });
    }
    return res.json({ isConfigured: false });
  } catch (err) {
    console.error('Fetch contact-info error:', err);
    return res.json({ isConfigured: false });
  }
});

// Helper to map UI category string to SupportTicket enum
const mapSupportCategory = (cat) => {
  if (!cat) return 'OTHER';
  const c = String(cat).toUpperCase();
  if (c.includes('ACCOUNT')) return 'ACCOUNT';
  if (c.includes('REPORT')) return 'REPORTING';
  if (c.includes('TRACK')) return 'ISSUE_TRACKING';
  if (c.includes('LOCATION') || c.includes('MAP')) return 'LOCATION';
  if (c.includes('MEDIA') || c.includes('UPLOAD') || c.includes('IMAGE')) return 'MEDIA_UPLOAD';
  if (c.includes('NOTIF')) return 'NOTIFICATIONS';
  if (c.includes('TECH') || c.includes('BUG')) return 'TECHNICAL';
  if (['ACCOUNT', 'REPORTING', 'ISSUE_TRACKING', 'LOCATION', 'MEDIA_UPLOAD', 'NOTIFICATIONS', 'TECHNICAL', 'OTHER'].includes(c)) {
    return c;
  }
  return 'OTHER';
};

// POST /api/support/tickets - Submit a new support ticket
router.post('/tickets', auth, upload.array('attachments', 3), async (req, res) => {
  try {
    const { subject, description, category, priority, relatedIssueId } = req.body;

    if (!subject || !subject.trim() || !description || !description.trim()) {
      return res.status(400).json({ message: 'Subject and Description are required' });
    }

    // Generate unique server-side ticket number
    const count = await SupportTicket.countDocuments();
    const ticketNumber = `CC-SUP-${String(count + 101).padStart(6, '0')}`;

    let attachmentUrls = [];
    if (req.files && req.files.length > 0) {
      attachmentUrls = req.files.map(f => `/uploads/${f.filename}`);
    }

    // Validate relatedIssueId as valid ObjectId or null
    const mongoose = require('mongoose');
    const validRelatedIssueId = (relatedIssueId && mongoose.Types.ObjectId.isValid(relatedIssueId)) ? relatedIssueId : null;

    const sanitizedCategory = mapSupportCategory(category);
    const sanitizedPriority = (priority || 'normal').toLowerCase();

    const ticket = new SupportTicket({
      ticketNumber,
      userId: req.user._id,
      subject: subject.trim(),
      description: description.trim(),
      category: sanitizedCategory,
      priority: sanitizedPriority,
      relatedIssueId: validRelatedIssueId,
      attachments: attachmentUrls,
      messages: [{
        sender: req.user.name || req.user.username || 'Citizen',
        senderRole: 'citizen',
        text: description.trim(),
        createdAt: new Date()
      }]
    });

    await ticket.save();

    // Create notification for citizen
    try {
      await Notification.create({
        user: req.user._id,
        type: 'SYSTEM',
        title: 'Support Ticket Submitted',
        message: `Your support ticket ${ticketNumber} ("${subject.trim()}") has been created. Our team will review it shortly.`,
        read: false
      });
    } catch (notifErr) {
      console.error('Notification creation notice:', notifErr);
    }

    res.status(201).json({
      message: 'Support ticket submitted successfully',
      ticket
    });
  } catch (err) {
    console.error('Create support ticket error:', err);
    res.status(500).json({ message: err.message || 'Failed to create support ticket' });
  }
});

// GET /api/support/tickets - Fetch current citizen's support tickets
router.get('/tickets', auth, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user._id })
      .populate('relatedIssueId', 'title status location')
      .sort({ createdAt: -1 });

    res.json({ tickets });
  } catch (err) {
    console.error('Fetch tickets error:', err);
    res.status(500).json({ message: 'Failed to fetch support tickets' });
  }
});

// GET /api/support/tickets/:id - Get single ticket details
router.get('/tickets/:id', auth, async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('relatedIssueId', 'title status location');

    if (!ticket) {
      return res.status(404).json({ message: 'Support ticket not found' });
    }

    // Verify ownership
    if (ticket.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ ticket });
  } catch (err) {
    console.error('Get ticket error:', err);
    res.status(500).json({ message: 'Failed to load ticket details' });
  }
});

// POST /api/support/tickets/:id/reply - Add a reply message to ticket
router.post('/tickets/:id/reply', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Reply text cannot be empty' });
    }

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Support ticket not found' });
    }

    if (ticket.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    ticket.messages.push({
      sender: req.user.name || req.user.username || 'Citizen',
      senderRole: req.user.role || 'citizen',
      text: text.trim(),
      createdAt: new Date()
    });

    if (ticket.status === 'closed' || ticket.status === 'resolved') {
      ticket.status = 'in_progress';
    }

    await ticket.save();

    res.json({ message: 'Reply added successfully', ticket });
  } catch (err) {
    console.error('Ticket reply error:', err);
    res.status(500).json({ message: 'Failed to add reply' });
  }
});

module.exports = router;
