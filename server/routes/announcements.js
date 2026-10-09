const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');

// GET all active announcements
router.get('/', async (req, res) => {
    try {
        const announcements = await Announcement.find({ active: true }).sort({ date: -1 }).limit(10);
        res.json(announcements);
    } catch (err) {
        console.error('Error fetching announcements:', err);
        res.status(500).json({ message: 'Server error fetching announcements' });
    }
});

module.exports = router;
