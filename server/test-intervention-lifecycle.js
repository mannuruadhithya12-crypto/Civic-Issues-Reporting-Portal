const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

async function testInterventionFlow() {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const Campaign = require('./models/Campaign');
  const InterventionOutcome = require('./models/InterventionOutcome');
  const Issue = require('./models/Issue');
  const User = require('./models/User');

  const admin = await User.create({ name: 'Admin', email: 'admin@gov.in', password: 'pwd', role: 'admin' });
  const issue = await Issue.create({ 
    title: 'Severe Road Pothole', 
    description: 'Deep pothole on Main St', 
    category: 'Roads & Infrastructure', 
    location: 'Main St', 
    coordinates: { type: 'Point', coordinates: [77.5946, 12.9716] }, 
    createdBy: admin._id 
  });

  // 1. Create Campaign
  const campaign = await Campaign.create({
    name: 'Monsoon Road Repair',
    category: 'Roads & Infrastructure',
    targetArea: 'Central Ward',
    allocatedBudget: 50000,
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000 * 30),
    status: 'PLANNED',
    createdBy: admin._id
  });
  console.log('Campaign Created:', campaign.name, 'Status:', campaign.status);

  // 2. Transition Campaign Status
  campaign.status = 'ACTIVE';
  await campaign.save();
  console.log('Campaign Status Transitioned:', campaign.status);

  // 3. Create Intervention Outcome
  const outcome = await InterventionOutcome.create({
    issueId: issue._id,
    interventionType: 'Pothole Resurfacing',
    category: 'Roads & Infrastructure',
    department: 'Roads & Infrastructure',
    targetArea: 'Main St',
    resources: { cost: 2500, workers: 2 },
    status: 'APPROVED',
    beforeMetrics: { riskScore: 0.8, openIssues: 1, source: 'LIVE_DATA' }
  });
  console.log('Intervention Approved:', outcome.interventionType, 'Status:', outcome.status);

  // 4. Execute
  outcome.status = 'EXECUTED';
  outcome.actualCost = 2400;
  outcome.executedAt = new Date();
  await outcome.save();
  console.log('Intervention Executed:', outcome.status, 'Cost:', outcome.actualCost);

  // 5. Evaluate
  outcome.status = 'EVALUATED';
  outcome.observedOutcome = { riskReduction: 0.85, satisfactionRating: 4.8 };
  outcome.evaluatedAt = new Date();
  outcome.trainingEligible = true;
  await outcome.save();
  console.log('Intervention Evaluated:', outcome.status, 'Eligible for RL:', outcome.trainingEligible);

  await mongoose.disconnect();
  await mongod.stop();
  console.log('Intervention Lifecycle Flow PASSED completely!');
  process.exit(0);
}

testInterventionFlow().catch(err => { console.error(err); process.exit(1); });
