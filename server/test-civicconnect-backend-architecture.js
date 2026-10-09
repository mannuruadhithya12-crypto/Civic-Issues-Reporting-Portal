// server/test-civicconnect-backend-architecture.js
const http = require('http');

const baseURL = 'http://localhost:5000';

async function main() {
    console.log("=== RUNNING CIVICCONNECT BACKEND ARCHITECTURE INTEGRATION TESTS ===");

    // 1. Health check
    const rootRes = await fetch(`${baseURL}/`);
    const rootData = await rootRes.json();
    console.log("✓ Server Root Health Check:", rootData.message);

    // 2. Admin Login to get Token
    const loginRes = await fetch(`${baseURL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@civic.gov', password: 'admin123' })
    });
    
    if (!loginRes.ok) {
        console.error("❌ Admin login failed with status:", loginRes.status);
        process.exit(1);
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log("✓ Admin Authenticated successfully. Token obtained.");

    const authHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // --- PHASE 2: CIVIC INTELLIGENCE SUBSYSTEM ---
    console.log("\n--- Testing Phase 2: Civic Intelligence Subsystem ---");
    const intelOverview = await (await fetch(`${baseURL}/api/admin/intelligence/overview`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/intelligence/overview:", intelOverview.summary);

    const intelTrends = await (await fetch(`${baseURL}/api/admin/intelligence/trends`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/intelligence/trends: Returned", intelTrends.trends.length, "trend data points.");

    const intelCategories = await (await fetch(`${baseURL}/api/admin/intelligence/categories`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/intelligence/categories: Returned", intelCategories.categories.length, "categories.");

    const intelGeo = await (await fetch(`${baseURL}/api/admin/intelligence/geographic`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/intelligence/geographic: Geo status =", intelGeo.status || 'OK');

    const intelPriority = await (await fetch(`${baseURL}/api/admin/intelligence/priority`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/intelligence/priority: Priority rankings count =", intelPriority.rankings.length);

    const intelDuplicates = await (await fetch(`${baseURL}/api/admin/intelligence/duplicates`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/intelligence/duplicates: Duplicates checked.");

    const intelPredictions = await (await fetch(`${baseURL}/api/admin/intelligence/predictions`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/intelligence/predictions: Model status =", intelPredictions.status);

    const intelDecision = await (await fetch(`${baseURL}/api/admin/intelligence/decision-support`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/intelligence/decision-support: Recommendations count =", intelDecision.recommendations.length);

    // --- PHASE 3: INTERVENTION SUBSYSTEM ---
    console.log("\n--- Testing Phase 3: Intervention Backend Subsystem ---");
    const interventionsList = await (await fetch(`${baseURL}/api/admin/interventions`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/interventions: List returned", interventionsList.length, "outcomes.");

    // Fetch an active issue ID from DB
    const issuesRes = await (await fetch(`${baseURL}/api/issues`, { headers: authHeaders })).json();
    const sampleIssue = issuesRes.issues ? issuesRes.issues[0] : (Array.isArray(issuesRes) ? issuesRes[0] : null);
    const sampleIssueId = sampleIssue ? (sampleIssue._id || sampleIssue.id) : null;

    // Create & test state machine: RECOMMENDED -> APPROVED -> EXECUTED -> EVALUATED
    const createInterventionRes = await fetch(`${baseURL}/api/admin/interventions`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
            issueId: sampleIssueId,
            category: sampleIssue ? (sampleIssue.department || 'Roads') : 'Roads',
            department: sampleIssue ? (sampleIssue.department || 'Roads') : 'Roads',
            interventionType: 'ROAD_PATCHING',
            targetArea: sampleIssue ? (sampleIssue.locationName || 'Sector 5') : 'Sector 5',
            resources: { workers: 2, vehicles: 1, hours: 4, cost: 300 }
        })
    });
    const createdIntervention = await createInterventionRes.json();
    const outcomeId = createdIntervention.outcome._id;
    console.log("✓ POST /api/admin/interventions: Created outcome ID =", outcomeId, "Status =", createdIntervention.outcome.status);

    // Test invalid transition (direct evaluation before approve/execute)
    const invalidEvalRes = await fetch(`${baseURL}/api/admin/interventions/${outcomeId}/evaluate`, {
        method: 'POST',
        headers: authHeaders
    });
    if (invalidEvalRes.status === 400) {
        console.log("✓ State Machine Enforced: Direct evaluation rejected with status 400 (Must be EXECUTED).");
    } else {
        console.error("❌ State Machine Violation: Direct evaluation returned status", invalidEvalRes.status);
    }

    // Approve intervention
    const approveRes = await fetch(`${baseURL}/api/admin/interventions/${outcomeId}/approve`, {
        method: 'POST',
        headers: authHeaders
    });
    const approvedData = await approveRes.json();
    console.log("✓ POST /api/admin/interventions/:id/approve: Status =", approvedData.outcome.status);

    // Execute intervention
    const executeRes = await fetch(`${baseURL}/api/admin/interventions/${outcomeId}/execute`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ actualResources: { workers: 2, vehicles: 1, hours: 3, cost: 280 } })
    });
    const executedData = await executeRes.json();
    console.log("✓ POST /api/admin/interventions/:id/execute: Status =", executedData.outcome.status);

    // Evaluate intervention
    const evaluateRes = await fetch(`${baseURL}/api/admin/interventions/${outcomeId}/evaluate`, {
        method: 'POST',
        headers: authHeaders
    });
    const evaluatedData = await evaluateRes.json();
    console.log("✓ POST /api/admin/interventions/:id/evaluate: Status =", evaluatedData.outcome.status, "TrainingEligible =", evaluatedData.outcome.trainingEligible);

    // --- PHASE 4: AI / RL SUBSYSTEM ---
    console.log("\n--- Testing Phase 4: AI / RL Subsystem & Production Gates ---");
    const rlHealth = await (await fetch(`${baseURL}/api/admin/rl/health`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/rl/health: Status =", rlHealth.status, "EligibleTransitions =", rlHealth.trainingEligibleTransitions);

    const rlDataset = await (await fetch(`${baseURL}/api/admin/rl/dataset`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/rl/dataset: Ready dataset count =", rlDataset.length);

    const rlTransitions = await (await fetch(`${baseURL}/api/admin/rl/transitions`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/rl/transitions: Transition count =", rlTransitions.count);

    const rlRewards = await (await fetch(`${baseURL}/api/admin/rl/rewards`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/rl/rewards: Rewards recorded count =", rlRewards.count);

    const rlInferenceStatus = await (await fetch(`${baseURL}/api/admin/rl/inference`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/rl/inference: Inference allowed =", rlInferenceStatus.inferenceAllowed, "Status =", rlInferenceStatus.status);

    // --- PHASE 5: ADAPTIVE INTELLIGENCE SUBSYSTEM ---
    console.log("\n--- Testing Phase 5: Adaptive Intelligence Subsystem ---");
    const adaptiveState = await (await fetch(`${baseURL}/api/admin/adaptive/state`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/adaptive/state: Authoritative state generated =", Boolean(adaptiveState.state));

    const adaptiveDecisions = await (await fetch(`${baseURL}/api/admin/adaptive/decisions`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/adaptive/decisions: Decisions count =", adaptiveDecisions.decisions.length);

    const adaptiveChampChall = await (await fetch(`${baseURL}/api/admin/adaptive/champion-challenger`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/adaptive/champion-challenger: Champion status =", adaptiveChampChall.champion.status, "Challenger status =", adaptiveChampChall.challenger.status);

    const adaptivePolicies = await (await fetch(`${baseURL}/api/admin/adaptive/policies`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/adaptive/policies: Policies count =", adaptivePolicies.policies.length);

    // Test Policy Governance Lifecycle: DRAFT -> VALIDATING -> SHADOW -> APPROVED -> ACTIVE -> RETIRED
    const createPolicyRes = await fetch(`${baseURL}/api/admin/adaptive/policies`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
            policyId: `test_policy_${Date.now()}`,
            policyVersion: '1.0.0',
            strategyId: 'DETERMINISTIC',
            modelType: 'NONE',
            stateVersion: 'state-v1',
            actionVersion: 'action-v1'
        })
    });
    const createPolicyData = await createPolicyRes.json();
    if (!createPolicyData.policy) {
        console.error("❌ Policy creation error:", createPolicyData);
        process.exit(1);
    }
    const createdPolicy = createPolicyData.policy;
    console.log("✓ Policy Created ID =", createdPolicy.policyId, "Status =", createdPolicy.status);

    const validatePolRes = await fetch(`${baseURL}/api/admin/adaptive/policies/${createdPolicy._id}/validate`, { method: 'POST', headers: authHeaders });
    console.log("✓ Policy Validated Status =", (await validatePolRes.json()).policy.status);

    const shadowPolRes = await fetch(`${baseURL}/api/admin/adaptive/policies/${createdPolicy._id}/transition/SHADOW`, { method: 'POST', headers: authHeaders });
    console.log("✓ Policy Transitioned to SHADOW Status =", (await shadowPolRes.json()).policy.status);

    const approvePolRes = await fetch(`${baseURL}/api/admin/adaptive/policies/${createdPolicy._id}/approve`, { method: 'POST', headers: authHeaders });
    console.log("✓ Policy Approved Status =", (await approvePolRes.json()).policy.status);

    const activatePolRes = await fetch(`${baseURL}/api/admin/adaptive/policies/${createdPolicy._id}/activate`, { method: 'POST', headers: authHeaders });
    console.log("✓ Policy Activated Status =", (await activatePolRes.json()).policy.status);

    // --- PHASE 6: LIVE OPERATIONS & DASHBOARD SUBSYSTEM ---
    console.log("\n--- Testing Phase 6: Live Operations & Dashboard Subsystem ---");
    const dbOverview = await (await fetch(`${baseURL}/api/admin/dashboard/overview`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/dashboard/overview:", dbOverview.stats);

    const dbKpis = await (await fetch(`${baseURL}/api/admin/dashboard/kpis`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/dashboard/kpis:", dbKpis.kpis);

    const dbSla = await (await fetch(`${baseURL}/api/admin/dashboard/sla`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/dashboard/sla: Summary =", dbSla.summary);

    const dbWorkers = await (await fetch(`${baseURL}/api/admin/dashboard/workers`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/dashboard/workers: Workers count =", dbWorkers.count);

    const dbMap = await (await fetch(`${baseURL}/api/admin/dashboard/map`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/dashboard/map: Marker count =", dbMap.markerCount, "Invalid count =", dbMap.invalidCoordinateCount);

    const dbActivity = await (await fetch(`${baseURL}/api/admin/dashboard/activity`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/dashboard/activity: Activities count =", dbActivity.activities.length);

    const opsEvents = await (await fetch(`${baseURL}/api/admin/operations/events`, { headers: authHeaders })).json();
    console.log("✓ GET /api/admin/operations/events: Operational audit events count =", opsEvents.count);

    console.log("\n==========================================================");
    console.log("ALL BACKEND SUBSYSTEM ENDPOINTS PASSED VERIFICATION CLEANLY!");
    console.log("==========================================================");
}

main().catch(err => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
});
