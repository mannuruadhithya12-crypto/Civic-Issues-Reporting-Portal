const express = require('express');
const router = express.Router();
const rlController = require('../controllers/rlController');
const { auth, admin } = require('../middleware/auth');

// All RL endpoints are ADMIN-ONLY
router.use(auth, admin);

router.get('/health', rlController.getHealth);
router.get('/data-health', rlController.getHealth);
router.get('/dataset', rlController.getDataset);
router.get('/transitions', rlController.getTransitions);
router.get('/rewards', rlController.getRewards);
router.get('/model', rlController.getModels);
router.get('/training', rlController.getTraining);
router.get('/training-runs', rlController.getTraining);
router.get('/training-status', rlController.getTraining);
router.get('/validation', rlController.getValidation);
router.get('/inference', rlController.getInferenceStatus);

router.post('/train', rlController.trainDQN);
router.post('/validate', rlController.evaluateModel);
router.post('/evaluate', rlController.evaluateModel);
router.post('/inference', rlController.runInference);
router.post('/shadow-recommendation', rlController.shadowRecommendation);

module.exports = router;
