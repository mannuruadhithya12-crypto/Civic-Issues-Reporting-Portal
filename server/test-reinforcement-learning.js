require('dotenv').config();
const mongoose = require('mongoose');
const InterventionOutcome = require('./models/InterventionOutcome');
const { buildRLDataset } = require('./ml/reinforcementLearning/datasetBuilder');
const { evaluateDataHealth } = require('./services/rlDataQualityService');
const stateEncoder = require('./ml/reinforcementLearning/stateEncoder');
const actionEncoder = require('./ml/reinforcementLearning/actionEncoder');

const RLEnvironment = require('./ml/reinforcementLearning/environment');

async function runTests() {
    console.log("Connecting to Database...");
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log("\n=============================================");
    console.log("TESTING SPRINT 8.1, 8.2, 8.3 & 8.4");
    console.log("=============================================\n");

    try {
        console.log("1. Testing Action Encoder Determinism...");
        const actionId = actionEncoder.encodeAction('inspection');
        console.log(`   - 'inspection' encoded to ID: ${actionId}`);

        console.log("\n2. Testing State Encoder Leakage Audit...");
        let leakage = false;
        stateEncoder.FEATURE_METADATA.forEach(f => {
            if (f.leaked || !f.preAction) {
                console.log(`   [FAIL] Leakage detected in feature: ${f.name}`);
                leakage = true;
            }
        });
        if (!leakage) console.log("   [SUCCESS] No leakage detected in State Encoder.");

        console.log("\n3. Testing Dataset Extraction (Dry Run)...");
        const dataset = await buildRLDataset();
        console.log(`   - Total eligible transitions built: ${dataset.totalEligibleTransitions}`);

        console.log("\n4. Testing RL Environment (Sprint 8.3)...");
        const env = new RLEnvironment();
        if (dataset.totalEligibleTransitions > 0) {
            const histTransition = dataset.transitions[0];
            const resetResult = env.reset(histTransition);
            console.log(`   - reset() state dimension: ${resetResult.state.length}`);
            
            const stepResult = env.step(histTransition.action);
            console.log(`   - step(historicalAction) reward: ${stepResult.reward}`);
            console.log(`   - step(historicalAction) done: ${stepResult.done}`);
        } else {
            console.log(`   - No transitions available to test environment step().`);
        }

        console.log("\n5. Running Full Data Health Analysis on Current Database...");
        const report = await evaluateDataHealth();
        
        console.log("\n");
        console.log("╔══════════════════════════════════════════╗");
        console.log("║       CIVICCONNECT RL DATA HEALTH        ║");
        console.log("╠══════════════════════════════════════════╣");
        console.log(`║ Eligible transitions        :  ${report.summary.eligibleTransitions.toString().padEnd(10)}║`);
        console.log(`║ Unique actions              :  ${report.actionDiversity.uniqueActions.toString().padEnd(10)}║`);
        console.log(`║ Unique categories           :  ${report.categoryDiversity.uniqueCategories.toString().padEnd(10)}║`);
        console.log(`║ Unique departments          :  ${report.departmentDiversity.uniqueDepartments.toString().padEnd(10)}║`);
        console.log(`║ Positive rewards            :  ${report.rewardDistribution.positive.toString().padEnd(10)}║`);
        console.log(`║ Negative rewards            :  ${report.rewardDistribution.negative.toString().padEnd(10)}║`);
        console.log(`║ Zero rewards                :  ${report.rewardDistribution.zero.toString().padEnd(10)}║`);
        console.log(`║ Temporal coverage           :  ${(report.temporalCoverage.coverageDays + " days").padEnd(10)}║`);
        console.log(`║ Missing critical values     :  ${report.missingValues.missingCriticalValues.toString().padEnd(10)}║`);
        console.log(`║ Missing vs zero             :  ${report.missingValues.missingFeaturesVsZero.toString().padEnd(10)}║`);
        console.log(`║ Exact duplicates            :  ${report.duplicates.exactDuplicates.toString().padEnd(10)}║`);
        console.log(`║ Near duplicates             :  ${report.duplicates.nearDuplicates.toString().padEnd(10)}║`);
        console.log(`║ Resource availability       :  ${(report.resourceQuality.resourceAvailabilityUnknown > 0 ? 'UNKNOWN' : 'KNOWN').padEnd(10)}║`);
        console.log(`║ Resource violations         :  ${report.resourceQuality.resourceViolations.toString().padEnd(10)}║`);
        console.log(`║ Leakage detected            :  ${(report.leakageAudit.leakageDetected ? 'YES' : 'NO').padEnd(10)}║`);
        console.log(`║ Transition consistency      :  ${(report.missingValues.missingCriticalValues === 0 ? 'PASS' : 'FAIL').padEnd(10)}║`);
        console.log("╠══════════════════════════════════════════╣");
        console.log(`║ RL READINESS              : ${report.readiness.padEnd(13)}║`);
        console.log("╚══════════════════════════════════════════╝");
        
        if (report.readiness === "INSUFFICIENT_DATA") {
            console.log("\nReasons for INSUFFICIENT_DATA:");
            report.reasons.forEach(r => console.log(`- ${r}`));
        }
        
        console.log("\nRecommendation:", report.recommendation);
        
    } catch (err) {
        console.error("Test failed:", err);
    } finally {
        mongoose.connection.close();
    }
}

runTests();
