const mongoose = require('mongoose');
require('dotenv').config();

const Workflow = require('./models/Workflow');
const Step = require('./models/Step');
const Rule = require('./models/Rule');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/workflow_engine';

async function seedDatabase() {
  try {
    let mongoURI = MONGODB_URI;
    
    if (!mongoURI || mongoURI.includes('xxxxx') || mongoURI.includes('127.0.0.1') || mongoURI.includes('localhost')) {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        mongoURI = mongoServer.getUri();
        console.log('Started MongoDB Memory Server for seeding');
    }

    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB.');

    // Optional: Clear existing data for a clean slate
    // await Workflow.deleteMany({});
    // await Step.deleteMany({});
    // await Rule.deleteMany({});

    // 1. Create Workflow
    const workflow = new Workflow({
      name: 'Expense Approval',
      description: 'A multi-step rule-based workflow to process and approve employee expenses.',
      version: 1,
      is_active: true,
      input_schema: {
        amount: "number",
        country: "string",
        department: "string",
        priority: "string" // High, Medium, Low
      }
    });

    const savedWorkflow = await workflow.save();
    console.log(`Created Workflow: ${savedWorkflow.name} (${savedWorkflow._id})`);

    // 2. Create Steps
    const step1 = new Step({
      workflow_id: savedWorkflow._id,
      name: 'Manager Approval',
      step_type: 'approval',
      order: 1,
      metadata: { role: 'Manager' }
    });

    const step2 = new Step({
      workflow_id: savedWorkflow._id,
      name: 'Finance Notification',
      step_type: 'notification',
      order: 2,
      metadata: { department: 'Finance' }
    });

    const step3 = new Step({
      workflow_id: savedWorkflow._id,
      name: 'CEO Approval',
      step_type: 'approval',
      order: 3,
      metadata: { role: 'CEO' }
    });

    const step4 = new Step({
      workflow_id: savedWorkflow._id,
      name: 'Task Rejection',
      step_type: 'task',
      order: 4,
      metadata: { action: 'reject' }
    });

    const [s1, s2, s3, s4] = await Promise.all([
      step1.save(),
      step2.save(),
      step3.save(),
      step4.save()
    ]);

    console.log('Created Steps.');

    // Update workflow start_step_id
    savedWorkflow.start_step_id = s1._id;
    await savedWorkflow.save();

    // 3. Create Rules
    // Rule 1: amount > 100 && country == 'US' && priority == 'High' → Finance Notification (Step 2)
    const rule1 = new Rule({
      step_id: s1._id,
      condition: "amount > 100 && country == 'US' && priority == 'High'",
      next_step_id: s2._id,
      priority: 10
    });

    // Rule 2: amount <= 100 → CEO Approval (Step 3)
    const rule2 = new Rule({
      step_id: s1._id,
      condition: "amount <= 100",
      next_step_id: s3._id,
      priority: 20
    });

    // Rule 3: priority == 'Low' && country != 'US' → Task Rejection (Step 4)
    const rule3 = new Rule({
      step_id: s1._id,
      condition: "priority == 'Low' && country != 'US'",
      next_step_id: s4._id,
      priority: 30
    });

    // Rule 4: DEFAULT → Task Rejection (Step 4)
    const rule4 = new Rule({
      step_id: s1._id,
      condition: "DEFAULT",
      next_step_id: s4._id,
      priority: 100
    });

    await Promise.all([
      rule1.save(),
      rule2.save(),
      rule3.save(),
      rule4.save()
    ]);

    console.log('Created Rules for Expense Approval.');

    // --- SECOND SAMPLE WORKFLOW ---
    const onboardingWf = new Workflow({
      name: 'Employee Onboarding',
      description: 'Automated onboarding steps including IT setup and HR orientation based on the hire role.',
      version: 1,
      is_active: true,
      input_schema: {
        employeeName: "string",
        role: "string", // Developer, Sales, etc.
        requiresLaptop: "boolean"
      }
    });
    
    const savedOnboarding = await onboardingWf.save();
    console.log(`Created Workflow: ${savedOnboarding.name} (${savedOnboarding._id})`);

    const obStep1 = new Step({
      workflow_id: savedOnboarding._id,
      name: 'IT Equipment Provisioning',
      step_type: 'task',
      order: 1,
      metadata: { department: 'IT' }
    });

    const obStep2 = new Step({
      workflow_id: savedOnboarding._id,
      name: 'HR Orientation Schedule',
      step_type: 'notification',
      order: 2,
      metadata: { action: 'email_invite' }
    });
    
    await Promise.all([obStep1.save(), obStep2.save()]);
    
    savedOnboarding.start_step_id = obStep1._id;
    await savedOnboarding.save();
    
    // Rule for Onboarding
    const obRule1 = new Rule({
      step_id: obStep1._id,
      condition: "requiresLaptop == true",
      next_step_id: obStep2._id,
      priority: 10
    });
    
    const obRule2 = new Rule({
      step_id: obStep1._id,
      condition: "DEFAULT",
      next_step_id: obStep2._id,
      priority: 100
    });
    
    await Promise.all([obRule1.save(), obRule2.save()]);
    console.log('Created Rules for Employee Onboarding.');

    console.log('Database seeded successfully!');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seedDatabase();
