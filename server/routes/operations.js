// server/routes/operations.js
const express = require('express');
const router = express.Router();
const operationsController = require('../controllers/operationsController');
const { auth, admin } = require('../middleware/auth');

router.use(auth, admin);

router.get('/stream', operationsController.getLiveStream);
router.get('/events', operationsController.getRecentEvents);

module.exports = router;
