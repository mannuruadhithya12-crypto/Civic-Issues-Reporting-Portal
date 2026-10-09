const express = require('express');
const router = express.Router();
const interventionController = require('../controllers/interventionController');
const { auth, admin } = require('../middleware/auth');

// All intervention routes are admin-only
router.use(auth, admin);

router.get('/', interventionController.getOutcomes);
router.post('/', interventionController.createIntervention);

router.get('/candidates', interventionController.getCandidates);
router.get('/optimized-plan', interventionController.getOptimizedPlan);
router.post('/simulate', interventionController.simulate);

router.post('/approve', interventionController.approveIntervention);
router.post('/:id/approve', interventionController.approveIntervention);
router.post('/:id/execute', interventionController.executeIntervention);
router.post('/:id/evaluate', interventionController.evaluateIntervention);

router.get('/outcomes', interventionController.getOutcomes);
router.get('/:id/outcome', interventionController.getOutcomeById);
router.get('/:id', interventionController.getOutcomeById);

router.get('/kpis', interventionController.getKPIs);
router.get('/campaigns', interventionController.getCampaigns);
router.post('/campaigns', interventionController.createCampaign);
router.get('/campaigns/:id', interventionController.getCampaignById);
router.patch('/campaigns/:id/status', interventionController.updateCampaignStatus);
router.put('/campaigns/:id', interventionController.updateCampaign);
router.delete('/campaigns/:id', interventionController.deleteCampaign);
router.get('/impact', interventionController.getImpactAnalysis);
router.get('/reports', interventionController.getReports);

module.exports = router;
