// server/routes/workers.js
const express = require('express');
const router = express.Router();
const workerController = require('../controllers/workerController');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Get worker dashboard aggregated data
router.get('/dashboard', auth, workerController.getWorkerDashboard);

// Get assigned issues (Worker only)
router.get('/assigned', auth, workerController.getAssignedIssues);
router.get('/tasks', auth, workerController.getAssignedIssues);
router.get('/tasks/:id', auth, workerController.getTaskById);

// Task actions
router.patch('/tasks/:id/start', auth, workerController.startTask);
router.post('/tasks/:id/start', auth, workerController.startTask);
router.patch('/tasks/:id/complete', auth, upload.single('proof'), workerController.completeTask);
router.post('/tasks/:id/complete', auth, upload.single('proof'), workerController.completeTask);
router.post('/tasks/:id/evidence', auth, upload.single('proof'), workerController.uploadEvidence);

module.exports = router;

