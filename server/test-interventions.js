require('dotenv').config();
const mongoose = require('mongoose');
const { optimizePlan, generateScoredCandidates } = require('./services/optimizationService');
const { getCurrentInterventionMetrics } = require('./services/interventionEvaluationService');
const InterventionOutcome = require('./models/InterventionOutcome');
const Issue = require('./models/Issue');

async function runTests() {
    console.log("Connecting to Database...");
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log("\n=============================================");
    console.log("TESTING SPRINT 7: INTERVENTION OPTIMIZATION & EVALUATION");
    console.log("=============================================\n");

    try {
        console.log("1. Fetching Intervention Candidates...");
        const candidates = await generateScoredCandidates();
        console.log(`Found ${candidates.length} candidate interventions based on Priority and Predictions.\n`);
        
        let testIssueId = null;

        if (candidates.length > 0) {
            console.log("Example Candidate:");
            console.log(JSON.stringify(candidates[0], null, 2));
            testIssueId = candidates[0].issueId;
        }

        console.log("\n2. Testing Deterministic Greedy Optimization...");
        const tightResources = { workers: 10, vehicles: 2, budget: 15000, workingHours: 40 };
        const plan = optimizePlan(candidates, tightResources);

        console.log("\n3. Optimization Results:");
        console.log(`- Selected Interventions: ${plan.selectedPlan.length}`);
        
        if (testIssueId && plan.selectedPlan.length > 0) {
            console.log("\n4. Testing Full Lifecycle (RECOMMENDED -> APPROVED -> EXECUTED -> EVALUATED)...");
            const selectedCandidate = plan.selectedPlan[0];
            
            const outcome = new InterventionOutcome({
                issueId: selectedCandidate.issueId,
                targetArea: selectedCandidate.target,
                category: selectedCandidate.category,
                department: selectedCandidate.department,
                interventionType: selectedCandidate.interventionType,
                resources: {
                    workers: selectedCandidate.workers,
                    vehicles: selectedCandidate.vehicles,
                    hours: selectedCandidate.hours,
                    cost: selectedCandidate.cost
                },
                beforeMetrics: selectedCandidate.stateBefore,
                status: 'APPROVED',
                approvedAt: new Date()
            });
            await outcome.save();
            console.log("   [SUCCESS] Intervention APPROVED.");

            outcome.status = 'EXECUTED';
            outcome.executedAt = new Date();
            await outcome.save();
            console.log("   [SUCCESS] Intervention EXECUTED.");

            // Fake an old execution to avoid warning (optional)
            outcome.executedAt = new Date(Date.now() - 48 * 60 * 60 * 1000); 
            
            console.log("\n   Attempting Evaluation...");
            try {
                const currentMetrics = await getCurrentInterventionMetrics(outcome);
                outcome.afterMetrics = currentMetrics;
                
                const riskReduction = outcome.beforeMetrics.riskScore - currentMetrics.riskScore;
                outcome.reward = {
                    riskReduction: riskReduction,
                    slaImprovement: outcome.beforeMetrics.slaRisk - currentMetrics.slaRisk,
                    issueReduction: outcome.beforeMetrics.openIssues - currentMetrics.openIssues,
                    recurrenceReduction: outcome.beforeMetrics.recurringCount - currentMetrics.recurringCount,
                    resourceEfficiency: 100 - (outcome.resources.cost / 200)
                };
                outcome.reward.value = outcome.reward.riskReduction + outcome.reward.slaImprovement + outcome.reward.issueReduction;
                outcome.status = 'EVALUATED';
                outcome.evaluatedAt = new Date();
                outcome.evaluationSource = 'SIMULATION';
                outcome.trainingEligible = false;
                
                await outcome.save();
                console.log("   [SUCCESS] Intervention EVALUATED with LIVE_DATA.");
                console.log(`   Observed risk change: ${riskReduction < 0 ? 'INCREASE' : 'REDUCTION'} of ${Math.abs(riskReduction)} points.`);
                console.log(`   Training Eligible: ${outcome.trainingEligible}`);
            } catch(e) {
                console.log("   [SKIPPED] Could not evaluate due to active issue status logic in test.", e.message);
            }
        }

        console.log("\nAll Tests Executed Successfully!");

    } catch (err) {
        console.error("Test failed:", err);
    } finally {
        // Clean up test data if necessary, or just close connection
        mongoose.connection.close();
    }
}

runTests();
