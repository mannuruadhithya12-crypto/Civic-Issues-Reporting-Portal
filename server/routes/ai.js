const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { auth } = require('../middleware/auth');

// Protected routes to prevent public API abuse
router.post('/analyze-image', auth, aiController.analyzeImage);
router.post('/improve-description', auth, aiController.improveDescription);

module.exports = router;
