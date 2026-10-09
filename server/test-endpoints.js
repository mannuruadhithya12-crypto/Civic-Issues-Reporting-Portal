const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testEndpoints() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const User = require('./models/User');
    
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('No admin found, creating one...');
      admin = new User({ username: 'testadmin', email: 'admin@test.com', password: 'password', role: 'admin' });
      await admin.save();
    }

    const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    const fetchApi = async (path, method = 'GET', body = null) => {
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      if (body) options.body = JSON.stringify(body);
      const res = await fetch(`http://localhost:5000/api${path}`, options);
      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(`API Error ${res.status}: ${errorData}`);
      }
      return { status: res.status, data: await res.json() };
    };

    console.log('\n--- 1. Testing GET /decision-support/priorities ---');
    const prioritiesRes = await fetchApi('/decision-support/priorities');
    console.log(`Status: ${prioritiesRes.status}`);
    console.log(`Data count: ${prioritiesRes.data.length}`);
    if (prioritiesRes.data.length > 0) {
      console.log(`Top priority: ${prioritiesRes.data[0].title} (Score: ${prioritiesRes.data[0].priorityScore})`);
    }

    console.log('\n--- 2. Testing GET /decision-support/sla-risk ---');
    const slaRes = await fetchApi('/decision-support/sla-risk');
    console.log(`Status: ${slaRes.status}`);
    console.log(`Data:`, slaRes.data);

    console.log('\n--- 3. Testing GET /decision-support/workload ---');
    const workloadRes = await fetchApi('/decision-support/workload');
    console.log(`Status: ${workloadRes.status}`);
    console.log(`Departments found: ${workloadRes.data.length}`);

    console.log('\n--- 4. Testing GET /decision-support/recommendations ---');
    const recsRes = await fetchApi('/decision-support/recommendations');
    console.log(`Status: ${recsRes.status}`);
    console.log(`Recommendations count: ${recsRes.data.length}`);

    console.log('\n--- 5. Testing POST /decision-support/simulate ---');
    const simRes = await fetchApi('/decision-support/simulate', 'POST', {
      department: 'Infrastructure',
      additionalWorkers: 2,
      capacityPerWorkerPerDay: 5
    });
    console.log(`Status: ${simRes.status}`);
    console.log(`Simulation result:`, simRes.data.scenario);

    // Get an issue for explanation
    if (prioritiesRes.data.length > 0) {
      console.log('\n--- 6. Testing POST /decision-support/explain ---');
      const explainRes = await fetchApi('/decision-support/explain', 'POST', {
        contextData: prioritiesRes.data[0]
      });
      console.log(`Status: ${explainRes.status}`);
      console.log(`Explanation length: ${explainRes.data.explanation.length} chars`);
      console.log(`Snippet: ${explainRes.data.explanation.substring(0, 100)}...`);
    } else {
       console.log('\n--- 6. Skipping Explain test (no issues) ---');
    }

    console.log('\n✅ All tests passed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err.message);
    process.exit(1);
  }
}

testEndpoints();
