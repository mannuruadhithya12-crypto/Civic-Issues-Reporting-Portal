require('dotenv').config();
const mongoose = require('mongoose');
const { evaluateDataHealth } = require('./services/rlDataQualityService');
const dqnTrainingService = require('./services/dqnTrainingService');

async function checkHealth() {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Test data health
    const health = await evaluateDataHealth();
    console.log("HEALTH:");
    console.log(JSON.stringify(health, null, 2));
    
    // Test training gate production
    try {
        const runRecord = await dqnTrainingService.trainDQN('production');
        console.log("PRODUCTION TRAIN RESULT:");
        console.log(JSON.stringify(runRecord, null, 2));
    } catch (e) {
        console.log("PRODUCTION TRAIN ERROR:", e.message);
    }

    // Test prototype mode
    try {
        const runRecordProto = await dqnTrainingService.trainDQN('prototype');
        console.log("PROTOTYPE TRAIN RESULT:");
        console.log(JSON.stringify(runRecordProto, null, 2));
    } catch (e) {
        console.log("PROTOTYPE TRAIN ERROR:", e.message);
    }
    
    process.exit(0);
}
checkHealth();
