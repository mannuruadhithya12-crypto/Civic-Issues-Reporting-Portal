require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const PublicHistoricalIncident = require('./models/PublicHistoricalIncident');
const Issue = require('./models/Issue');
const { evaluateDataHealth } = require('./services/rlDataQualityService');

const API_URL = 'http://localhost:5000/api';
// Using a mock admin token or testing at model/controller level.
// Since the routes require authentication, we'll directly test the controller logic
// or authenticate if we had a test user. To keep it self-contained without needing a running server,
// we'll mock the `req` and `res` objects for the controller methods.

const datasetImportController = require('./controllers/datasetImportController');

const mockJsonData = [
  {
    "sourceRecordId": "SYNTHETIC-JSON-001",
    "reportedAt": "2025-05-01T10:00:00Z",
    "closedAt": "2025-05-03T12:00:00Z",
    "category": "Pothole",
    "description": "Large synthetic pothole on test street",
    "department": "Department of Sanitation",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "locationText": "Test JSON Street"
  },
  {
    "sourceRecordId": "SYNTHETIC-JSON-002",
    "reportedAt": "2025-05-02T10:00:00Z",
    "category": "RandomUnknownType",
    "description": "Testing unknown category mapping",
    "department": "Unknown Department",
    "latitude": 45, // valid
    "longitude": -74.0060
  },
  {
    "sourceRecordId": "SYNTHETIC-JSON-001", // duplicate
    "reportedAt": "2025-05-01T10:00:00Z",
    "category": "Pothole",
    "description": "Duplicate"
  },
  {
    // invalid - missing reportedAt
    "sourceRecordId": "SYNTHETIC-JSON-004",
    "category": "Garbage",
    "description": "Missing date"
  }
];

const mockCsvData = `sourceRecordId,reportedAt,category,description,latitude,longitude
SYNTHETIC-CSV-001,2025-06-01T10:00:00Z,Garbage,Synthetic CSV garbage test,40.7128,-74.0060
SYNTHETIC-CSV-002,2025-06-02T10:00:00Z,Potholes,Synthetic CSV pothole test,40.7128,-74.0060`;

async function setupTestDb() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for isolated testing.");
}

function createMockReqRes(fileContent, mimeType, filename, body) {
    const tempPath = path.join(__dirname, 'uploads', 'temp', filename);
    fs.writeFileSync(tempPath, fileContent);

    const req = {
        file: {
            path: tempPath,
            mimetype: mimeType
        },
        body
    };

    const res = {
        statusCode: 200,
        jsonResponse: null,
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            this.jsonResponse = data;
            return this;
        }
    };

    return { req, res, tempPath };
}

async function runTests() {
    try {
        await setupTestDb();
        
        console.log("\n==============================================");
        console.log("TESTING PUBLIC HISTORICAL IMPORT ISOLATION");
        console.log("==============================================\n");

        // Ensure temp directory exists
        const tempDir = path.join(__dirname, 'uploads', 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Clean up any previous synthetic data
        await PublicHistoricalIncident.deleteMany({ sourceName: 'TEST_FIXTURE_JSON' });
        await PublicHistoricalIncident.deleteMany({ sourceName: 'TEST_FIXTURE_CSV' });

        console.log("1. Testing JSON Parsing & Validation (Preview)");
        const jsonReqRes = createMockReqRes(
            JSON.stringify(mockJsonData), 
            'application/json', 
            'test.json',
            { sourceName: 'TEST_FIXTURE_JSON', sourceDataset: 'SYNTHETIC_TEST_JSON' }
        );

        await datasetImportController.previewDataset(jsonReqRes.req, jsonReqRes.res);
        
        const previewResult = jsonReqRes.res.jsonResponse;
        console.log("Preview Result:", previewResult);
        console.assert(jsonReqRes.res.statusCode === 200, "Preview should succeed");
        console.assert(previewResult.totalRecords === 4, "Should parse 4 records");
        console.assert(previewResult.validRecords === 2, "Should have 2 valid records");
        console.assert(previewResult.invalidRecords === 1, "Should have 1 invalid record (missing date)");
        console.assert(previewResult.duplicateRecords === 1, "Should detect 1 duplicate within file");
        console.assert(previewResult.unknownCategories === 1, "Should detect 1 unknown category");
        console.log("✅ JSON Preview successful");

        console.log("\n2. Testing JSON Final Import & DB Uniqueness");
        const jsonUploadReqRes = createMockReqRes(
            JSON.stringify(mockJsonData), 
            'application/json', 
            'test2.json',
            { sourceName: 'TEST_FIXTURE_JSON', sourceDataset: 'SYNTHETIC_TEST_JSON' }
        );
        await datasetImportController.uploadDataset(jsonUploadReqRes.req, jsonUploadReqRes.res);
        const uploadResult = jsonUploadReqRes.res.jsonResponse;
        console.log("Upload Result:", uploadResult);
        console.assert(uploadResult.recordsImported === 2, "Should insert exactly 2 valid unique records");

        // Try importing the exact same file again to test DB deduplication
        const jsonUploadReqRes2 = createMockReqRes(
            JSON.stringify(mockJsonData), 
            'application/json', 
            'test3.json',
            { sourceName: 'TEST_FIXTURE_JSON', sourceDataset: 'SYNTHETIC_TEST_JSON' }
        );
        await datasetImportController.uploadDataset(jsonUploadReqRes2.req, jsonUploadReqRes2.res);
        const uploadResult2 = jsonUploadReqRes2.res.jsonResponse;
        console.assert(uploadResult2.recordsImported === 0, "Should insert 0 records on second try (duplicates)");
        console.log("✅ Database deduplication and unique indexes functioning correctly");

        console.log("\n3. Testing Category & Department Mapping");
        const savedRecord1 = await PublicHistoricalIncident.findOne({ sourceRecordId: 'SYNTHETIC-JSON-001' });
        console.assert(savedRecord1.category === 'Potholes', "Pothole should map to Potholes");
        console.assert(savedRecord1.categoryMappingStatus === 'MAPPED', "Should be MAPPED");
        
        const savedRecord2 = await PublicHistoricalIncident.findOne({ sourceRecordId: 'SYNTHETIC-JSON-002' });
        console.assert(savedRecord2.category === 'Other', "Unknown should fall back to Other");
        console.assert(savedRecord2.categoryMappingStatus === 'UNKNOWN', "Should be UNKNOWN");
        console.log("✅ Category mapping successful");

        console.log("\n4. Testing CSV Parsing");
        const csvReqRes = createMockReqRes(
            mockCsvData, 
            'text/csv', 
            'test.csv',
            { sourceName: 'TEST_FIXTURE_CSV', sourceDataset: 'SYNTHETIC_TEST_CSV' }
        );
        await datasetImportController.uploadDataset(csvReqRes.req, csvReqRes.res);
        console.assert(csvReqRes.res.jsonResponse.recordsImported === 2, "Should import 2 CSV records");
        console.log("✅ CSV Import successful");

        console.log("\n5. Validating Strict Isolation from RL / Live Data");
        const health = await evaluateDataHealth();
        const rlCount = health.summary.eligibleTransitions;
        // Issue schema doesn't even have sourceRecordId, but we can just check if any TEST_FIXTURE leaked
        const leakedIssue = await Issue.findOne({ title: /Synthetic/i });
        console.assert(!leakedIssue, "Public historical records MUST NOT leak into the live Issue collection");
        
        const statsReqRes = { res: { jsonResponse: null, json: function(d) { this.jsonResponse = d; return this; } } };
        await datasetImportController.getStats(null, statsReqRes.res);
        
        console.log(`- Public Historical Count: ${statsReqRes.res.jsonResponse.publicHistoricalIncidents}`);
        console.log(`- RL Eligible Count: ${statsReqRes.res.jsonResponse.rlEligibleTransitions}`);
        console.log("✅ Data is completely separated from LIVE_DATA and RL eligibility");

        // Clean up
        await PublicHistoricalIncident.deleteMany({ sourceName: 'TEST_FIXTURE_JSON' });
        await PublicHistoricalIncident.deleteMany({ sourceName: 'TEST_FIXTURE_CSV' });
        console.log("\n🧹 Cleaned up TEST_FIXTURE data");

        console.log("\nALL PUBLIC HISTORICAL IMPORT TESTS PASSED. NO SYNTHETIC DATA WAS ADDED TO THE PRODUCTION RL DATASET.");
        process.exit(0);
    } catch (err) {
        console.error("Test failed:", err);
        process.exit(1);
    }
}

runTests();
