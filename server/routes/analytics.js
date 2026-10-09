const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { auth, admin } = require('../middleware/auth');

// All analytics routes are protected by auth and admin middleware
router.use(auth, admin);

router.get('/overview', analyticsController.getOverview);
router.get('/geographic', analyticsController.getGeographic);
router.get('/trends', analyticsController.getTrends);
router.get('/departments', analyticsController.getDepartments);
router.get('/categories', analyticsController.getCategories);
router.get('/recurring', analyticsController.getRecurring);
router.get('/sla', analyticsController.getSla);
router.get('/anomalies', analyticsController.getAnomalies);
router.get('/reports', analyticsController.getReports);
router.post('/reports/generate', analyticsController.generateReport);
router.delete('/reports/:id', analyticsController.deleteReport);
router.get('/realtime', analyticsController.getRealtime);

module.exports = router;
