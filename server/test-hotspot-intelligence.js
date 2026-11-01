// server/test-hotspot-intelligence.js
'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Issue = require('./models/Issue');
const { auth, admin } = require('./middleware/auth');
const hotspotService = require('./services/hotspotService');
const clusteringService = require('./services/clusteringService');
const intelligenceController = require('./controllers/intelligenceController');

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
  console.log("  CIVICCONNECT: PHASE 3 GEOSPATIAL HOTSPOT INTELLIGENCE TEST SUITE    ");
  console.log("======================================================================\n");

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  console.log("✓ Connected to isolated In-Memory MongoDB:", uri);

  // Setup Users for Auth & RBAC
  const adminUser = await User.create({
    name: 'Admin Test',
    email: 'admin_hotspot@civicconnect.test',
    password: 'Password123!',
    role: 'admin',
    status: 'active'
  });

  const citizenUser = await User.create({
    name: 'Citizen Test',
    email: 'citizen_hotspot@civicconnect.test',
    password: 'Password123!',
    role: 'citizen',
    status: 'active'
  });

  const workerUser = await User.create({
    name: 'Worker Test',
    email: 'worker_hotspot@civicconnect.test',
    password: 'Password123!',
    role: 'worker',
    department: 'Roads',
    status: 'active'
  });

  const jwtSecret = process.env.JWT_SECRET || 'secret';
  const adminToken = jwt.sign({ id: adminUser._id, role: 'admin' }, jwtSecret);
  const citizenToken = jwt.sign({ id: citizenUser._id, role: 'citizen' }, jwtSecret);
  const workerToken = jwt.sign({ id: workerUser._id, role: 'worker' }, jwtSecret);

  console.log("✓ Test users & tokens initialized.\n");

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passedCount++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failedCount++;
    }
  }

  // Helper to clear and seed issues
  async function resetIssues(issueDocs) {
    await Issue.deleteMany({});
    if (issueDocs && issueDocs.length > 0) {
      const docsWithCreator = issueDocs.map(doc => ({
        createdBy: adminUser._id,
        location: doc.location || 'Municipal Zone',
        description: doc.description || 'Test issue description for hotspot analysis',
        status: doc.status || 'reported',
        department: doc.department || 'Roads',
        priority: doc.priority || 'normal',
        createdAt: doc.createdAt || new Date(),
        ...doc
      }));
      await Issue.insertMany(docsWithCreator);
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Three or more nearby points forming a qualifying cluster
    // -------------------------------------------------------------------------
    console.log("--- Test 1: Three or more nearby points form a qualifying cluster ---");
    // MG Road Bangalore coordinates (~30m apart)
    await resetIssues([
      { title: 'Pothole 1', coordinates: { type: 'Point', coordinates: [77.6050, 12.9750] } },
      { title: 'Pothole 2', coordinates: { type: 'Point', coordinates: [77.6052, 12.9751] } },
      { title: 'Pothole 3', coordinates: { type: 'Point', coordinates: [77.6051, 12.9749] } }
    ]);

    const res1 = await hotspotService.findHotspots({ radiusMeters: 200, minPoints: 3 });
    assert(res1.success === true, "Query succeeds with success flag");
    assert(res1.summary.totalHotspots === 1, "Exactly 1 cluster detected");
    assert(res1.hotspots[0].issueCount === 3, "Cluster contains all 3 qualifying points");
    assert(res1.summary.noisePointsCount === 0, "Zero noise points");

    // -------------------------------------------------------------------------
    // TEST 2: Points outside the cluster radius are excluded
    // -------------------------------------------------------------------------
    console.log("\n--- Test 2: Points outside the cluster radius are excluded ---");
    // 4th point is 600m away (12.9800, 77.6100)
    await resetIssues([
      { title: 'Pothole 1', coordinates: { type: 'Point', coordinates: [77.6050, 12.9750] } },
      { title: 'Pothole 2', coordinates: { type: 'Point', coordinates: [77.6052, 12.9751] } },
      { title: 'Pothole 3', coordinates: { type: 'Point', coordinates: [77.6051, 12.9749] } },
      { title: 'Distant Issue', coordinates: { type: 'Point', coordinates: [77.6100, 12.9800] } }
    ]);

    const res2 = await hotspotService.findHotspots({ radiusMeters: 200, minPoints: 3 });
    assert(res2.summary.totalHotspots === 1, "Still exactly 1 hotspot");
    assert(res2.hotspots[0].issueCount === 3, "Hotspot excludes distant 4th point (count remains 3)");
    assert(res2.summary.noisePointsCount === 1, "Distant 4th point correctly identified as noise");

    // -------------------------------------------------------------------------
    // TEST 3: Noise points below minPoints do not form clusters
    // -------------------------------------------------------------------------
    console.log("\n--- Test 3: Noise points below minPoints are classified as noise ---");
    // Only 2 points present when minPoints is 3
    await resetIssues([
      { title: 'Isolated 1', coordinates: { type: 'Point', coordinates: [77.6200, 12.9350] } },
      { title: 'Isolated 2', coordinates: { type: 'Point', coordinates: [77.6202, 12.9351] } }
    ]);

    const res3 = await hotspotService.findHotspots({ radiusMeters: 200, minPoints: 3 });
    assert(res3.summary.totalHotspots === 0, "No cluster formed when points < minPoints");
    assert(res3.summary.noisePointsCount === 2, "Both points classified as noise");
    assert(res3.hotspots.length === 0, "Hotspots array is empty");

    // -------------------------------------------------------------------------
    // TEST 4: Multiple geographically separate hotspots detected simultaneously
    // -------------------------------------------------------------------------
    console.log("\n--- Test 4: Multiple geographically separate hotspots ---");
    // Cluster A in Indiranagar (3 issues) + Cluster B in Koramangala (3 issues, ~5km away)
    await resetIssues([
      // Cluster A: Indiranagar (~12.9780, 77.6400)
      { title: 'Indiranagar 1', department: 'Roads', coordinates: { type: 'Point', coordinates: [77.6400, 12.9780] } },
      { title: 'Indiranagar 2', department: 'Roads', coordinates: { type: 'Point', coordinates: [77.6402, 12.9781] } },
      { title: 'Indiranagar 3', department: 'Roads', coordinates: { type: 'Point', coordinates: [77.6401, 12.9779] } },
      // Cluster B: Koramangala (~12.9350, 77.6200)
      { title: 'Koramangala 1', department: 'Waste', coordinates: { type: 'Point', coordinates: [77.6200, 12.9350] } },
      { title: 'Koramangala 2', department: 'Waste', coordinates: { type: 'Point', coordinates: [77.6203, 12.9352] } },
      { title: 'Koramangala 3', department: 'Waste', coordinates: { type: 'Point', coordinates: [77.6201, 12.9348] } }
    ]);

    const res4 = await hotspotService.findHotspots({ radiusMeters: 200, minPoints: 3 });
    assert(res4.summary.totalHotspots === 2, "Exactly 2 separate hotspots detected");
    assert(res4.hotspots.some(h => h.dominantDepartment === 'Roads'), "Contains Roads hotspot");
    assert(res4.hotspots.some(h => h.dominantDepartment === 'Waste'), "Contains Waste hotspot");
    assert(res4.summary.totalIssuesInHotspots === 6, "All 6 points allocated across the 2 hotspots");

    // -------------------------------------------------------------------------
    // TEST 5: Invalid and missing coordinates handled without crashing
    // -------------------------------------------------------------------------
    console.log("\n--- Test 5: Invalid and missing coordinates handled gracefully ---");
    await resetIssues([
      // 3 valid cluster points
      { title: 'Valid 1', coordinates: { type: 'Point', coordinates: [77.6050, 12.9750] } },
      { title: 'Valid 2', coordinates: { type: 'Point', coordinates: [77.6052, 12.9751] } },
      { title: 'Valid 3', coordinates: { type: 'Point', coordinates: [77.6051, 12.9749] } },
      // Documents with missing or null coordinates
      { title: 'No Coords 1', location: 'Station Road' },
      { title: 'No Coords 2', location: 'Market Street' }
    ]);

    // Also insert raw document with null coordinates directly into collection
    await mongoose.connection.db.collection('issues').insertOne({
      title: 'Null Coords',
      description: 'Null coords test',
      location: 'Area',
      createdBy: adminUser._id,
      coordinates: null
    });

    const res5 = await hotspotService.findHotspots({ radiusMeters: 200, minPoints: 3 });
    assert(res5.summary.totalHotspots === 1, "Detects cluster without crashing on corrupt coords");
    assert(res5.summary.totalPointsAnalyzed === 3, "Only the 3 valid coordinates were analyzed");

    // -------------------------------------------------------------------------
    // TEST 6: Correct center, radius in meters, and bounding geometry
    // -------------------------------------------------------------------------
    console.log("\n--- Test 6: Correct center, radius, and bounding geometry ---");
    const h6 = res1.hotspots[0];
    assert(typeof h6.center.latitude === 'number' && typeof h6.center.longitude === 'number', "Center has numeric lat and lng");
    assert(h6.center.latitude >= h6.boundingBox.minLatitude && h6.center.latitude <= h6.boundingBox.maxLatitude, "Center lat is within bounding box");
    assert(h6.center.longitude >= h6.boundingBox.minLongitude && h6.center.longitude <= h6.boundingBox.maxLongitude, "Center lng is within bounding box");
    assert(h6.radiusMeters >= 20, "Radius in meters is calculated and >= 20m minimum floor");
    assert(h6.boundingPolygon.type === 'Polygon', "Bounding polygon is GeoJSON Polygon");
    assert(h6.boundingPolygon.coordinates[0].length === 17, "Bounding polygon has 16 segments (17 closed points)");
    const firstPt = h6.boundingPolygon.coordinates[0][0];
    const lastPt = h6.boundingPolygon.coordinates[0][16];
    assert(firstPt[0] === lastPt[0] && firstPt[1] === lastPt[1], "Bounding polygon ring is closed (first === last)");

    // -------------------------------------------------------------------------
    // TEST 7: Correct GeoJSON-to-Leaflet coordinate order
    // -------------------------------------------------------------------------
    console.log("\n--- Test 7: Correct GeoJSON-to-Leaflet coordinate order ---");
    // GeoJSON is [longitude, latitude], Leaflet is [latitude, longitude]
    assert(h6.coordinates[0] === h6.center.longitude && h6.coordinates[1] === h6.center.latitude, "h6.coordinates is [longitude, latitude] (GeoJSON)");
    assert(h6.centerCoordinates[0] === h6.center.latitude && h6.centerCoordinates[1] === h6.center.longitude, "h6.centerCoordinates is [latitude, longitude] (Leaflet)");

    // -------------------------------------------------------------------------
    // TEST 8: Date filtering and status filtering
    // -------------------------------------------------------------------------
    console.log("\n--- Test 8: Date filtering and status filtering ---");
    const now = Date.now();
    await resetIssues([
      // Old issues (40 days ago)
      { title: 'Old 1', status: 'reported', createdAt: new Date(now - 40 * 86400000), coordinates: { type: 'Point', coordinates: [77.6050, 12.9750] } },
      { title: 'Old 2', status: 'reported', createdAt: new Date(now - 40 * 86400000), coordinates: { type: 'Point', coordinates: [77.6052, 12.9751] } },
      { title: 'Old 3', status: 'reported', createdAt: new Date(now - 40 * 86400000), coordinates: { type: 'Point', coordinates: [77.6051, 12.9749] } },
      // Recent issues (2 days ago)
      { title: 'Recent 1', status: 'in_progress', createdAt: new Date(now - 2 * 86400000), coordinates: { type: 'Point', coordinates: [77.6050, 12.9750] } },
      { title: 'Recent 2', status: 'in_progress', createdAt: new Date(now - 2 * 86400000), coordinates: { type: 'Point', coordinates: [77.6052, 12.9751] } },
      { title: 'Recent 3', status: 'in_progress', createdAt: new Date(now - 2 * 86400000), coordinates: { type: 'Point', coordinates: [77.6051, 12.9749] } }
    ]);

    // Query with from filter (last 7 days)
    const res8Date = await hotspotService.findHotspots({
      radiusMeters: 200,
      minPoints: 3,
      from: new Date(now - 7 * 86400000)
    });
    assert(res8Date.summary.totalHotspots === 1, "Date filter returns recent cluster");
    assert(res8Date.hotspots[0].issueCount === 3, "Only recent 3 issues are included");

    // Query with status filter ('reported')
    const res8Status = await hotspotService.findHotspots({
      radiusMeters: 200,
      minPoints: 3,
      status: 'reported'
    });
    assert(res8Status.hotspots[0].issueCount === 3, "Status filter matches exactly 3 'reported' issues");
    assert(res8Status.hotspots[0].statusBreakdown.reported === 3, "All matched issues have status 'reported'");

    // -------------------------------------------------------------------------
    // TEST 9: Empty database results handled cleanly
    // -------------------------------------------------------------------------
    console.log("\n--- Test 9: Empty database returns success: true, count: 0 ---");
    await resetIssues([]);

    const res9 = await hotspotService.findHotspots({ radiusMeters: 200, minPoints: 3 });
    assert(res9.success === true, "Response returns success: true");
    assert(res9.summary.totalHotspots === 0, "totalHotspots is 0");
    assert(res9.hotspots.length === 0, "hotspots is empty array");

    // -------------------------------------------------------------------------
    // TEST 10: Database failures handled cleanly
    // -------------------------------------------------------------------------
    console.log("\n--- Test 10: Database failures handled with HTTP 500 error ---");
    // Temporarily stub Issue.find to reject
    const originalFind = Issue.find;
    Issue.find = () => ({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            select: () => ({
              lean: () => Promise.reject(new Error("Simulated Database I/O Failure"))
            })
          })
        })
      })
    });

    const http10 = createMockHttp({ query: {} });
    await intelligenceController.getHotspots(http10.req, http10.res);
    assert(http10.getStatus() === 500, "Database failure returns HTTP 500");
    assert(http10.getBody().success === false, "Returns success: false");

    Issue.find = originalFind; // restore

    // -------------------------------------------------------------------------
    // TEST 11: Parameter validation and query limits
    // -------------------------------------------------------------------------
    console.log("\n--- Test 11: Parameter validation rejects invalid filters ---");
    const http11a = createMockHttp({ query: { radiusMeters: -100 } });
    await intelligenceController.getHotspots(http11a.req, http11a.res);
    assert(http11a.getStatus() === 400, "Negative radius returns HTTP 400");

    const http11b = createMockHttp({ query: { minPoints: 0 } });
    await intelligenceController.getHotspots(http11b.req, http11b.res);
    assert(http11b.getStatus() === 400, "minPoints < 2 returns HTTP 400");

    const http11c = createMockHttp({ query: { from: 'not-a-valid-date' } });
    await intelligenceController.getHotspots(http11c.req, http11c.res);
    assert(http11c.getStatus() === 400, "Malformed date returns HTTP 400");

    const http11d = createMockHttp({ query: { department: 'FakeNonexistentDept' } });
    await intelligenceController.getHotspots(http11d.req, http11d.res);
    assert(http11d.getStatus() === 400, "Invalid department enum returns HTTP 400");

    const http11e = createMockHttp({ query: { limit: 100000 } });
    await intelligenceController.getHotspots(http11e.req, http11e.res);
    assert(http11e.getStatus() === 400, "Excessive query limit returns HTTP 400");

    // -------------------------------------------------------------------------
    // TEST 12: Unauthorized, citizen, and worker access rejected
    // -------------------------------------------------------------------------
    console.log("\n--- Test 12: Unauthorized, citizen, and worker access rejected ---");
    // No auth token
    const http12NoToken = createMockHttp();
    await auth(http12NoToken.req, http12NoToken.res, () => {});
    assert(http12NoToken.getStatus() === 401, "No token receives HTTP 401");

    // Citizen token through auth + admin middleware
    const http12Citizen = createMockHttp({ headers: { authorization: `Bearer ${citizenToken}` } });
    await auth(http12Citizen.req, http12Citizen.res, async () => {
      await admin(http12Citizen.req, http12Citizen.res, () => {});
    });
    assert(http12Citizen.getStatus() === 403, "Citizen receives HTTP 403 Forbidden");

    // Worker token through auth + admin middleware
    const http12Worker = createMockHttp({ headers: { authorization: `Bearer ${workerToken}` } });
    await auth(http12Worker.req, http12Worker.res, async () => {
      await admin(http12Worker.req, http12Worker.res, () => {});
    });
    assert(http12Worker.getStatus() === 403, "Worker receives HTTP 403 Forbidden");

    // -------------------------------------------------------------------------
    // TEST 13: Administrator access succeeds with structured payload
    // -------------------------------------------------------------------------
    console.log("\n--- Test 13: Administrator access succeeds with structured payload ---");
    // Repopulate a valid cluster
    await resetIssues([
      { title: 'Admin Test 1', priority: 'urgent', status: 'reported', coordinates: { type: 'Point', coordinates: [77.6050, 12.9750] } },
      { title: 'Admin Test 2', priority: 'high', status: 'reported', coordinates: { type: 'Point', coordinates: [77.6052, 12.9751] } },
      { title: 'Admin Test 3', priority: 'normal', status: 'in_progress', coordinates: { type: 'Point', coordinates: [77.6051, 12.9749] } }
    ]);

    const http13Admin = createMockHttp({
      headers: { authorization: `Bearer ${adminToken}` },
      query: { radiusMeters: 200, minPoints: 3 }
    });

    let adminNextCalled = false;
    await new Promise((resolve, reject) => {
      auth(http13Admin.req, http13Admin.res, () => {
        admin(http13Admin.req, http13Admin.res, async () => {
          try {
            adminNextCalled = true;
            await intelligenceController.getHotspots(http13Admin.req, http13Admin.res);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    assert(adminNextCalled === true, "Admin middleware permits request");
    assert(http13Admin.getStatus() === 200, "Admin endpoint responds with HTTP 200");
    const payload = http13Admin.getBody();
    assert(payload.success === true, "Payload has success: true");
    assert(payload.hotspots.length === 1, "Payload contains detected hotspot");
    assert(payload.summary.totalIssuesInHotspots === 3, "Payload contains correct issue count");

    // -------------------------------------------------------------------------
    // TEST 14: No fabricated results when records have missing/null coordinates
    // -------------------------------------------------------------------------
    console.log("\n--- Test 14: Zero fabricated results for missing coordinates ---");
    await resetIssues([
      { title: 'No Geo 1', location: 'Station Road' },
      { title: 'No Geo 2', location: 'Market Street' },
      { title: 'No Geo 3', location: 'Main Street' }
    ]);

    const res14 = await hotspotService.findHotspots({ radiusMeters: 200, minPoints: 3 });
    assert(res14.summary.totalHotspots === 0, "Zero hotspots when no valid coordinates exist");
    assert(res14.summary.totalPointsAnalyzed === 0, "Zero points analyzed (no hallucinated coordinates)");

    // -------------------------------------------------------------------------
    // TEST 15: Regression test for existing clustering consumers
    // -------------------------------------------------------------------------
    console.log("\n--- Test 15: Regression tests for existing clustering consumers ---");
    await resetIssues([
      { title: 'Regress 1', department: 'Roads', coordinates: { type: 'Point', coordinates: [77.6050, 12.9750] } },
      { title: 'Regress 2', department: 'Roads', coordinates: { type: 'Point', coordinates: [77.6052, 12.9751] } },
      { title: 'Regress 3', department: 'Roads', coordinates: { type: 'Point', coordinates: [77.6051, 12.9749] } }
    ]);

    // Legacy consumer call signature
    const legacyRes = await clusteringService.getHotspots({});
    assert(Array.isArray(legacyRes.hotspots), "Legacy getHotspots returns hotspots array");
    assert(Array.isArray(legacyRes.rawClusters), "Legacy getHotspots returns rawClusters array");
    assert(legacyRes.hotspots.length === 1, "Legacy getHotspots detects 1 hotspot");
    assert(Array.isArray(legacyRes.hotspots[0].center), "hotspot.center is legacy [lat, lon] array");
    assert(typeof legacyRes.hotspots[0].issueCount === 'number', "hotspot.issueCount exists");
    assert(typeof legacyRes.hotspots[0].topCategory === 'string', "hotspot.topCategory exists");

    // Distance helper regression
    const distM = clusteringService.getDistanceFromLatLonInM(12.9750, 77.6050, 12.9750, 77.6050);
    assert(distM === 0, "getDistanceFromLatLonInM works as expected (0m for same point)");

  } catch (err) {
    console.error("Test execution threw error:", err);
    failedCount++;
  } finally {
    await mongoose.disconnect();
    await mongoServer.stop();
  }

  console.log("\n======================================================================");
  console.log(`  RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("======================================================================");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite();
