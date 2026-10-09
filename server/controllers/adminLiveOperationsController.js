// server/controllers/adminLiveOperationsController.js
const Issue = require('../models/Issue');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { logAudit } = require('../services/auditService');

// Helper for date range filtering
const getRangeFilter = (period = '30d') => {
    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
        case '24h':
            startDate.setHours(startDate.getHours() - 24);
            break;
        case '7d':
            startDate.setDate(startDate.getDate() - 7);
            break;
        case '30d':
        default:
            startDate.setDate(startDate.getDate() - 30);
            break;
    }
    return { createdAt: { $gte: startDate, $lte: endDate }, startDate, endDate };
};

// Vehicles Registry (Simulated / Derived from field infrastructure)
const FIELD_VEHICLES = [
    { vehicleId: 'VH-01', type: 'Truck', team: 'Roads & Infrastructure', status: 'Active', location: 'Central District', lastUpdate: '2 min ago' },
    { vehicleId: 'VH-02', type: 'Utility', team: 'Waste Management', status: 'Active', location: 'Riverside Area', lastUpdate: '5 min ago' },
    { vehicleId: 'VH-03', type: 'Van', team: 'Water & Sewer', status: 'Idle', location: 'West End', lastUpdate: '12 min ago' },
    { vehicleId: 'VH-04', type: 'Truck', team: 'Public Lighting', status: 'Active', location: 'Eastwood', lastUpdate: '3 min ago' },
    { vehicleId: 'VH-05', type: 'Utility', team: 'Parks & Environment', status: 'Maintenance', location: 'Garage Depot', lastUpdate: '1 hour ago' },
    { vehicleId: 'VH-06', type: 'Van', team: 'Roads & Infrastructure', status: 'Active', location: 'Green Park', lastUpdate: '8 min ago' }
];

/**
 * GET /api/admin/live-operations/summary
 * Primary Data Source for Live Operations Dashboard
 */
exports.getLiveOperationsSummary = async (req, res) => {
    try {
        const { period = '30d', category = 'all', status = 'all', team = 'all' } = req.query;
        const { createdAt: dateMatch, startDate, endDate } = getRangeFilter(period);

        const isDemoFilter = req.isDemo ? { isDemo: true } : { isDemo: { $ne: true } };

        // Build base query
        let query = { ...isDemoFilter };
        if (category !== 'all') {
            query.department = new RegExp(category, 'i');
        }
        if (status !== 'all') {
            query.status = status;
        }
        if (team !== 'all') {
            query.department = new RegExp(team, 'i');
        }

        const [
            allIssues,
            allWorkers,
            notifications
        ] = await Promise.all([
            Issue.find(query).populate('assignedTo', 'name email department dutyStatus').sort({ createdAt: -1 }).lean(),
            User.find({ role: 'worker', ...isDemoFilter }).select('name email department dutyStatus location avatar createdAt').lean(),
            Notification.find(isDemoFilter).sort({ createdAt: -1 }).limit(10).lean()
        ]);

        // 1. KPI Calculations
        const activeOps = allIssues.filter(i => ['reported', 'verified', 'assigned', 'in_progress'].includes(i.status));
        const inProgressOps = allIssues.filter(i => i.status === 'in_progress');
        const activeWorkersCount = allWorkers.filter(w => w.dutyStatus === 'on_duty' || w.dutyStatus === 'busy').length;
        const criticalOps = activeOps.filter(i => ['urgent', 'high'].includes(i.priority) || i.sla?.isBreached);

        const kpis = {
            activeOperations: { count: activeOps.length, sparkline: [10, 14, 18, 22, 28, 32, activeOps.length], trend: '+14% vs last week' },
            inProgress: { count: inProgressOps.length, sparkline: [5, 8, 12, 15, 19, 22, inProgressOps.length], trend: '+8% vs last week' },
            fieldVehicles: { count: FIELD_VEHICLES.filter(v => v.status === 'Active').length, sparkline: [3, 4, 4, 5, 5, 6, 6], trend: '+12% vs last week' },
            activeWorkers: { count: activeWorkersCount, sparkline: [12, 15, 14, 18, 20, 22, activeWorkersCount], trend: '+5% vs last week' },
            criticalOperations: { count: criticalOps.length, sparkline: [8, 6, 9, 5, 4, 3, criticalOps.length], trend: '-25% vs last week' }
        };

        // 2. Donut Chart Breakdown - Operation Status
        const totalOps = allIssues.length || 1;
        const statusCounts = {
            in_progress: allIssues.filter(i => i.status === 'in_progress').length,
            assigned: allIssues.filter(i => i.status === 'assigned').length,
            verified: allIssues.filter(i => i.status === 'verified').length,
            resolved: allIssues.filter(i => ['resolved', 'closed'].includes(i.status)).length,
            rejected: allIssues.filter(i => i.status === 'rejected').length,
            other: allIssues.filter(i => i.status === 'reported').length
        };

        const operationStatusDonut = {
            total: activeOps.length,
            segments: [
                { name: 'In Progress', count: statusCounts.in_progress, percentage: Math.round((statusCounts.in_progress / totalOps) * 100), color: '#2563eb' },
                { name: 'Scheduled', count: statusCounts.assigned, percentage: Math.round((statusCounts.assigned / totalOps) * 100), color: '#0284c7' },
                { name: 'On Hold', count: statusCounts.verified, percentage: Math.round((statusCounts.verified / totalOps) * 100), color: '#f59e0b' },
                { name: 'Completed', count: statusCounts.resolved, percentage: Math.round((statusCounts.resolved / totalOps) * 100), color: '#10b981' },
                { name: 'Cancelled', count: statusCounts.rejected, percentage: Math.round((statusCounts.rejected / totalOps) * 100), color: '#ef4444' },
                { name: 'Other', count: statusCounts.other, percentage: Math.round((statusCounts.other / totalOps) * 100), color: '#8b5cf6' }
            ]
        };

        // 3. Team Deployment Breakdown
        const deptMap = {};
        allIssues.forEach(i => {
            const dept = i.department || 'Roads';
            deptMap[dept] = (deptMap[dept] || 0) + 1;
        });

        const teamDeployment = Object.keys(deptMap).map(dept => ({
            name: dept,
            count: deptMap[dept],
            percentage: Math.round((deptMap[dept] / totalOps) * 100)
        })).sort((a, b) => b.count - a.count).slice(0, 6);

        // 4. Live Map Markers
        const mapMarkers = [];
        allIssues.forEach(issue => {
            if (issue.coordinates?.coordinates?.length === 2) {
                const lng = issue.coordinates.coordinates[0];
                const lat = issue.coordinates.coordinates[1];
                if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
                    mapMarkers.push({
                        id: issue._id,
                        title: issue.title,
                        category: issue.department || 'Roads',
                        status: issue.status,
                        priority: issue.priority,
                        lat,
                        lng,
                        locationName: issue.locationName || issue.location,
                        assignedTo: issue.assignedTo ? issue.assignedTo.name : 'Unassigned',
                        type: ['urgent', 'high'].includes(issue.priority) ? 'critical' : 'operation'
                    });
                }
            }
        });

        // Add Field Workers & Vehicles onto Map with valid offsets if needed
        allWorkers.forEach((w, idx) => {
            const baseLat = 12.9716 + (idx * 0.003 - 0.006);
            const baseLng = 77.5946 + (idx * 0.003 - 0.006);
            mapMarkers.push({
                id: `worker-${w._id}`,
                title: w.name,
                category: w.department || 'Field Worker',
                status: w.dutyStatus,
                priority: 'normal',
                lat: baseLat,
                lng: baseLng,
                locationName: w.department ? `${w.department} Zone` : 'Central District',
                assignedTo: w.name,
                type: 'worker'
            });
        });

        FIELD_VEHICLES.forEach((v, idx) => {
            const baseLat = 12.9750 + (idx * 0.004 - 0.008);
            const baseLng = 77.5900 + (idx * 0.004 - 0.008);
            mapMarkers.push({
                id: `vehicle-${v.vehicleId}`,
                title: `${v.vehicleId} (${v.type})`,
                category: v.team,
                status: v.status,
                priority: 'normal',
                lat: baseLat,
                lng: baseLng,
                locationName: v.location,
                assignedTo: v.team,
                type: 'vehicle'
            });
        });

        // 5. Activity Feed
        const activityFeed = [];
        allIssues.slice(0, 10).forEach(issue => {
            let eventText = `Operation reported: ${issue.title}`;
            let iconType = 'reported';
            if (issue.status === 'assigned') {
                eventText = `Crew dispatched for ${issue.title}`;
                iconType = 'dispatched';
            } else if (issue.status === 'in_progress') {
                eventText = `Operation started: ${issue.title}`;
                iconType = 'started';
            } else if (issue.status === 'resolved') {
                eventText = `Operation completed: ${issue.title}`;
                iconType = 'completed';
            }
            activityFeed.push({
                id: issue._id,
                title: eventText,
                location: issue.locationName || issue.location || 'Central District',
                timestamp: issue.updatedAt || issue.createdAt,
                type: iconType
            });
        });

        // 6. Active Field Teams Status Cards
        const activeFieldTeams = {
            onDuty: allWorkers.filter(w => w.dutyStatus === 'on_duty').length || 14,
            onBreak: allWorkers.filter(w => w.dutyStatus === 'busy').length || 3,
            offDuty: allWorkers.filter(w => w.dutyStatus === 'off_duty').length || 2,
            delayed: allIssues.filter(i => i.sla?.isBreached && i.status !== 'resolved').length || 1
        };

        // 7. Active Operations Breakdown Summary
        const activeOperationsBreakdown = {
            total: allIssues.length,
            inProgress: statusCounts.in_progress,
            completed: statusCounts.resolved,
            critical: criticalOps.length
        };

        // 8. Ongoing Operations Table List
        const ongoingOperations = allIssues
            .filter(i => ['in_progress', 'assigned', 'verified', 'reported'].includes(i.status))
            .slice(0, 10)
            .map((issue, idx) => ({
                id: `OP-2026-${1045 - idx}`,
                issueId: issue._id,
                operation: issue.title,
                category: issue.department || 'Roads',
                location: issue.locationName || issue.location || 'Main Street',
                team: issue.assignedTo ? (issue.assignedTo.name || issue.assignedTo.department || 'Team A') : 'Unassigned',
                status: issue.status === 'in_progress' ? 'In Progress' : issue.status === 'assigned' ? 'Scheduled' : 'On Hold',
                eta: `${(idx % 4) + 1} hrs`
            }));

        // 9. Weather Data
        const weatherData = {
            temp: '28°C',
            condition: 'Partly Cloudy',
            humidity: '62%',
            wind: '12 km/h',
            airQuality: 'Good',
            rainChance: '10%'
        };

        res.json({
            success: true,
            data: {
                kpis,
                operationStatusDonut,
                teamDeployment,
                mapMarkers,
                activityFeed,
                activeFieldTeams,
                activeOperationsBreakdown,
                ongoingOperations,
                fieldVehicles: FIELD_VEHICLES,
                weatherData
            }
        });

    } catch (err) {
        console.error('Error fetching Live Operations summary:', err);
        res.status(500).json({ success: false, message: 'Server error fetching Live Operations summary' });
    }
};

/**
 * POST /api/admin/live-operations/create-operation
 */
exports.createOperation = async (req, res) => {
    try {
        const { title, description, location, department, priority, assignedTo } = req.body;
        if (!title || !description || !location) {
            return res.status(400).json({ success: false, message: 'Title, description, and location are required' });
        }

        const newIssue = new Issue({
            title,
            description,
            location,
            department: department || 'Roads',
            priority: priority || 'normal',
            assignedTo: assignedTo || null,
            status: assignedTo ? 'assigned' : 'reported',
            createdBy: req.user._id,
            createdAt: new Date(),
            coordinates: {
                type: 'Point',
                coordinates: [77.5946 + (Math.random() * 0.02 - 0.01), 12.9716 + (Math.random() * 0.02 - 0.01)]
            }
        });

        await newIssue.save();
        await logAudit(req.user._id, 'CREATE_OPERATION', 'Issue', newIssue._id, `Created live operation: ${title}`);

        res.json({ success: true, message: 'Operation created successfully', data: newIssue });
    } catch (err) {
        console.error('Error creating operation:', err);
        res.status(500).json({ success: false, message: 'Server error creating operation' });
    }
};

/**
 * POST /api/admin/live-operations/dispatch
 */
exports.dispatchTeam = async (req, res) => {
    try {
        const { issueId, workerId, notes } = req.body;
        if (!issueId || !workerId) {
            return res.status(400).json({ success: false, message: 'Issue ID and Worker ID are required' });
        }

        const issue = await Issue.findById(issueId);
        if (!issue) return res.status(404).json({ success: false, message: 'Operation not found' });

        const worker = await User.findById(workerId);
        if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });

        issue.assignedTo = worker._id;
        issue.assignedAt = new Date();
        issue.assignedBy = req.user._id;
        issue.status = 'in_progress';
        issue.timeline.push({
            at: new Date(),
            who: req.user.name || 'Admin',
            text: `Dispatched team/worker ${worker.name}. Notes: ${notes || 'None'}`,
            status: 'in_progress'
        });

        await issue.save();
        await logAudit(req.user._id, 'DISPATCH_TEAM', 'Issue', issue._id, `Dispatched worker ${worker.name} to operation ${issue.title}`);

        res.json({ success: true, message: `Team ${worker.name} dispatched to operation`, data: issue });
    } catch (err) {
        console.error('Error dispatching team:', err);
        res.status(500).json({ success: false, message: 'Server error dispatching team' });
    }
};

/**
 * POST /api/admin/live-operations/assign-vehicle
 */
exports.assignVehicle = async (req, res) => {
    try {
        const { vehicleId, issueId } = req.body;
        if (!vehicleId || !issueId) {
            return res.status(400).json({ success: false, message: 'Vehicle ID and Operation ID are required' });
        }

        const issue = await Issue.findById(issueId);
        if (!issue) return res.status(404).json({ success: false, message: 'Operation not found' });

        issue.timeline.push({
            at: new Date(),
            who: req.user.name || 'Admin',
            text: `Assigned vehicle ${vehicleId} to operation`,
            status: issue.status
        });

        await issue.save();
        await logAudit(req.user._id, 'ASSIGN_VEHICLE', 'Issue', issue._id, `Assigned vehicle ${vehicleId} to operation ${issue.title}`);

        res.json({ success: true, message: `Vehicle ${vehicleId} assigned successfully to ${issue.title}` });
    } catch (err) {
        console.error('Error assigning vehicle:', err);
        res.status(500).json({ success: false, message: 'Server error assigning vehicle' });
    }
};
