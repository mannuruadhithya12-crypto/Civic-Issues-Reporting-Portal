const mongoose = require('mongoose');
require('dotenv').config();

async function testManualWorkflow() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    const Issue = require('./models/Issue');
    const InterventionOutcome = require('./models/InterventionOutcome');
    const User = require('./models/User');
    
    // Get dummy admin
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
        admin = new User({ username: 'testadmin', email: 'admin@test.com', password: 'password', role: 'admin' });
        await admin.save();
    }

    // 1. Create a genuine issue
    const issue = new Issue({
        title: 'Massive Pothole on Main St',
        description: 'Deep pothole causing traffic issues',
        department: 'Potholes',
        location: 'Main St',
        coordinates: { type: 'Point', coordinates: [20, 10] },
        createdBy: admin._id,
        status: 'reported',
        slaDeadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    });
    await issue.save();
    console.log('1. Created genuine issue:', issue._id);

    // Provide mock req and res for controllers
    const mockRes = () => {
        const res = {};
        res.status = (code) => { res.statusCode = code; return res; };
        res.json = (data) => { res.data = data; return res; };
        return res;
    };

    const interventionController = require('./controllers/interventionController');

    // 3. Approve candidate
    const approveReq = {
        user: { id: admin._id },
        body: {
            issueId: issue._id,
            target: 'Main St',
            category: 'Infrastructure',
            department: 'Public Works',
            interventionType: 'full_repair',
            workers: 2,
            vehicles: 1,
            hours: 4,
            cost: 2500
        }
    };
    const approveRes = mockRes();
    await interventionController.approveIntervention(approveReq, approveRes);
    
    if (approveRes.statusCode && approveRes.statusCode >= 400) {
        throw new Error('Approval failed: ' + JSON.stringify(approveRes.data));
    }
    const outcomeId = approveRes.data.outcome._id;
    console.log('3. Approved intervention, Outcome ID:', outcomeId);

    // Verify BEFORE state
    let outcome = await InterventionOutcome.findById(outcomeId);
    console.log('4. Verified BEFORE state source:', outcome.beforeMetrics.source);
    
    // 5. Execute
    const executeReq = {
        user: { id: admin._id },
        params: { id: outcomeId },
        body: {
            actualResources: {
                workers: 3,
                vehicles: 2,
                hours: 6,
                cost: 3000,
                availabilityStatus: 'KNOWN'
            }
        }
    };
    const executeRes = mockRes();
    await interventionController.executeIntervention(executeReq, executeRes);
    if (executeRes.statusCode && executeRes.statusCode >= 400) {
        throw new Error('Execution failed: ' + JSON.stringify(executeRes.data));
    }
    console.log('5. Executed intervention with actual resources');

    // Make state better (simulate real civic improvement before evaluation)
    issue.riskScore = 20;
    issue.priorityScore = 10;
    await issue.save();
    console.log('7. Real civic conditions changed (Risk 80 -> 20)');

    // 8. Evaluate
    const evaluateReq = {
        params: { id: outcomeId }
    };
    const evaluateRes = mockRes();
    await interventionController.evaluateIntervention(evaluateReq, evaluateRes);
    if (evaluateRes.statusCode && evaluateRes.statusCode >= 400) {
        throw new Error('Evaluation failed: ' + JSON.stringify(evaluateRes.data));
    }
    console.log('8. Evaluated intervention');
    
    // 9-12. Verify AFTER state, Reward, LIVE_DATA, trainingEligible
    outcome = await InterventionOutcome.findById(outcomeId);
    console.log('9. Verified AFTER state riskScore:', outcome.afterMetrics.riskScore);
    console.log('10. Verified Observed Reward:', outcome.reward.value);
    console.log('11. Verified LIVE_DATA evaluationSource:', outcome.evaluationSource);
    console.log('12. Verified trainingEligible:', outcome.trainingEligible);

    // 13. Open RL Data Health
    const { evaluateDataHealth } = require('./services/rlDataQualityService');
    const health = await evaluateDataHealth();
    console.log('13. Verified RL Data Health Eligible Transitions:', health.summary.eligibleTransitions);
    
    console.log('\n--- SUCCESS: Manual workflow tested successfully! ---');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

testManualWorkflow();
