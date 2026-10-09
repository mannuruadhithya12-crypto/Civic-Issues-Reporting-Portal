require('dotenv').config();
const mongoose = require('mongoose');
const InterventionOutcome = require('./models/InterventionOutcome');
const PublicHistoricalIncident = require('./models/PublicHistoricalIncident');

async function inspect() {
    await mongoose.connect(process.env.MONGO_URI);
    
    const outcomes = await InterventionOutcome.find({}).lean();
    const liveData = outcomes.filter(o => o.status === 'EVALUATED' && o.evaluationSource === 'LIVE_DATA' && o.trainingEligible === true);

    console.log("\n--- DUMPING ALL TRAINING ELIGIBLE RECORDS ---");
    for (const record of liveData) {
        console.log(`Outcome ID: ${record._id}`);
        console.log(`Issue ID: ${record.issueId}`);
        console.log(`Action: ${record.interventionType}`);
        console.log(`Category: ${record.category}`);
        console.log(`Department: ${record.department}`);
        console.log(`Before metrics: ${JSON.stringify(record.beforeMetrics)}`);
        console.log(`After metrics: ${JSON.stringify(record.afterMetrics)}`);
        console.log(`Reward: ${JSON.stringify(record.reward)}`);
        console.log(`Resource usage: ${JSON.stringify(record.resources)}`);
        console.log(`evaluationSource: ${record.evaluationSource}`);
        console.log(`trainingEligible: ${record.trainingEligible}`);
        console.log(`status: ${record.status}`);
        console.log(`timestamps: createdAt=${record._id.getTimestamp()}, evaluatedAt=${record.evaluatedAt}`);
        console.log("-------------------------------------------------");
    }

    const publicCount = await PublicHistoricalIncident.countDocuments();
    console.log(`\nTotal PublicHistoricalIncident records: ${publicCount}`);

    process.exit(0);
}
inspect().catch(console.error);
