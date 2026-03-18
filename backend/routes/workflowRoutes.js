const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflowController');
const stepController = require('../controllers/stepController');
const ruleController = require('../controllers/ruleController');

// Get all workflows
router.get('/', workflowController.getAllWorkflows);

// GET all executions
router.get('/executions', workflowController.getAllExecutions);

// GET execution status by ID
router.get('/executions/:id', workflowController.getExecutionStatus);

// Cancel execution
router.post('/executions/:id/cancel', workflowController.cancelExecution);

// Retry execution
router.post('/executions/:id/retry', workflowController.retryExecution);

// Get single workflow
router.get('/:id', workflowController.getWorkflowById);

// Create new workflow
router.post('/', workflowController.createWorkflow);

// Update workflow
router.put('/:id', workflowController.updateWorkflow);

// Delete workflow
router.delete('/:id', workflowController.deleteWorkflow);

// Execute workflow
router.post('/:id/execute', workflowController.executeWorkflow);

// Step management routes nested within workflow
router.get('/:workflowId/steps', stepController.getStepsByWorkflow);
router.post('/:workflowId/steps', stepController.createStep);

// Specific step routes
router.get('/steps/:id', stepController.getStepById);
router.put('/steps/:id', stepController.updateStep);
router.delete('/steps/:id', stepController.deleteStep);

// Rule management routes relative to steps
router.get('/steps/:stepId/rules', ruleController.getRulesByStep);
router.post('/steps/:stepId/rules', ruleController.createRule);

// Specific rule routes
router.put('/rules/:id', ruleController.updateRule);
router.delete('/rules/:id', ruleController.deleteRule);

module.exports = router;
