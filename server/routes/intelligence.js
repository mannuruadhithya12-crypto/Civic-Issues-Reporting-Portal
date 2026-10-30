// server/routes/intelligence.js
const express = require('express');
const router = express.Router();
const intelligenceController = require('../controllers/intelligenceController');
const { auth, admin } = require('../middleware/auth');

// All intelligence endpoints require authentication and admin authorization
router.use(auth, admin);

router.get('/dashboard', intelligenceController.getDashboardData);
router.get('/export', intelligenceController.exportReport);

router.get('/overview', intelligenceController.getOverview);
router.get('/trends', intelligenceController.getTrends);
router.get('/categories', intelligenceController.getCategories);
router.get('/geographic', intelligenceController.getGeographic);
router.get('/hotspots', intelligenceController.getHotspots);
router.get('/priority', intelligenceController.getPriority);
router.get('/duplicates', intelligenceController.getDuplicates);
router.get('/predictions', intelligenceController.getPredictions);
router.get('/decision-support', intelligenceController.getDecisionSupport);

module.exports = router;
