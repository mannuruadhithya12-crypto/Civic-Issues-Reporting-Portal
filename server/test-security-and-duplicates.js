// server/test-security-and-duplicates.js
'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Issue = require('./models/Issue');
const { auth, admin } = require('./middleware/auth');
const duplicateEngine = require('./services/duplicateMatchingEngine');
const duplicateService = require('./services/duplicateService');
const issueController = require('./controllers/issueController');

let mongoServer;

// Helper to create mock HTTP req/res
function createMockHttp({ headers = {}, query = {}, body = {}, params = {}, user = null } = {}) {
    const req = {
        header: (name) => headers[name.toLowerCase()] || headers[name] || null,
        headers,
        query,
        body,
        params,
        user,
        isDemo: false
    };

    let responseCode = 200;
    let responseBody = null;

    const res = {
        status: (code) => {
            responseCode = code;
            return res;
        },
        json: (data) => {
            responseBody = data;
            return res;
        },
        send: (data) => {
            responseBody = data;
            return res;
        },
        setHeader: () => res
    };

    return {
        req,
        res,
        getStatus: () => responseCode,
        getBody: () => responseBody
    };
}

async function runTestSuite() {
    console.log("======================================================================");
    console.log("  CIVICCONNECT: SECURITY & HYBRID DUPLICATE DETECTION TEST SUITE      ");
    console.log("======================================================================\n");

    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log("✓ Connected to isolated In-Memory MongoDB:", uri);

    const JWT_SECRET = process.env.JWT_SECRET || 'testsecret123';
    process.env.JWT_SECRET = JWT_SECRET;

    // 1. Create Test Users: Admin, Worker, Citizen, Inactive Citizen
    const hashedPw = await bcrypt.hash('password123', 8);

    const adminUser = await User.create({
        name: 'Test Admin',
        email: 'admin.sec@civic.test',
        password: hashedPw,
        role: 'admin',
        status: 'active'
    });

    const workerUser = await User.create({
        name: 'Test Worker',
        email: 'worker.sec@civic.test',
        password: hashedPw,
        role: 'worker',
        status: 'active',
        department: 'Roads'
    });

    const citizenUser = await User.create({
        name: 'Test Citizen',
        email: 'citizen.sec@civic.test',
        password: hashedPw,
        role: 'citizen',
        status: 'active'
    });

    const suspendedCitizen = await User.create({
        name: 'Suspended Citizen',
        email: 'suspended.sec@civic.test',
        password: hashedPw,
        role: 'citizen',
        status: 'suspended'
    });

    const adminToken = jwt.sign({ id: adminUser._id, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
    const workerToken = jwt.sign({ id: workerUser._id, role: 'worker' }, JWT_SECRET, { expiresIn: '1h' });
    const citizenToken = jwt.sign({ id: citizenUser._id, role: 'citizen' }, JWT_SECRET, { expiresIn: '1h' });
    const suspendedToken = jwt.sign({ id: suspendedCitizen._id, role: 'citizen' }, JWT_SECRET, { expiresIn: '1h' });
    const forgedToken = jwt.sign({ id: new mongoose.Types.ObjectId(), role: 'admin' }, 'wrongsecret', { expiresIn: '1h' });
    const deletedUserToken = jwt.sign({ id: new mongoose.Types.ObjectId(), role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

    console.log("✓ Created isolated test users & tokens.\n");

    let passedTests = 0;
    let failedTests = 0;

    function assert(description, condition) {
        if (condition) {
            console.log(`  ✓ PASS: ${description}`);
            passedTests++;
        } else {
            console.error(`  ✗ FAIL: ${description}`);
            failedTests++;
        }
    }

    // -------------------------------------------------------------------------
    // SECTION A: SECURITY & AUTHORIZATION TESTS
    // -------------------------------------------------------------------------
    console.log("--- SECTION A: Authorization & Role-Based Access Control ---");

    // Test A1: Unauthenticated request to auth middleware
    {
        const { req, res, getStatus } = createMockHttp();
        let nextCalled = false;
        await auth(req, res, () => { nextCalled = true; });
        assert("Unauthenticated request receives 401", getStatus() === 401 && !nextCalled);
    }

    // Test A2: Forged / Invalid signature token receives 401
    {
        const { req, res, getStatus } = createMockHttp({ headers: { authorization: `Bearer ${forgedToken}` } });
        let nextCalled = false;
        await auth(req, res, () => { nextCalled = true; });
        assert("Forged signature token receives 401", getStatus() === 401 && !nextCalled);
    }

    // Test A3: Token for non-existent / deleted user receives 401 (no arbitrary admin fallback)
    {
        const { req, res, getStatus, getBody } = createMockHttp({ headers: { authorization: `Bearer ${deletedUserToken}` } });
        let nextCalled = false;
        await auth(req, res, () => { nextCalled = true; });
        assert("Token for deleted user receives 401", getStatus() === 401 && !nextCalled);
    }

    // Test A4: Suspended user token receives 403
    {
        const { req, res, getStatus } = createMockHttp({ headers: { authorization: `Bearer ${suspendedToken}` } });
        let nextCalled = false;
        await auth(req, res, () => { nextCalled = true; });
        assert("Suspended user account receives 403", getStatus() === 403 && !nextCalled);
    }

    // Test A5: Demo mode header without valid token must NOT grant admin access
    {
        const { req, res, getStatus } = createMockHttp({ headers: { 'x-demo-mode': 'demo' } });
        let nextCalled = false;
        await auth(req, res, () => { nextCalled = true; });
        assert("x-demo-mode header without credentials receives 401 (demo auth bypass closed)", getStatus() === 401 && !nextCalled);
    }

    // Test A6: Citizen token passes auth but receives 403 on admin middleware
    {
        const { req, res, getStatus } = createMockHttp({ headers: { authorization: `Bearer ${citizenToken}` } });
        let authNext = false;
        let adminNext = false;
        await auth(req, res, () => { authNext = true; });
        admin(req, res, () => { adminNext = true; });
        assert("Citizen user is rejected by admin middleware with 403", authNext && getStatus() === 403 && !adminNext);
    }

    // Test A7: Worker token passes auth but receives 403 on admin middleware
    {
        const { req, res, getStatus } = createMockHttp({ headers: { authorization: `Bearer ${workerToken}` } });
        let authNext = false;
        let adminNext = false;
        await auth(req, res, () => { authNext = true; });
        admin(req, res, () => { adminNext = true; });
        assert("Worker user is rejected by admin middleware with 403", authNext && getStatus() === 403 && !adminNext);
    }

    // Test A8: Admin token passes auth and passes admin middleware
    {
        const { req, res, getStatus } = createMockHttp({ headers: { authorization: `Bearer ${adminToken}` } });
        let authNext = false;
        let adminNext = false;
        await auth(req, res, () => { authNext = true; });
        admin(req, res, () => { adminNext = true; });
        assert("Admin user is successfully authorized through admin middleware", authNext && adminNext && getStatus() === 200);
    }

    // -------------------------------------------------------------------------
    // SECTION B: 12 BENCHMARK SCENARIOS FOR DUPLICATE DETECTION
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION B: 12 Benchmark Scenarios for Duplicate Detection ---");

    // Reference anchor point: MG Road Junction, Bangalore (Lat: 12.9716, Lon: 77.5946)
    const baseLat = 12.9716;
    const baseLon = 77.5946;

    // Create an anchor active issue in MongoDB
    const activeIssue = await Issue.create({
        title: "Hazardous Deep Pothole on MG Road Junction",
        description: "Large deep pothole on MG Road near Metro exit creating traffic congestion and risk for commuters.",
        department: "Roads",
        location: "MG Road Junction, Ward 112",
        locationName: "MG Road, Central Sector",
        coordinates: {
            type: "Point",
            coordinates: [baseLon, baseLat] // GeoJSON [lon, lat]
        },
        status: "in_progress",
        priority: "high",
        createdBy: citizenUser._id
    });

    // Create a resolved issue (resolved 5 days ago)
    const resolvedIssue = await Issue.create({
        title: "Overflowing Garbage Container",
        description: "Community waste bin overflowing near the primary school entrance.",
        department: "Waste",
        location: "MG Road 2nd Cross",
        locationName: "MG Road, Central Sector",
        coordinates: {
            type: "Point",
            coordinates: [baseLon + 0.0004, baseLat + 0.0004] // ~60m away
        },
        status: "resolved",
        priority: "normal",
        resolvedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
        createdBy: citizenUser._id
    });

    // Create an old closed issue (closed 60 days ago)
    const oldClosedIssue = await Issue.create({
        title: "Broken Footpath Slabs",
        description: "Cracked and missing paving stones on sidewalk.",
        department: "Roads",
        location: "MG Road Footpath",
        coordinates: {
            type: "Point",
            coordinates: [baseLon + 0.0002, baseLat + 0.0002] // ~30m away
        },
        status: "closed",
        priority: "low",
        closedAt: new Date(Date.now() - 60 * 24 * 3600 * 1000),
        createdBy: citizenUser._id
    });

    // Create a rejected complaint
    const rejectedIssue = await Issue.create({
        title: "Duplicate / Ineligible Noise Complaint",
        description: "False report rejected by municipal operators.",
        department: "Public Safety",
        location: "MG Road Junction",
        coordinates: {
            type: "Point",
            coordinates: [baseLon, baseLat]
        },
        status: "rejected",
        priority: "low",
        createdBy: citizenUser._id
    });

    // Benchmark Case 1: Identical title, description, and location
    {
        const result = await duplicateService.findDuplicates({
            latitude: baseLat,
            longitude: baseLon,
            title: "Hazardous Deep Pothole on MG Road Junction",
            description: "Large deep pothole on MG Road near Metro exit creating traffic congestion and risk for commuters.",
            department: "Roads",
            radiusMeters: 300
        });

        const top = result.candidates[0];
        assert("Case 1: Identical complaint detected with high similarity (score >= 0.90)",
            result.hasDuplicates && top && top.similarityScore >= 0.90 && top.issueId.toString() === activeIssue._id.toString()
        );
    }

    // Benchmark Case 2: Same complaint with different wording at nearby location (30m away)
    {
        // 0.0002 deg lat difference is ~22 meters
        const result = await duplicateService.findDuplicates({
            latitude: baseLat + 0.0002,
            longitude: baseLon + 0.0001,
            title: "Severe road crater near metro station",
            description: "Big dangerous pothole on MG road damaging vehicle suspensions right by station entrance.",
            category: "Potholes",
            department: "Roads",
            radiusMeters: 300
        });

        const potholeMatch = result.candidates.find(c => c.issueId.toString() === activeIssue._id.toString());
        if (potholeMatch) {
            console.log(`    [Diag Case 2] distance=${potholeMatch.distanceMeters}m score=${potholeMatch.similarityScore} factors=`, potholeMatch.matchFactors);
        } else {
            console.log(`    [Diag Case 2] No candidate match found in results! candidates count = ${result.candidates.length}`);
        }
        assert("Case 2: Same complaint with different wording nearby is flagged as potential duplicate (score >= 0.60)",
            potholeMatch && potholeMatch.similarityScore >= 0.60 && potholeMatch.distanceMeters < 50
        );
    }

    // Benchmark Case 3: Same location but clearly different complaint (e.g. Streetlight dark vs Pothole)
    {
        const result = await duplicateService.findDuplicates({
            latitude: baseLat,
            longitude: baseLon,
            title: "Broken streetlight fixture completely dark at night",
            description: "The overhead lamp pole on junction corner is not functioning after dark.",
            department: "Electricity",
            category: "Streetlight failures",
            radiusMeters: 300
        });

        const potholeMatch = result.candidates.find(c => c.issueId.toString() === activeIssue._id.toString());
        assert("Case 3: Same location but different complaint type is NOT flagged as duplicate (score < 0.40)",
            !potholeMatch || potholeMatch.similarityScore < 0.40
        );
    }

    // Benchmark Case 4: Identical wording at distant location (5 km away)
    {
        // 0.045 degrees is ~5 kilometers
        const result = await duplicateService.findDuplicates({
            latitude: baseLat + 0.045,
            longitude: baseLon + 0.045,
            title: "Hazardous Deep Pothole on MG Road Junction",
            description: "Large deep pothole on MG Road near Metro exit creating traffic congestion and risk for commuters.",
            department: "Roads",
            radiusMeters: 300
        });

        assert("Case 4: Identical wording at distant location (5km away) returns 0 candidates within radius",
            result.count === 0 && !result.hasDuplicates
        );
    }

    // Benchmark Case 5: Compatible department and complaint-type combinations (Roads vs Potholes)
    {
        const compScore = duplicateEngine.computeCategoryCompatibility("Roads", "Potholes");
        assert("Case 5: Category compatibility correctly matches 'Roads' with 'Potholes' (score >= 0.85)",
            compScore >= 0.85
        );
    }

    // Benchmark Case 6: Incompatible complaint types (Streetlight failures vs Sewage problems)
    {
        const compScore = duplicateEngine.computeCategoryCompatibility("Streetlight failures", "Sewage problems");
        assert("Case 6: Incompatible complaint types yield 0.0 compatibility score",
            compScore === 0.0
        );
    }

    // Benchmark Case 7: Missing coordinates validation
    {
        const { req, res, getStatus, getBody } = createMockHttp({
            body: {
                title: "Test with missing coordinates",
                description: "No lat/lng provided"
            }
        });

        await issueController.checkDuplicates(req, res);
        assert("Case 7: Missing coordinates returns HTTP 400 Bad Request",
            getStatus() === 400 && getBody().success === false
        );
    }

    // Benchmark Case 8: Invalid latitude/longitude/radius
    {
        const { req, res, getStatus } = createMockHttp({
            body: {
                latitude: 195.0, // Invalid latitude (> 90)
                longitude: 77.5946,
                title: "Invalid latitude test"
            }
        });

        await issueController.checkDuplicates(req, res);
        assert("Case 8: Invalid coordinate boundary (> 90 lat) returns HTTP 400",
            getStatus() === 400
        );
    }

    // Benchmark Case 9: Resolved and rejected reports eligibility rules
    {
        const result = await duplicateService.findDuplicates({
            latitude: baseLat,
            longitude: baseLon,
            title: "Noise complaint",
            description: "Noise check",
            radiusMeters: 300
        });

        const rejectedMatch = result.candidates.find(c => c.issueId.toString() === rejectedIssue._id.toString());
        assert("Case 9a: Rejected reports are strictly excluded from candidates query",
            !rejectedMatch
        );

        // Check temporal score on 60-day old closed issue
        const oldScore = duplicateEngine.computeTemporalRelevance({
            status: "closed",
            closedAt: new Date(Date.now() - 60 * 24 * 3600 * 1000)
        });
        assert("Case 9b: Long-resolved reports receive low temporal relevance (score <= 0.3)",
            oldScore <= 0.3
        );
    }

    // Benchmark Case 10: No candidates in radius
    {
        const result = await duplicateService.findDuplicates({
            latitude: 25.5941, // Patna coordinates (far from Bangalore)
            longitude: 85.1376,
            title: "Road issue",
            description: "No local tickets exist here",
            radiusMeters: 300
        });

        assert("Case 10: Empty candidate region returns success with count 0 and hasDuplicates false",
            result.success === true && result.count === 0 && result.hasDuplicates === false && result.candidates.length === 0
        );
    }

    // Benchmark Case 11: Candidate exclusion (checking an existing issue against itself)
    {
        const result = await duplicateService.findDuplicates({
            latitude: baseLat,
            longitude: baseLon,
            title: activeIssue.title,
            description: activeIssue.description,
            department: activeIssue.department,
            radiusMeters: 300,
            excludeIssueId: activeIssue._id.toString()
        });

        const selfMatch = result.candidates.find(c => c.issueId.toString() === activeIssue._id.toString());
        assert("Case 11: Providing excludeIssueId excludes current issue from candidate list",
            !selfMatch
        );
    }

    // Benchmark Case 12: API checkDuplicates Controller Integration (Complete contract verification)
    {
        const { req, res, getStatus, getBody } = createMockHttp({
            body: {
                latitude: baseLat + 0.0001,
                longitude: baseLon + 0.0001,
                title: "Deep pothole damage",
                description: "Severe pothole right by metro station",
                department: "Roads",
                radius: 300
            }
        });

        await issueController.checkDuplicates(req, res);
        const data = getBody();

        assert("Case 12: POST /api/issues/check-duplicates returns full structured contract",
            getStatus() === 200 &&
            data.success === true &&
            typeof data.hasDuplicates === 'boolean' &&
            typeof data.count === 'number' &&
            Array.isArray(data.candidates) &&
            data.candidates.length > 0 &&
            data.candidates[0].coordinates &&
            typeof data.candidates[0].coordinates.latitude === 'number' &&
            typeof data.candidates[0].similarityScore === 'number' &&
            data.candidates[0].matchFactors &&
            Array.isArray(data.candidates[0].reasons)
        );
    }

    console.log("\n======================================================================");
    console.log(`  RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log("======================================================================");

    await mongoose.disconnect();
    await mongoServer.stop();

    if (failedTests > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTestSuite().catch(err => {
    console.error("Test execution fatal error:", err);
    if (mongoServer) mongoServer.stop();
    process.exit(1);
});
