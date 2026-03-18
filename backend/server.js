require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const workflowRoutes = require('./routes/workflowRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/workflows', workflowRoutes);

// Database connection
const connectDB = async () => {
    let mongoURI = process.env.MONGO_URI;
    
    if (!mongoURI || mongoURI.includes('xxxxx') || mongoURI.includes('127.0.0.1') || mongoURI.includes('localhost')) {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        mongoURI = mongoServer.getUri();
        console.log('Started MongoDB Memory Server');
    }

    mongoose.connect(mongoURI)
    .then(() => {
        console.log('MongoDB connected successfully');
        
        // Seed the database if it's empty
        (async () => {
            try {
                const Workflow = require('./models/Workflow');
                const Step = require('./models/Step');
                const Rule = require('./models/Rule');
                
                const count = await Workflow.countDocuments();
                if (count === 0) {
                    console.log('Database is empty. Seeding initial data...');
                    
                    const workflow = new Workflow({
                      name: 'Expense Approval',
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
                
                    savedWorkflow.start_step_id = s1._id;
                    await savedWorkflow.save();
                
                    const rule1 = new Rule({
                      step_id: s1._id,
                      condition: "amount > 100 && country == 'US' && priority == 'High'",
                      next_step_id: s2._id,
                      priority: 10
                    });
                
                    const rule2 = new Rule({
                      step_id: s1._id,
                      condition: "amount <= 100",
                      next_step_id: s3._id,
                      priority: 20
                    });
                
                    const rule3 = new Rule({
                      step_id: s1._id,
                      condition: "priority == 'Low' && country != 'US'",
                      next_step_id: s4._id,
                      priority: 30
                    });
                
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
                
                    console.log('Created Rules. Database seeded successfully!');
                }
            } catch (seedErr) {
                console.error('Error seeding database:', seedErr);
            }
        })();
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
    });
};

connectDB().catch(err => {
    console.error('Unhandled rejection in connectDB:', err);
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});