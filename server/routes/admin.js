// server/routes/admin.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Issue = require('../models/Issue');
const SystemSettings = require('../models/SystemSettings');
const { auth, admin } = require('../middleware/auth');
const { logAudit, getAuditLogs } = require('../services/auditService');

const commandCenterController = require('../controllers/adminCommandCenterController');
const liveMapController = require('../controllers/adminLiveMapController');
const liveOperationsController = require('../controllers/adminLiveOperationsController');
const adminNotificationsController = require('../controllers/adminNotificationsController');
const adminCitizensController = require('../controllers/adminCitizensController');

// All routes in this router require authentication and admin role
router.use(auth, admin);

// --- COMMAND CENTER OVERVIEW & SEARCH ---
router.get('/command-center', commandCenterController.getCommandCenterSummary);
router.get('/command-center/search', commandCenterController.globalSearch);
router.get('/command-center/export', commandCenterController.exportCommandCenterData);
router.get('/command-center/system-status', commandCenterController.getSystemStatus);

// --- GEMINI CORE FOUNDATION DIAGNOSTICS ---
const { getStaticDiagnostics, performSmokeTest } = require('../services/gemini/geminiDiagnostics');
router.get('/gemini/diagnostics', (req, res) => {
  res.json(getStaticDiagnostics());
});
router.post('/gemini/smoke-test', async (req, res) => {
  const result = await performSmokeTest(req.body);
  res.json(result);
});

// --- LIVE MAP GIS SUMMARY ---
router.get('/live-map/summary', liveMapController.getLiveMapSummary);

// --- LIVE OPERATIONS BACKEND API ---
router.get('/live-operations/summary', liveOperationsController.getLiveOperationsSummary);
router.post('/live-operations/create-operation', liveOperationsController.createOperation);
router.post('/live-operations/dispatch', liveOperationsController.dispatchTeam);
router.post('/live-operations/assign-vehicle', liveOperationsController.assignVehicle);

// --- ADMIN NOTIFICATIONS CENTER API ---
router.get('/notifications/center', adminNotificationsController.getAdminNotificationsCenter);
router.post('/notifications/comment', adminNotificationsController.addNotificationComment);
router.post('/notifications/assign-worker', adminNotificationsController.assignWorkerFromNotification);

// --- ADMIN CITIZENS MANAGEMENT API ---
router.get('/citizens/summary', adminCitizensController.getCitizensSummary);
router.post('/citizens/create', adminCitizensController.createCitizen);
router.patch('/citizens/:id/update', adminCitizensController.updateCitizen);
router.patch('/citizens/:id/status', adminCitizensController.updateCitizenStatus);
router.post('/citizens/:id/message', adminCitizensController.messageCitizen);

// --- WORKER MANAGEMENT ---

// Get all workers with computed task counts and duty status
router.get('/workers', async (req, res) => {
    try {
        const workers = await User.find({ role: 'worker' }).select('-password').lean();
        
        // Fetch issue workload aggregates for workers
        const workerIds = workers.map(w => w._id);
        const issues = await Issue.find({ assignedTo: { $in: workerIds } }).select('assignedTo status priority sla createdAt').lean();

        const workersWithStats = workers.map(worker => {
            const workerIssues = issues.filter(i => i.assignedTo && i.assignedTo.toString() === worker._id.toString());
            const assignedTasks = workerIssues.filter(i => ['assigned', 'in_progress'].includes(i.status)).length;
            const completedTasks = workerIssues.filter(i => ['resolved', 'closed'].includes(i.status)).length;
            const overdueTasks = workerIssues.filter(i => i.sla?.isBreached && !['resolved', 'closed'].includes(i.status)).length;
            
            return {
                ...worker,
                dutyStatus: worker.dutyStatus || 'on_duty',
                stats: {
                    totalTasks: workerIssues.length,
                    activeTasks: assignedTasks,
                    completedTasks,
                    overdueTasks
                }
            };
        });

        res.json(workersWithStats);
    } catch (err) {
        console.error('Error fetching workers:', err);
        res.status(500).json({ message: "Server error fetching workers" });
    }
});

// Get single worker profile with task history
router.get('/workers/:id', async (req, res) => {
    try {
        const worker = await User.findById(req.params.id).select('-password');
        if (!worker || worker.role !== 'worker') {
            return res.status(404).json({ message: "Worker not found" });
        }

        const tasks = await Issue.find({ assignedTo: worker._id })
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name email');

        res.json({
            worker,
            tasks,
            summary: {
                total: tasks.length,
                active: tasks.filter(t => ['assigned', 'in_progress'].includes(t.status)).length,
                resolved: tasks.filter(t => ['resolved', 'closed'].includes(t.status)).length,
                overdue: tasks.filter(t => t.sla?.isBreached && !['resolved', 'closed'].includes(t.status)).length
            }
        });
    } catch (err) {
        console.error('Error fetching worker details:', err);
        res.status(500).json({ message: "Server error fetching worker details" });
    }
});

// Create Worker
router.post('/create-worker', async (req, res) => {
    const { name, email, password, department, phone, dutyStatus } = req.body;
    try {
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email, and password are required" });
        }

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: "User with this email already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        user = new User({ 
            name, 
            email, 
            phone,
            password: hashedPassword, 
            role: 'worker',
            department: department || 'Other',
            dutyStatus: dutyStatus || 'on_duty'
        });
        await user.save();

        await logAudit({
            req,
            action: 'WORKER_CREATE',
            targetType: 'User',
            targetId: user._id,
            targetLabel: `${name} (${department || 'Other'})`,
            details: { email, department }
        });

        res.status(201).json({ 
            message: "Worker created successfully", 
            worker: { 
                _id: user._id, 
                name, 
                email, 
                department: user.department,
                dutyStatus: user.dutyStatus 
            } 
        });
    } catch (err) {
        console.error('Error creating worker:', err);
        res.status(500).json({ message: "Server error creating worker" });
    }
});

// Update worker
router.put('/workers/:id', async (req, res) => {
    const { name, email, department, phone, dutyStatus, password } = req.body;
    try {
        const user = await User.findById(req.params.id);
        if (!user || user.role !== 'worker') {
            return res.status(404).json({ message: "Worker not found" });
        }
        
        const oldDept = user.department;
        user.name = name || user.name;
        user.email = email || user.email;
        user.phone = phone !== undefined ? phone : user.phone;
        user.department = department || user.department;
        if (dutyStatus) user.dutyStatus = dutyStatus;
        
        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }
        
        await user.save();

        await logAudit({
            req,
            action: 'WORKER_UPDATE',
            targetType: 'User',
            targetId: user._id,
            targetLabel: user.name,
            details: { department: user.department, oldDepartment: oldDept, dutyStatus: user.dutyStatus }
        });

        res.json({ 
            _id: user._id, 
            name: user.name, 
            email: user.email, 
            department: user.department, 
            dutyStatus: user.dutyStatus,
            phone: user.phone 
        });
    } catch (err) {
        console.error('Error updating worker:', err);
        res.status(500).json({ message: "Server error updating worker" });
    }
});

// Update worker duty status
router.patch('/workers/:id/status', async (req, res) => {
    const { dutyStatus } = req.body;
    try {
        const allowedStatuses = ['on_duty', 'off_duty', 'busy', 'unavailable'];
        if (!allowedStatuses.includes(dutyStatus)) {
            return res.status(400).json({ message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
        }

        const user = await User.findById(req.params.id);
        if (!user || user.role !== 'worker') {
            return res.status(404).json({ message: "Worker not found" });
        }

        user.dutyStatus = dutyStatus;
        await user.save();

        await logAudit({
            req,
            action: 'WORKER_DUTY_STATUS_CHANGE',
            targetType: 'User',
            targetId: user._id,
            targetLabel: user.name,
            details: { dutyStatus }
        });

        res.json({ message: "Worker duty status updated", dutyStatus: user.dutyStatus });
    } catch (err) {
        console.error('Error updating duty status:', err);
        res.status(500).json({ message: "Server error updating duty status" });
    }
});

// --- SETTINGS MANAGEMENT ---

// Get system settings
router.get('/settings', async (req, res) => {
    try {
        let settings = await SystemSettings.findOne({ key: 'global' });
        if (!settings) {
            settings = new SystemSettings({ key: 'global' });
            await settings.save();
        }
        res.json(settings);
    } catch (err) {
        console.error('Error fetching settings:', err);
        res.status(500).json({ message: "Server error fetching settings" });
    }
});

// Update system settings
router.put('/settings', async (req, res) => {
    try {
        const { slaHours, optimizationDefaults, safetyThresholds, maintenanceMode } = req.body;
        
        let settings = await SystemSettings.findOne({ key: 'global' });
        if (!settings) {
            settings = new SystemSettings({ key: 'global' });
        }

        if (slaHours) {
            settings.slaHours = {
                urgent: Number(slaHours.urgent) || settings.slaHours.urgent,
                high: Number(slaHours.high) || settings.slaHours.high,
                normal: Number(slaHours.normal) || settings.slaHours.normal,
                low: Number(slaHours.low) || settings.slaHours.low
            };
        }

        if (optimizationDefaults) {
            settings.optimizationDefaults = {
                workers: Number(optimizationDefaults.workers) || settings.optimizationDefaults.workers,
                vehicles: Number(optimizationDefaults.vehicles) || settings.optimizationDefaults.vehicles,
                budget: Number(optimizationDefaults.budget) || settings.optimizationDefaults.budget,
                workingHours: Number(optimizationDefaults.workingHours) || settings.optimizationDefaults.workingHours
            };
        }

        if (safetyThresholds) {
            settings.safetyThresholds = {
                maxBudgetPerIntervention: Number(safetyThresholds.maxBudgetPerIntervention) || settings.safetyThresholds.maxBudgetPerIntervention,
                minRequiredRLTransitions: Number(safetyThresholds.minRequiredRLTransitions) || settings.safetyThresholds.minRequiredRLTransitions,
                minEvaluationDelayHours: Number(safetyThresholds.minEvaluationDelayHours) || settings.safetyThresholds.minEvaluationDelayHours
            };
        }

        if (maintenanceMode !== undefined) {
            settings.maintenanceMode = Boolean(maintenanceMode);
        }

        settings.updatedBy = req.user.id;
        settings.updatedAt = new Date();
        await settings.save();

        await logAudit({
            req,
            action: 'SETTINGS_UPDATE',
            targetType: 'SystemSettings',
            targetId: settings._id,
            targetLabel: 'Global System Settings',
            details: { slaHours: settings.slaHours, optimizationDefaults: settings.optimizationDefaults }
        });

        res.json({ message: "Settings updated successfully", settings });
    } catch (err) {
        console.error('Error updating settings:', err);
        res.status(500).json({ message: "Server error updating settings" });
    }
});

// --- AUDIT LOGS ---

// Get paginated audit logs
router.get('/audit-logs', async (req, res) => {
    try {
        const { page = 1, limit = 50, action, targetType, search } = req.query;
        const result = await getAuditLogs({ page, limit, action, targetType, search });
        res.json(result);
    } catch (err) {
        console.error('Error fetching audit logs:', err);
        res.status(500).json({ message: "Server error fetching audit logs" });
    }
});

// --- ADMINISTRATIVE OVERVIEW ---

router.get('/overview', async (req, res) => {
    try {
        const [
            totalIssues,
            pendingIssues,
            inProgressIssues,
            resolvedIssues,
            urgentIssues,
            workers,
            recentIssues
        ] = await Promise.all([
            Issue.countDocuments(),
            Issue.countDocuments({ status: { $in: ['reported', 'verified', 'reopened'] } }),
            Issue.countDocuments({ status: { $in: ['assigned', 'in_progress'] } }),
            Issue.countDocuments({ status: { $in: ['resolved', 'closed'] } }),
            Issue.countDocuments({ priority: { $in: ['urgent', 'high'] }, status: { $nin: ['resolved', 'closed'] } }),
            User.find({ role: 'worker' }).select('_id dutyStatus department'),
            Issue.find()
                .sort({ updatedAt: -1 })
                .limit(5)
                .populate('assignedTo', 'name')
                .populate('createdBy', 'name email')
        ]);

        const activeWorkers = workers.filter(w => w.dutyStatus === 'on_duty').length;

        res.json({
            stats: {
                totalIssues,
                pendingIssues,
                inProgressIssues,
                resolvedIssues,
                urgentIssues,
                totalWorkers: workers.length,
                activeWorkers
            },
            recentIssues
        });
    } catch (err) {
        console.error('Error fetching overview:', err);
        res.status(500).json({ message: "Server error fetching overview" });
    }
});

module.exports = router;
