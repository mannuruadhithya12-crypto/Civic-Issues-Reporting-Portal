const express = require('express');
const router = express.Router();
const issueController = require('../controllers/issueController');
const { auth, admin } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/map-data', issueController.getMapData);
router.get('/', issueController.getAllIssues);
router.get('/nearby', issueController.getNearbyIssues);
router.get('/dashboard', auth, issueController.getCitizenDashboard);
router.get('/my', auth, issueController.getMyTickets);
router.get('/my/summary', auth, issueController.getMySummary);
router.get('/my-tickets', auth, issueController.getMyTickets);
router.get('/:id', auth, issueController.getIssueById);
router.post('/', auth, upload.array('images', 5), issueController.createIssue);
router.post('/check-duplicates', auth, issueController.checkDuplicates);

// Admin / Worker
router.put('/bulk-update', auth, admin, issueController.bulkUpdate);
router.get('/export', auth, admin, issueController.exportCsv);
router.put('/:id', auth, admin, issueController.updateStatus); // legacy
router.patch('/:id/status', auth, admin, issueController.updateStatus);
router.put('/:id/priority', auth, admin, issueController.updatePriority);

// Sprint 3 Operational Workflow
router.patch('/:id/verify', auth, admin, issueController.verifyIssue);
router.patch('/:id/assign', auth, admin, issueController.assignWorker);
router.patch('/:id/start', auth, issueController.startWork); // worker
router.patch('/:id/resolve', auth, upload.single('proof'), issueController.resolveIssue); // worker
router.patch('/:id/close', auth, issueController.closeIssue); // citizen
router.patch('/:id/reopen', auth, issueController.reopenIssue); // citizen

// General auth
router.post('/:id/comments', auth, issueController.addComment);
router.post('/:id/images', auth, upload.array('images', 5), issueController.addImages);

module.exports = router;
