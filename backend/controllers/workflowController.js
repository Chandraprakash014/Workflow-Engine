const Workflow = require('../models/Workflow');
const Execution = require('../models/Execution');
const { execute, retryExecution } = require('../engine/executor');

exports.getAllWorkflows = async (req, res) => {
    try {
        const workflows = await Workflow.find();
        res.status(200).json(workflows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getWorkflowById = async (req, res) => {
    try {
        const workflow = await Workflow.findById(req.params.id);
        if (!workflow) return res.status(404).json({ message: 'Workflow not found' });
        res.status(200).json(workflow);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createWorkflow = async (req, res) => {
    try {
        const workflow = new Workflow(req.body);
        const savedWorkflow = await workflow.save();
        res.status(201).json(savedWorkflow);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateWorkflow = async (req, res) => {
    try {
        const updatedWorkflow = await Workflow.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );
        if (!updatedWorkflow) return res.status(404).json({ message: 'Workflow not found' });
        res.status(200).json(updatedWorkflow);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteWorkflow = async (req, res) => {
    try {
        const deletedWorkflow = await Workflow.findByIdAndDelete(req.params.id);
        if (!deletedWorkflow) return res.status(404).json({ message: 'Workflow not found' });
        res.status(200).json({ message: 'Workflow deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.executeWorkflow = async (req, res) => {
    try {
        const workflow = await Workflow.findById(req.params.id);
        if (!workflow) return res.status(404).json({ message: 'Workflow not found' });
        
        // Validate input schema
        const initialData = req.body.initialData || {};
        if (workflow.input_schema) {
            const schema = workflow.input_schema;
            for (const [key, rules] of Object.entries(schema)) {
                // If the old format was just a string, convert it format
                const rulesObj = typeof rules === 'object' ? rules : { type: rules };
                const val = initialData[key];
                
                if (rulesObj.required && (val === undefined || val === null || val === '')) {
                    return res.status(400).json({ message: `Missing required input field: ${key}` });
                }
                
                if (val !== undefined && val !== null && val !== '') {
                    if (rulesObj.type && typeof val !== rulesObj.type) {
                        return res.status(400).json({ message: `Invalid type for ${key}. Expected ${rulesObj.type}, got ${typeof val}` });
                    }
                    if (rulesObj.allowed_values && Array.isArray(rulesObj.allowed_values) && rulesObj.allowed_values.length > 0) {
                        if (!rulesObj.allowed_values.includes(val)) {
                            return res.status(400).json({ message: `Invalid value for ${key}. Allowed values: ${rulesObj.allowed_values.join(', ')}` });
                        }
                    }
                }
            }
        }
        
        const resultPromise = execute(workflow, initialData);
        
        // Wait just enough to grab the initialized executionId, or just let executor.js return execution object.
        // Wait, executor execute() saves execution immediately, we can await it if we want the full result, 
        // but typically execution is async. For simplicity we will await the entire execution here.
        const result = await resultPromise;
        const executionId = result.executionId || result._id || result;
        
        res.status(200).json({ message: 'Workflow execution triggered', result: { executionId } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAllExecutions = async (req, res) => {
    try {
        const executions = await Execution.find()
            .sort({ started_at: -1 })
            .populate('workflow_id', 'name'); // optionally get workflow name if needed
        res.status(200).json(executions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getExecutionStatus = async (req, res) => {
    try {
        const execution = await Execution.findById(req.params.id);
        if (!execution) return res.status(404).json({ message: 'Execution not found' });
        
        res.status(200).json({
            id: execution._id,
            workflow_id: execution.workflow_id,
            workflow_version: execution.workflow_version,
            status: execution.status,
            current_step_id: execution.current_step_id,
            logs: execution.logs,
            retries: execution.retries,
            started_at: execution.started_at,
            ended_at: execution.ended_at
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.cancelExecution = async (req, res) => {
    try {
        const execution = await Execution.findById(req.params.id);
        if (!execution) return res.status(404).json({ message: 'Execution not found' });
        
        if (['completed', 'failed', 'canceled'].includes(execution.status)) {
            return res.status(400).json({ message: `Cannot cancel an execution with status: ${execution.status}` });
        }
        
        execution.status = 'canceled';
        execution.ended_at = new Date();
        execution.logs.push({ timestamp: new Date(), message: 'Execution canceled by user' });
        await execution.save();
        
        res.status(200).json({ message: 'Execution canceled successfully', execution });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.retryExecution = async (req, res) => {
    try {
        // We trigger the retry asynchronously OR await it
        const result = await retryExecution(req.params.id);
        res.status(200).json({ message: 'Execution retry triggered', result });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
