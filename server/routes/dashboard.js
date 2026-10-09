// server/routes/dashboard.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { auth, admin } = require('../middleware/auth');

router.use(auth, admin);

router.get('/overview', dashboardController.getOverview);
router.get('/kpis', dashboardController.getKpis);
router.get('/status', dashboardController.getStatusBreakdown);
router.get('/sla', dashboardController.getSlaStatus);
router.get('/workers', dashboardController.getWorkers);
router.get('/issues', dashboardController.getIssues);
router.get('/map', dashboardController.getMapData);
router.get('/activity', dashboardController.getActivity);

module.exports = router;
