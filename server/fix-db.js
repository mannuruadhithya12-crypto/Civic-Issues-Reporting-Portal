require('dotenv').config();
const mongoose = require('mongoose');
const InterventionOutcome = require('./models/InterventionOutcome');

async function fix() {
    await mongoose.connect(process.env.MONGO_URI);
    
    // We update the 5 specific test-derived records
    const idsToFix = [
        '6aa91a2f36e49d99ee488efa', // inspection - Sept 15
        '6aaacd58c49d455b53ffa0f3', // Full Road Repair - Sept 16
        '6aaacd8298c808a8c81d4a9d', // full_repair - Sept 16
        '6aaad225bd4fbc2acf2f8f9b', // inspection - Sept 16
        '6aab7625e5e25201c2d49594'  // inspection - Sept 17
    ];

    for (const id of idsToFix) {
        const record = await InterventionOutcome.findById(id);
        if (record) {
            record.evaluationSource = 'SIMULATION';
            record.trainingEligible = false;
            await record.save();
            console.log(`Fixed record ${id}`);
        }
    }
    
    process.exit(0);
}
fix().catch(console.error);
