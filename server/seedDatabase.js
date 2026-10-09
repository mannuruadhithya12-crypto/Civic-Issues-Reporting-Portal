// server/seedDatabase.js
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Issue = require('./models/Issue');
const PublicHistoricalIncident = require('./models/PublicHistoricalIncident');
const Campaign = require('./models/Campaign');
const AdaptivePolicy = require('./models/AdaptivePolicy');
const AuditLog = require('./models/AuditLog');
const Report = require('./models/Report');
const SystemSettings = require('./models/SystemSettings');
const Notification = require('./models/Notification');
const Announcement = require('./models/Announcement');
const { trainModel } = require('./ml/train');

async function seedDatabase() {
    try {
        console.log("Checking demonstration dataset...");

        // 1. Get or Create Users
        let admin = await User.findOne({ email: 'admin@civic.gov' });
        if (!admin) {
            const adminPass = await bcrypt.hash('admin123', 10);
            admin = await User.create({
                name: 'City Administrator',
                email: 'admin@civic.gov',
                password: adminPass,
                role: 'admin',
                dutyStatus: 'on_duty'
            });
        }

        // Create user's testing account
        let userTest = await User.findOne({ email: 'mannuruadhithya12@gmail.com' });
        if (!userTest) {
            const userPass = await bcrypt.hash('1234567890', 10);
            userTest = await User.create({
                name: 'Chintu Adhithya',
                email: 'mannuruadhithya12@gmail.com',
                password: userPass,
                phone: '+1 (555) 123-4567',
                address: 'Maple Avenue, Block 5, Riverdale',
                city: 'Riverside',
                state: 'California',
                postalCode: '90210',
                country: 'United States',
                role: 'citizen',
                dutyStatus: 'off_duty'
            });
        }

        // Create AR1@gmail.com testing account
        let ar1User = await User.findOne({ email: 'ar1@gmail.com' });
        if (!ar1User) {
            const ar1Pass = await bcrypt.hash('password123', 10);
            await User.create({
                name: 'AR1 User',
                email: 'ar1@gmail.com',
                password: ar1Pass,
                role: 'citizen',
                dutyStatus: 'off_duty'
            });
        }



        const workerPass = await bcrypt.hash('worker123', 10);
        const workersData = [
            { name: 'Rajesh Kumar', email: 'worker@civic.gov', department: 'Roads & Infrastructure', phone: '+91 98765 43210' },
            { name: 'Anil Sharma', email: 'worker.anil@civic.gov', department: 'Sanitation', phone: '+91 98765 43211' },
            { name: 'Priya Verma', email: 'worker.priya@civic.gov', department: 'Electrical', phone: '+91 98765 43212' },
            { name: 'Suresh Patil', email: 'worker.suresh@civic.gov', department: 'Water Supply', phone: '+91 98765 43213' }
        ];

        const workers = [];
        for (const w of workersData) {
            let user = await User.findOne({ email: w.email });
            if (!user) {
                user = await User.create({
                    ...w,
                    password: workerPass,
                    role: 'worker',
                    dutyStatus: 'on_duty'
                });
            }
            workers.push(user);
        }

        // 2. Base Coordinates (Bangalore city center coordinates)
        const baseLat = 12.9716;
        const baseLon = 77.5946;

        const categories = [
            'Potholes',
            'Garbage overflow',
            'Streetlight failures',
            'Water leakage',
            'Illegal parking',
            'Drainage issues',
            'Broken footpaths',
            'Noise pollution',
            'Public safety issues'
        ];

        const priorities = ['low', 'normal', 'high', 'urgent'];
        const statuses = ['reported', 'verified', 'assigned', 'in_progress', 'resolved', 'closed'];

        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;

        // 3. Create 45 Civic Issues spread over last 60 days
        const issueDocs = [];
        const sampleLocations = [
            "MG Road Junction, Ward 112",
            "Indiranagar 100ft Road, Ward 85",
            "Koramangala 4th Block, Ward 151",
            "Whitefield Main Road, Ward 84",
            "Jayanagar 4th T Block, Ward 153",
            "Malleshwaram 8th Cross, Ward 45",
            "BTM Layout 2nd Stage, Ward 176",
            "HSR Layout Sector 2, Ward 174",
            "Rajajinagar 1st Block, Ward 10",
            "Electronic City Phase 1, Ward 192"
        ];

        for (let i = 0; i < 45; i++) {
            // Days ago between 1 and 60
            const daysAgo = Math.floor(Math.random() * 58) + 1;
            const createdAt = new Date(now - daysAgo * dayMs);
            const cat = categories[i % categories.length];
            const prio = priorities[i % priorities.length];
            const stat = statuses[i % statuses.length];
            const assignedWorker = ['assigned', 'in_progress', 'resolved', 'closed'].includes(stat)
                ? workers[i % workers.length]._id
                : undefined;

            const latOffset = (Math.random() - 0.5) * 0.08;
            const lonOffset = (Math.random() - 0.5) * 0.08;
            const lat = Number((baseLat + latOffset).toFixed(4));
            const lon = Number((baseLon + lonOffset).toFixed(4));

            const isResolved = ['resolved', 'closed'].includes(stat);
            const resolvedAt = isResolved ? new Date(createdAt.getTime() + (Math.random() * 4 + 1) * dayMs) : undefined;

            issueDocs.push({
                title: `${cat} near ${sampleLocations[i % sampleLocations.length]}`,
                description: `Urgent community report regarding severe ${cat.toLowerCase()} causing civic disruption and safety hazard.`,
                location: sampleLocations[i % sampleLocations.length],
                locationName: sampleLocations[i % sampleLocations.length],
                coordinates: {
                    type: 'Point',
                    coordinates: [lon, lat] // [lon, lat]
                },
                department: cat,
                priority: prio,
                status: stat,
                assignedTo: assignedWorker,
                createdBy: admin._id,
                createdAt: createdAt,
                resolvedAt: resolvedAt,
                resolvedBy: isResolved ? assignedWorker : undefined,
                sla: {
                    targetHours: prio === 'urgent' ? 24 : prio === 'high' ? 72 : 168,
                    dueAt: new Date(createdAt.getTime() + (prio === 'urgent' ? 24 : prio === 'high' ? 72 : 168) * 3600 * 1000),
                    isBreached: !isResolved && (now > (createdAt.getTime() + 72 * 3600 * 1000))
                },
                timeline: [
                    { at: createdAt, who: 'Citizen Reporter', text: 'Issue submitted via Portal', status: 'reported' },
                    ...(stat !== 'reported' ? [{ at: new Date(createdAt.getTime() + 3600000), who: 'Admin', text: 'Verified by Operations Team', status: 'verified' }] : []),
                    ...(assignedWorker ? [{ at: new Date(createdAt.getTime() + 7200000), who: 'Admin', text: 'Assigned to field worker', status: 'assigned' }] : []),
                    ...(isResolved ? [{ at: resolvedAt, who: 'Rajesh Kumar', text: 'Issue resolved on site', status: 'resolved' }] : [])
                ]
            });
        }

        // Add hotspot clusters for ML temporal grouping and positive sample training
        const clusters = [
            { cat: 'Potholes', lat: baseLat + 0.001, lon: baseLon + 0.001, loc: "MG Road Junction, Ward 112", days: [50, 49, 48, 35, 34, 33, 22, 21, 20, 10, 9, 8] },
            { cat: 'Streetlight failures', lat: baseLat - 0.002, lon: baseLon + 0.003, loc: "Indiranagar 100ft Road, Ward 85", days: [48, 47, 46, 33, 32, 31, 18, 17, 16] },
            { cat: 'Water leakage', lat: baseLat + 0.003, lon: baseLon - 0.002, loc: "Koramangala 4th Block, Ward 151", days: [52, 51, 50, 38, 37, 36, 24, 23, 11, 10] }
        ];

        for (const cl of clusters) {
            for (const d of cl.days) {
                const createdAt = new Date(now - d * dayMs);
                issueDocs.push({
                    title: `Critical ${cl.cat} near ${cl.loc}`,
                    description: `High-priority recurrent ${cl.cat.toLowerCase()} in active cluster sector.`,
                    location: cl.loc,
                    locationName: cl.loc,
                    coordinates: {
                        type: 'Point',
                        coordinates: [cl.lon, cl.lat]
                    },
                    department: cl.cat,
                    priority: 'high',
                    status: d < 15 ? 'in_progress' : 'resolved',
                    assignedTo: workers[0]._id,
                    createdBy: admin._id,
                    createdAt: createdAt,
                    resolvedAt: d >= 15 ? new Date(createdAt.getTime() + 2 * dayMs) : undefined,
                    sla: {
                        targetHours: 72,
                        dueAt: new Date(createdAt.getTime() + 72 * 3600 * 1000),
                        isBreached: false
                    },
                    timeline: [
                        { at: createdAt, who: 'Citizen Reporter', text: 'Reported in high activity corridor', status: 'reported' }
                    ]
                });
            }
        }

        let insertedIssues;
        await Issue.deleteMany({});
        insertedIssues = await Issue.insertMany(issueDocs);
        console.log(`Seeded ${insertedIssues.length} civic issues with hotspot clusters.`);

        // 4. Create PublicHistoricalIncidents for RL / ML training dataset
        if (await PublicHistoricalIncident.countDocuments() === 0) {
            const incidentDocs = [];
            for (let j = 0; j < 50; j++) {
                const daysAgo = Math.floor(Math.random() * 85) + 5;
                const reportedAt = new Date(now - daysAgo * dayMs);
                const closedAt = new Date(reportedAt.getTime() + (Math.random() * 3 + 1) * dayMs);
                const cat = categories[j % categories.length];
                const latOffset = (Math.random() - 0.5) * 0.08;
                const lonOffset = (Math.random() - 0.5) * 0.08;

                incidentDocs.push({
                    sourceName: 'City Open Data Portal',
                    sourceDataset: 'MUNICIPAL-311-HISTORICAL-2026',
                    sourceRecordId: `HIST-INC-${1000 + j}`,
                    reportedAt,
                    closedAt,
                    category: cat,
                    description: `Historical municipal incident log for ${cat.toLowerCase()}`,
                    department: cat,
                    latitude: Number((baseLat + latOffset).toFixed(4)),
                    longitude: Number((baseLon + lonOffset).toFixed(4)),
                    locationText: sampleLocations[j % sampleLocations.length]
                });
            }
            await PublicHistoricalIncident.insertMany(incidentDocs);
            console.log(`Seeded ${incidentDocs.length} historical incidents.`);
        }

        // 5. System Settings
        await SystemSettings.getSettings();

        // 6. Seed Campaigns
        if (await Campaign.countDocuments() === 0) {
            const activeIssues = insertedIssues.filter(i => ['reported', 'assigned', 'in_progress'].includes(i.status)).slice(0, 5);
            await Campaign.create([
                {
                    name: 'Mission Clean Roads: Monsoon Pothole Blitz',
                    description: 'Proactive rapid-response intervention to eliminate critical potholes along key transit corridors.',
                    objective: 'Zero critical potholes in arterial roads within 14 days',
                    category: 'Potholes',
                    targetArea: 'East Zone & Central Ward 112',
                    startDate: new Date(now - 3 * dayMs),
                    endDate: new Date(now + 11 * dayMs),
                    status: 'ACTIVE',
                    progress: 42,
                    resources: { workers: 8, vehicles: 2, hours: 120, budget: 85000 },
                    spent: 34200,
                    targetIssues: activeIssues.map(i => i._id),
                    createdBy: admin._id
                },
                {
                    name: 'Smart Lighting & Safety Overhaul',
                    description: 'Citywide replacement of failed streetlights with high-efficiency LED luminaires.',
                    objective: 'Achieve 98% streetlight uptime across residential sectors',
                    category: 'Streetlight failures',
                    targetArea: 'Koramangala & Indiranagar Wards',
                    startDate: new Date(now - 10 * dayMs),
                    endDate: new Date(now + 20 * dayMs),
                    status: 'ACTIVE',
                    progress: 68,
                    resources: { workers: 4, vehicles: 1, hours: 80, budget: 45000 },
                    spent: 29500,
                    targetIssues: [],
                    createdBy: admin._id
                }
            ]);
            console.log("Seeded active campaigns.");
        }

        // 7. Seed Adaptive Policies
        if (await AdaptivePolicy.countDocuments() === 0) {
            await AdaptivePolicy.create([
                {
                    policyId: 'POLICY-DQN-v1',
                    policyVersion: '1.0.0',
                    strategyId: 'DQN',
                    stateVersion: '1.0',
                    actionVersion: '1.0',
                    modelType: 'DQN',
                    modelVersion: '1.0.0',
                    status: 'ACTIVE',
                    createdBy: admin._id,
                    approvedBy: admin._id,
                    approvedAt: new Date(now - 5 * dayMs),
                    activatedAt: new Date(now - 4 * dayMs),
                    governanceMetadata: {
                        rationale: 'Validated high throughput with safety fallback and lower SLA breach rates.',
                        accuracyBaseline: 0.88
                    }
                },
                {
                    policyId: 'POLICY-DET-BASELINE',
                    policyVersion: '1.0.0',
                    strategyId: 'DETERMINISTIC',
                    stateVersion: '1.0',
                    actionVersion: '1.0',
                    modelType: 'NONE',
                    status: 'APPROVED',
                    createdBy: admin._id,
                    approvedBy: admin._id,
                    approvedAt: new Date(now - 10 * dayMs),
                    governanceMetadata: {
                        rationale: 'Deterministic rule-based safety baseline'
                    }
                }
            ]);
            console.log("Seeded adaptive policies.");
        }

        // 8. Seed Sample Reports
        if (await Report.countDocuments() === 0) {
            await Report.create([
                {
                    name: 'Monthly Municipal Operations Summary',
                    type: 'Executive Summary',
                    status: 'Completed',
                    period: 'September 2026',
                    generatedBy: admin._id
                },
                {
                    name: 'SLA Performance & Breach Analysis',
                    type: 'SLA Performance',
                    status: 'Completed',
                    period: 'Q3 2026',
                    generatedBy: admin._id
                },
                {
                    name: 'Geospatial Civic Hazard Distribution',
                    type: 'Geographic Report',
                    status: 'Completed',
                    period: 'Past 30 Days',
                    generatedBy: admin._id
                }
            ]);
        }

        // 9. Seed Audit Logs
        if (await AuditLog.countDocuments() === 0) {
            await AuditLog.create([
                {
                    actor: admin._id,
                    actorName: 'City Administrator',
                    actorRole: 'admin',
                    action: 'INITIALIZE_COMMAND_CENTER',
                    targetType: 'SYSTEM',
                    targetId: 'global',
                    targetLabel: 'System Settings',
                    details: { initialized: true },
                    outcome: 'SUCCESS'
                },
                {
                    actor: admin._id,
                    actorName: 'City Administrator',
                    actorRole: 'admin',
                    action: 'ACTIVATE_POLICY',
                    targetType: 'ADAPTIVE_POLICY',
                    targetId: 'POLICY-DQN-v1',
                    targetLabel: 'Deep Q-Network Adaptive Policy',
                    outcome: 'SUCCESS'
                }
            ]);
        }

        // 10. Seed Notifications
        if (userTest && await Notification.countDocuments({ user: userTest._id }) === 0) {
            const userIssues = await Issue.find({ createdBy: userTest._id });
            const mainIssue = userIssues[0] || null;
            const secondIssue = userIssues[1] || null;
            const thirdIssue = userIssues[2] || null;

            await Notification.create([
                {
                    user: userTest._id,
                    type: 'status_update',
                    title: 'Issue Status Updated',
                    message: mainIssue 
                        ? `Your issue #${mainIssue._id.toString().substring(mainIssue._id.toString().length - 6).toUpperCase()} status has been updated to In Progress.`
                        : 'Your reported issue status has been updated to In Progress.',
                    issue: mainIssue ? mainIssue._id : null,
                    read: false,
                    createdAt: new Date(now - 2 * 3600 * 1000)
                },
                {
                    user: userTest._id,
                    type: 'comment',
                    title: 'New Comment on Your Issue',
                    message: secondIssue 
                        ? `The maintenance team has added a comment on your issue #${secondIssue._id.toString().substring(secondIssue._id.toString().length - 6).toUpperCase()}.`
                        : 'The maintenance team has added a comment on your reported issue.',
                    issue: secondIssue ? secondIssue._id : null,
                    read: false,
                    createdAt: new Date(now - 5 * 3600 * 1000)
                },
                {
                    user: userTest._id,
                    type: 'resolved',
                    title: 'Issue Resolved',
                    message: thirdIssue 
                        ? `Your issue #${thirdIssue._id.toString().substring(thirdIssue._id.toString().length - 6).toUpperCase()} has been marked as Resolved. Thank you for your report!`
                        : 'Your reported issue has been marked as Resolved. Thank you for your report!',
                    issue: thirdIssue ? thirdIssue._id : null,
                    read: true,
                    createdAt: new Date(now - 24 * 3600 * 1000)
                },
                {
                    user: userTest._id,
                    type: 'announcement',
                    title: 'Community Clean-Up Drive',
                    message: 'Join us this weekend for a community clean-up drive at Central Park.',
                    read: true,
                    createdAt: new Date(now - 2 * 24 * 3600 * 1000)
                },
                {
                    user: userTest._id,
                    type: 'issue_received',
                    title: 'Issue Received',
                    message: mainIssue 
                        ? `Your issue #${mainIssue._id.toString().substring(mainIssue._id.toString().length - 6).toUpperCase()} has been successfully submitted.`
                        : 'Your reported issue has been successfully submitted.',
                    issue: mainIssue ? mainIssue._id : null,
                    read: true,
                    createdAt: new Date(now - 3 * 24 * 3600 * 1000)
                },
                {
                    user: userTest._id,
                    type: 'warning',
                    title: 'Delayed Response Notice',
                    message: 'There may be delays in response times due to heavy rainfall. We appreciate your patience.',
                    read: true,
                    createdAt: new Date(now - 4 * 24 * 3600 * 1000)
                },
                {
                    user: userTest._id,
                    type: 'under_review',
                    title: 'Issue Under Review',
                    message: secondIssue 
                        ? `Your issue #${secondIssue._id.toString().substring(secondIssue._id.toString().length - 6).toUpperCase()} is now under review by the authorities.`
                        : 'Your reported issue is now under review by the authorities.',
                    issue: secondIssue ? secondIssue._id : null,
                    read: true,
                    createdAt: new Date(now - 5 * 24 * 3600 * 1000)
                }
            ]);
            console.log("Seeded user notifications.");
        }

        if (await Notification.countDocuments({ user: admin._id }) === 0) {
            await Notification.create([
                {
                    user: admin._id,
                    type: 'general',
                    title: 'Welcome to CivicConnect Command Center',
                    message: 'All administrative subsystems, predictive models, and worker dispatches are active and monitoring civic telemetry.',
                    read: false
                },
                {
                    user: admin._id,
                    type: 'sla_warning',
                    title: 'High Priority SLA Threshold',
                    message: 'Water leakage near MG Road Junction is approaching SLA warning threshold.',
                    read: false
                }
            ]);
        }

        // Seed Worker Notifications matching exact reference design
        for (const worker of workers) {
            if (await Notification.countDocuments({ user: worker._id }) === 0) {
                const workerIssues = await Issue.find({ assignedTo: worker._id });
                const i1 = workerIssues[0] || null;
                const i2 = workerIssues[1] || i1;
                const i3 = workerIssues[2] || i1;
                const i4 = workerIssues[3] || i1;
                const i5 = workerIssues[4] || i1;
                const i6 = workerIssues[5] || i1;
                const i7 = workerIssues[6] || i1;

                // Ensure i1 matches exact reference design if it's the primary worker
                if (worker.email === 'worker@civic.gov' && i1) {
                    i1.title = 'Pothole Repair - Main Street';
                    i1.location = 'Main Street, Near Metro Station';
                    i1.locationName = 'Main Street, Near Metro Station';
                    i1.department = 'Roads';
                    i1.priority = 'high';
                    i1.assignedBy = admin._id;
                    i1.assignedAt = new Date(now - 3 * 3600 * 1000);
                    i1.sla = {
                        targetHours: 24,
                        dueAt: new Date(now + 5 * 3600 * 1000),
                        isBreached: false
                    };
                    await i1.save();
                }

                await Notification.create([
                    {
                        user: worker._id,
                        type: 'new_task',
                        title: 'New Task Assigned',
                        message: 'You have been assigned a new task: Pothole Repair - Main Street',
                        issue: i1 ? i1._id : null,
                        read: false,
                        createdAt: new Date(now - 2 * 60 * 1000)
                    },
                    {
                        user: worker._id,
                        type: 'task_updated',
                        title: 'Task Status Updated',
                        message: 'Garbage Collection - Zone B has been updated to In Progress',
                        issue: i2 ? i2._id : null,
                        read: false,
                        createdAt: new Date(now - 60 * 60 * 1000)
                    },
                    {
                        user: worker._id,
                        type: 'task_due',
                        title: 'Task Due Today',
                        message: 'Water Leakage - Block 5 is due today. Please complete it on time.',
                        issue: i3 ? i3._id : null,
                        read: false,
                        createdAt: new Date(now - 3 * 3600 * 1000)
                    },
                    {
                        user: worker._id,
                        type: 'task_completed',
                        title: 'Task Completed',
                        message: 'Street Light Repair - Ward 12 has been marked as completed.',
                        issue: i4 ? i4._id : null,
                        read: true,
                        createdAt: new Date(now - 5 * 3600 * 1000)
                    },
                    {
                        user: worker._id,
                        type: 'new_comment',
                        title: 'New Comment',
                        message: 'A new comment has been added to your task: Footpath Repair',
                        issue: i5 ? i5._id : null,
                        read: true,
                        createdAt: new Date(now - 24 * 3600 * 1000)
                    },
                    {
                        user: worker._id,
                        type: 'system_announcement',
                        title: 'System Announcement',
                        message: 'Citywide maintenance drive scheduled this weekend.',
                        read: true,
                        createdAt: new Date(now - 2 * 24 * 3600 * 1000)
                    },
                    {
                        user: worker._id,
                        type: 'task_reassigned',
                        title: 'Task Reassigned',
                        message: 'Drainage Cleaning - Central Park has been reassigned to you.',
                        issue: i6 ? i6._id : null,
                        read: true,
                        createdAt: new Date(now - 2 * 24 * 3600 * 1000)
                    },
                    {
                        user: worker._id,
                        type: 'urgent_task',
                        title: 'Urgent Task Assigned',
                        message: 'Street Light Outage - Main Road requires immediate attention.',
                        issue: i7 ? i7._id : null,
                        read: true,
                        createdAt: new Date(now - 3 * 24 * 3600 * 1000)
                    }
                ]);
                console.log(`Seeded reference notifications for worker ${worker.email}`);
            }
        }

        // 11. Seed Announcements
        if (await Announcement.countDocuments() === 0) {
            await Announcement.create([
                {
                    title: 'Community Clean-Up Drive',
                    content: 'Join us this weekend for a cleaner, greener city. Together we can make a difference!',
                    category: 'Community',
                    date: new Date(),
                    createdBy: admin._id,
                    active: true
                },
                {
                    title: 'Monsoon Infrastructure Readiness Drive',
                    content: 'Municipal crews are inspecting drainage channels across all central wards.',
                    category: 'Infrastructure',
                    date: new Date(Date.now() - 3 * 24 * 3600 * 1000),
                    createdBy: admin._id,
                    active: true
                }
            ]);
        }
        // 12. Seed FAQs
        const FAQ = require('./models/FAQ');
        if (await FAQ.countDocuments() === 0) {
            await FAQ.create([
                {
                    question: 'How do I report a new issue?',
                    answer: 'Click on "Report Issue" in the left navigation menu. Follow the step-by-step wizard to select a category, describe the problem, specify the location on the map, attach evidence photos, and submit.',
                    category: 'Reporting',
                    order: 1,
                    isPublished: true
                },
                {
                    question: 'How can I track the status of my reported issue?',
                    answer: 'Navigate to "My Issues" or open "Notifications" to monitor the real-time progress. Each issue displays a stage milestone timeline (Reported → Under Review → In Progress → Resolved → Closed).',
                    category: 'Tracking',
                    order: 2,
                    isPublished: true
                },
                {
                    question: 'What types of issues can I report?',
                    answer: 'You can report Potholes, Garbage overflow, Streetlight failures, Water leakage, Illegal parking, Drainage issues, Broken footpaths, Noise pollution, Sewage problems, and Public safety concerns.',
                    category: 'Reporting',
                    order: 3,
                    isPublished: true
                },
                {
                    question: 'How long does it take to resolve an issue?',
                    answer: 'Resolution times depend on the issue severity and department SLA. Emergency and high-priority safety hazards are addressed within 24-48 hours, while standard infrastructure repairs follow planned municipal schedules.',
                    category: 'Tracking',
                    order: 4,
                    isPublished: true
                },
                {
                    question: 'Can I add photos to my issue report?',
                    answer: 'Yes! You can attach up to 5 photos during the issue reporting wizard. Adding clear photos helps municipal workers verify the location and severity much faster.',
                    category: 'Reporting',
                    order: 5,
                    isPublished: true
                },
                {
                    question: 'How do I receive updates about my issue?',
                    answer: 'You will receive real-time notifications whenever a worker is assigned, work begins, comments are added, or status changes. You can customize alert settings under Settings → Notification Preferences.',
                    category: 'Notifications',
                    order: 6,
                    isPublished: true
                },
                {
                    question: 'Is my personal information kept private?',
                    answer: 'Yes. Your contact details (phone number, email, address) are kept strictly confidential and only visible to authorized municipal dispatchers and administrators.',
                    category: 'Privacy',
                    order: 7,
                    isPublished: true
                },
                {
                    question: 'Who can see the issues I report?',
                    answer: 'Public issue details (title, category, location, status) appear on the community map to help prevent duplicate reports. Your personal identity remains protected.',
                    category: 'Privacy',
                    order: 8,
                    isPublished: true
                }
            ]);
            console.log("Seeded FAQs.");
        }

        // 13. Run Model Training Pipeline

        try {
            console.log("Triggering initial ML model training on seeded data...");
            const trainResult = await trainModel();
            console.log("Seed ML Training Result:", trainResult?.status || 'Done');
        } catch (mErr) {
            console.warn("ML Training notice:", mErr.message);
        }

        console.log("Demonstration database seeding complete!");
    } catch (err) {
        console.error("Error seeding database:", err);
    }
}

module.exports = seedDatabase;
