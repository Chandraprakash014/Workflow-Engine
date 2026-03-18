const Workflow = require("../models/Workflow");
const Step = require("../models/Step");
const Rule = require("../models/Rule");
const Execution = require("../models/Execution");
const { determineNextStep } = require("./ruleEngine");

async function executeStep(step, execution) {

    console.log(`Executing step: ${step.name} (${step.step_type})`);

    const logEntry = {
        step_name: step.name,
        step_type: step.step_type,
        status: "completed",
        started_at: new Date()
    };

    switch (step.step_type) {

        case "task":
            console.log(`[TASK] Executing task step`);
            break;

        case "approval":
            console.log(`[APPROVAL] Waiting for approval`);
            // we do not complete approvals immediately
            break;

        case "notification":
            console.log(`[NOTIFICATION] Sending notification`);
            break;

        default:
            console.log(`Unknown step type: ${step.step_type}`);
            logEntry.status = "failed";
    }

    return logEntry;
}

async function runExecutionLoop(workflow, execution, context, startStepId) {

    try {

        let currentStepId = startStepId;

        while (currentStepId) {

            const currentExecution = await Execution.findById(execution._id);

            if (currentExecution.status === "canceled") {
                console.log(`Execution canceled`);
                return { status: "canceled", executionId: execution._id };
            }

            const step = await Step.findById(currentStepId);

            if (!step) {
                execution.status = "failed";
                execution.logs.push({
                   step_name: "Unknown",
                   step_type: "task",
                   status: "failed",
                   error_message: `Step ${currentStepId} not found`,
                   started_at: new Date(),
                   ended_at: new Date()
                });
                break;
            }

            if (!context.visitCounts) context.visitCounts = {};
            context.visitCounts[currentStepId] = (context.visitCounts[currentStepId] || 0) + 1;
            
            const maxIterations = parseInt(process.env.MAX_WORKFLOW_ITERATIONS) || 100;
            if (context.visitCounts[currentStepId] > maxIterations) {
                execution.status = "failed";
                execution.logs.push({
                   step_name: step.name,
                   step_type: step.step_type,
                   status: "failed",
                   error_message: `Infinite loop detected: Step ${currentStepId} executed more than ${maxIterations} times.`,
                   started_at: new Date(),
                   ended_at: new Date()
                });
                break;
            }

            execution.current_step_id = step._id;
            await execution.save();

            const logEntry = await executeStep(step, execution);
            
            if (step.step_type === "approval") {
                // If the step is an approval, we do not evaluate rules or proceed.
                // It stays "in_progress" and wait for external trigger.
                logEntry.status = "pending";
                execution.logs.push(logEntry);
                await execution.save();
                return {
                    status: "in_progress",
                    executionId: execution._id,
                    message: `Execution paused for approval at step ${step.name}`
                };
            }
            
            logEntry.ended_at = new Date();

            const rules = await Rule.find({ step_id: step._id });

            const { nextStepId, evaluatedRules } = determineNextStep(rules, context.initialData);
            
            logEntry.evaluated_rules = evaluatedRules;
            logEntry.selected_next_step = nextStepId;

            execution.logs.push(logEntry);

            currentStepId = nextStepId;
        }

        // if we naturally exited the loop because currentStepId is null
        if (execution.status === "in_progress" && !currentStepId) {
            execution.status = "completed";
            execution.current_step_id = null;
        }

    } catch (error) {

        console.error("Execution error:", error);

        execution.status = "failed";
        execution.logs.push({
            step_name: "Error",
            step_type: "task",
            status: "failed",
            error_message: `Engine error: ${error.message}`,
            started_at: new Date(),
            ended_at: new Date()
        });

    } finally {
        if(execution.status !== "in_progress"){
            execution.ended_at = new Date();
        }
        await execution.save();

        return {
            status: execution.status,
            executionId: execution._id
        };
    }
}

exports.execute = async (workflow, initialData = {}) => {

    console.log(`Starting workflow execution: ${workflow.name}`);

    const execution = new Execution({
        workflow_id: workflow._id,
        workflow_version: workflow.version,
        status: "in_progress",
        data: initialData,
        current_step_id: workflow.start_step_id
    });

    await execution.save();

    const context = { initialData };

    if (!workflow.start_step_id) {

        execution.status = "completed";
        execution.ended_at = new Date();

        await execution.save();

        return {
            status: "completed",
            message: "No start step defined",
            executionId: execution._id
        };
    }

    return await runExecutionLoop(
        workflow,
        execution,
        context,
        workflow.start_step_id
    );
};

exports.retryExecution = async (executionId) => {

    const execution = await Execution.findById(executionId);

    if (!execution) {
        throw new Error("Execution not found");
    }

    if (execution.status !== "failed" && execution.status !== "in_progress") {
        throw new Error(`Cannot retry/resume execution with status: ${execution.status}`);
    }

    const workflow = await Workflow.findById(execution.workflow_id);

    // Only increment retries if it actually failed, not if we're just resuming a paused workflow
    if(execution.status === "failed"){
        execution.retries = (execution.retries || 0) + 1;
    }
    
    execution.status = "in_progress";

    const context = { initialData: execution.data };

    return await runExecutionLoop(
        workflow,
        execution,
        context,
        execution.current_step_id
    );
};