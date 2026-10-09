// server/routes/operations.js
const express = require('express');
const router = express.Router();
const operationsController = require('../controllers/operationsController');
const { auth, admin } = require('../middleware/auth');

router.get('/stream', auth, operationsController.getLiveStream);
router.get('/events', auth, admin, operationsController.getRecentEvents);

module.exports = router;
