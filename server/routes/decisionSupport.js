const express = require('express');
const router = express.Router();
const decisionSupportController = require('../controllers/decisionSupportController');
const { auth, admin } = require('../middleware/auth');

// All decision support routes must be protected and admin-only
router.use(auth);
router.use(admin);

router.get('/overview', decisionSupportController.getOverview);
router.get('/priorities', decisionSupportController.getPriorities);
router.get('/sla-risk', decisionSupportController.getSLARisk);
router.get('/workload', decisionSupportController.getWorkload);
router.get('/recommendations', decisionSupportController.getRecommendations);
router.post('/simulate', decisionSupportController.simulate);
router.post('/explain', decisionSupportController.explain);

module.exports = router;
