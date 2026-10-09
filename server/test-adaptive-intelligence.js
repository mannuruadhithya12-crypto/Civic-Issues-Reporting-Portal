require('dotenv').config();
const mongoose = require('mongoose');
const AdaptiveDecisionEngine = require('./services/adaptiveDecisionEngine');
const ChampionChallengerService = require('./services/championChallengerService');
const AdaptivePolicy = require('./models/AdaptivePolicy');
const Issue = require('./models/Issue');
const InterventionOutcome = require('./models/InterventionOutcome');
const { evaluateIntervention } = require('./controllers/interventionController');
const { getAvailableStrategies } = require('./services/adaptiveDecisionEngine');

async function runTests() {
    console.log("=========================================");
    console.log("PHASE 9: ADAPTIVE INTELLIGENCE TEST SUITE");
    console.log("=========================================\n");

    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/civic_issues');
        console.log("✅ Connected to MongoDB");

        // Need a user for createdBy
        const User = require('./models/User');
        let testUser = await User.findOne();
        if (!testUser) {
            testUser = new User({ username: 'testuser', email: 'test@example.com', password: 'password', role: 'admin' });
            await testUser.save();
        }

        // Create a test issue
        const testIssue = new Issue({
            title: "Test Pothole for Phase 9",
            description: "Deep pothole causing accidents.",
            location: "123 Test St",
            category: "road_hazard",
            department: "Potholes",
            priorityScore: 85, // Emergency
            status: 'reported',
            coordinates: {
                type: 'Point',
                coordinates: [-122.4194, 37.7749]
            },
            createdBy: testUser._id
        });
        await testIssue.save();
        console.log(`✅ Created Test Issue: ${testIssue._id}`);

        // 1. Check Strategies (Should default to DETERMINISTIC available)
        const strategies = await getAvailableStrategies();
        console.log("✅ Available Strategies:", strategies.map(s => `${s.id} (${s.status})`).join(', '));
        
        const deterministicStrat = strategies.find(s => s.id === 'DETERMINISTIC');
        if (!deterministicStrat || deterministicStrat.status !== 'AVAILABLE') {
            throw new Error("DETERMINISTIC strategy is not available.");
        }

        // 2. Make a Decision (Deterministic)
        console.log("\n--- Testing Decision Engine ---");
        const decisionResult = await AdaptiveDecisionEngine.makeDecision(testIssue._id, 'DETERMINISTIC', {
            workers: 10,
            vehicles: 5,
            budget: 5000,
            workingHours: 40
        });

        console.log("✅ Decision Made:", decisionResult.recommendation.actionName);
        console.log("✅ Safety Status:", decisionResult.safetyResult.status);
        if (decisionResult.safetyResult.status !== 'SAFE') {
             console.log("   Reasons:", decisionResult.safetyResult.reasons);
        }

        // 3. Test Champion/Challenger (Shadow Mode)
        console.log("\n--- Testing Champion/Challenger ---");
        const comparison = await ChampionChallengerService.compareStrategies(testIssue._id, {
            workers: 10,
            vehicles: 5,
            budget: 5000,
            workingHours: 40
        });
        console.log(`✅ Comparison Status: ${comparison.status}`);
        console.log(`✅ Current Policy (DETERMINISTIC): ${comparison.currentPolicy.recommendation.actionName}`);
        if (comparison.candidatePolicy) {
             console.log(`✅ Candidate Policy (DQN): ${comparison.candidatePolicy.recommendation.actionName}`);
             console.log(`✅ Agreement: ${comparison.metrics.actionAgreement}`);
        } else {
             console.log(`✅ Candidate Policy (DQN): UNAVAILABLE (Expected if no ACTIVE DQN policy)`);
        }

        // 4. Test Policy Governance Transition
        console.log("\n--- Testing Policy Governance ---");
        const testPolicy = new AdaptivePolicy({
            policyId: `TEST-DQN-${Date.now()}`,
            policyVersion: '1.0.0',
            strategyId: 'DQN',
            stateVersion: 'state-v2',
            actionVersion: 'action-v1',
            status: 'DRAFT'
        });
        await testPolicy.save();
        console.log("✅ Created DRAFT Policy:", testPolicy.policyId);

        testPolicy.status = 'VALIDATING';
        await testPolicy.save();
        console.log("✅ Transitioned Policy to VALIDATING");

        // Clean up
        await AdaptivePolicy.findByIdAndDelete(testPolicy._id);
        await Issue.findByIdAndDelete(testIssue._id);
        const DecisionRecord = require('./models/DecisionRecord');
        await DecisionRecord.deleteMany({ issueId: testIssue._id });
        
        console.log("\n=========================================");
        console.log("🎉 ALL ADAPTIVE INTELLIGENCE TESTS PASSED");
        console.log("=========================================\n");

    } catch (err) {
        console.error("\n❌ TEST FAILED:");
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
}

runTests();
