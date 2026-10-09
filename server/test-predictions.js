require('dotenv').config();
const mongoose = require('mongoose');
const { buildDataset } = require('./ml/datasetBuilder');
const { trainModel } = require('./ml/train');
const { getGeographicPredictions, getOverview } = require('./controllers/predictionController');
const { predictGeographicRisk } = require('./services/predictionService');

// Stub response
const res = {
    status: (code) => {
        console.log("Status:", code);
        return {
            json: (data) => console.log("JSON Output:", JSON.stringify(data, null, 2))
        };
    },
    json: (data) => console.log("JSON Output:", JSON.stringify(data, null, 2))
};

const req = {};

async function runTests() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civic_issues');

    console.log("\n--- 1. Testing Dataset Builder ---");
    const dataset = await buildDataset();
    console.log(`Dataset build status: ${dataset.status}, Total Samples: ${dataset.samples}, Pos: ${dataset.positiveSamples}, Neg: ${dataset.negativeSamples}`);

    console.log("\n--- 2. Testing Model Training ---");
    const trainResult = await trainModel();
    console.log("Training Result:");
    console.log(JSON.stringify(trainResult, null, 2));

    console.log("\n--- 3. Testing Geographic Predictions (Direct Service call) ---");
    // Pick a mock coordinate somewhere in the middle of standard test data (or 0,0)
    const mockLat = 28.6139;
    const mockLon = 77.2090;
    const prediction = await predictGeographicRisk(mockLat, mockLon, 'Potholes');
    console.log(JSON.stringify(prediction, null, 2));

    console.log("\n--- 4. Testing Overview Endpoint ---");
    await getOverview(req, res);

    process.exit(0);
}

runTests().catch(console.error);
