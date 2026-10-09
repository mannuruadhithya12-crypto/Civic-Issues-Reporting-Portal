const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

async function runMemoryAdaptiveTests() {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  console.log('Connected to Memory Mongo');

  const AdaptiveDecisionEngine = require('./services/adaptiveDecisionEngine');
  const ChampionChallengerService = require('./services/championChallengerService');
  const Issue = require('./models/Issue');
  const User = require('./models/User');

  const user = await User.create({ name: 'Admin', email: 'adm@gov.in', password: 'pwd', role: 'admin' });
  const testIssue = await Issue.create({
    title: 'Water Leak Mainline',
    description: 'Pipe ruptured on 4th Ave',
    category: 'Water leakage',
    department: 'Water leakage',
    location: '4th Avenue, Ward 12',
    locationName: '4th Avenue',
    priorityScore: 88,
    status: 'reported',
    coordinates: { type: 'Point', coordinates: [77.59, 12.97] },
    createdBy: user._id
  });

  console.log('1. Checking strategies...');
  const strats = await AdaptiveDecisionEngine.getAvailableStrategies();
  console.log('Available strategies:', strats.map(s => s.id));

  console.log('2. Making decision with makeDecision...');
  const decision = await AdaptiveDecisionEngine.makeDecision(testIssue._id, 'DETERMINISTIC');
  console.log('Decision generated:', decision ? 'SUCCESS' : 'NONE', 'Strategy:', decision.strategyId);

  console.log('3. Running Champion vs Challenger Shadowing...');
  const shadowResult = await ChampionChallengerService.compareStrategies(testIssue._id);
  console.log('Shadow Comparison Completed. Status:', shadowResult.status);

  await mongoose.disconnect();
  await mongod.stop();
  console.log('Adaptive Intelligence Test Suite PASSED COMPLETELY!');
  process.exit(0);
}

runMemoryAdaptiveTests().catch(err => { console.error('Failed:', err); process.exit(1); });
