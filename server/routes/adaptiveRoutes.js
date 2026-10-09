const express = require('express');
const router = express.Router();
const adaptiveController = require('../controllers/adaptiveController');
const { auth, admin } = require('../middleware/auth');

router.use(auth, admin);

router.get('/state', adaptiveController.getCivicState);
router.get('/state/:issueId', adaptiveController.getCivicState);

router.get('/decisions', adaptiveController.getDecisions);
router.get('/strategies', adaptiveController.getAvailableStrategies);
router.post('/decision/:issueId', adaptiveController.getDecision);

router.get('/champion-challenger', adaptiveController.getChampionChallenger);
router.post('/compare/:issueId', adaptiveController.compareStrategies);

router.get('/evidence', adaptiveController.getEvidence);
router.get('/safety', adaptiveController.getSafety);

router.get('/policies', adaptiveController.getPolicies);
router.get('/policies/:id', adaptiveController.getPolicyById);
router.post('/policies', adaptiveController.createPolicy);
router.post('/policies/:id/validate', adaptiveController.validatePolicy);
router.post('/policies/:id/approve', adaptiveController.approvePolicy);
router.post('/policies/:id/activate', adaptiveController.activatePolicy);
router.post('/policies/:id/retire', adaptiveController.retirePolicy);
router.post('/policies/:id/transition/:targetStatus', adaptiveController.transitionPolicy);

module.exports = router;
