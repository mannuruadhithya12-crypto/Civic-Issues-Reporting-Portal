const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');
const { auth, admin } = require('../middleware/auth');

// All prediction routes are admin-only
router.use(auth, admin);

router.get('/overview', predictionController.getOverview);
router.get('/model-status', predictionController.getModelStatus);
router.get('/geographic', predictionController.getGeographicPredictions);
router.get('/categories', predictionController.getCategoryPredictions);

// Retrain model
router.post('/train', predictionController.trainModel);

module.exports = router;
