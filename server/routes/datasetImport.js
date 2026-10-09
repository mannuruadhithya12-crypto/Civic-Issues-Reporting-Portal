const express = require('express');
const router = express.Router();
const multer = require('multer');
const { auth, admin } = require('../middleware/auth');
const datasetImportController = require('../controllers/datasetImportController');

// Multer setup for temporary upload
const upload = multer({ dest: 'uploads/temp/' });

router.post('/preview', auth, admin, upload.single('file'), datasetImportController.previewDataset);
router.post('/upload', auth, admin, upload.single('file'), datasetImportController.uploadDataset);
router.get('/stats', auth, admin, datasetImportController.getStats);

module.exports = router;
