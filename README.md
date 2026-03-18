# Halleyx Workflow Automation Engine

A full-stack workflow automation system that allows users to design workflows, define conditional routing rules, execute processes dynamically, and track every step through execution logs.

The system evaluates logical rule conditions at runtime to determine the next step in a workflow, enabling automation of business processes such as approvals, notifications, and task execution.

## Project Overview

The Halleyx Workflow Automation Engine allows users to create and manage automated workflows.

A workflow is composed of multiple steps. Each step contains rules that determine which step should execute next based on input data.

When a workflow runs:
- Input data is provided.
- The engine starts at the workflow's start step.
- Rules are evaluated in priority order.
- The first matching rule determines the next step.
- The process continues until the workflow finishes.

Each workflow execution produces detailed logs so every decision made by the rule engine can be tracked.

## System Architecture

### Backend

Technologies used:
- Node.js
- Express.js
- MongoDB
- Mongoose

The backend handles:
- workflow management
- step management
- rule evaluation
- workflow execution
- execution logging

Core backend components:
- **Workflow Model** – stores workflow definitions
- **Step Model** – stores workflow steps
- **Rule Model** – stores routing conditions
- **Execution Model** – tracks runtime workflow executions
- **Rule Engine** – evaluates rule conditions dynamically
- **Executor Engine** – manages workflow execution flow

### Frontend

Technologies used:
- Vue.js 3
- Vite
- Vue Router

The frontend provides a dashboard where users can:
- view workflows
- execute workflows
- monitor execution logs
- manage workflow definitions

## Workflow Engine Logic

The workflow engine operates like a state machine.

Execution flow:
1. Start Workflow
2. Execute Step
3. Evaluate Rules
4. Select Next Step
5. Repeat until workflow completes

Rules are evaluated dynamically using the input data provided during execution.

Supported operators:
- `==`
- `!=`
- `<`
- `<=`
- `>`
- `>=`
- `&&`
- `||`

Supported string functions:
- `startsWith(field, value)`
- `contains(field, value)`
- `endsWith(field, value)`

Rules are evaluated in ascending priority order.
The first rule that returns true determines the next step.
A `DEFAULT` rule ensures the workflow continues if no other rule matches.

## Execution Logging

Each workflow execution creates an Execution record containing:
- workflow id
- execution status
- input data
- current step
- rule evaluation logs
- timestamps

Example execution log:
```json
{
  "step_name": "Manager Approval",
  "step_type": "approval",
  "evaluated_rules": [
    { "rule": "amount > 100 && country == 'US'", "result": true },
    { "rule": "amount <= 100", "result": false }
  ],
  "selected_next_step": "Finance Notification",
  "status": "completed",
  "started_at": "2026-02-18T10:00:00Z",
  "ended_at": "2026-02-18T10:00:03Z"
}
```
These logs allow full auditing of workflow decisions.

## Project Structure

```text
halleyx-workflow-engine
├── backend
│   ├── controllers
│   ├── engine
│   │   ├── executor.js
│   │   └── ruleEngine.js
│   ├── models
│   │   ├── Workflow.js
│   │   ├── Step.js
│   │   ├── Rule.js
│   │   └── Execution.js
│   ├── routes
│   │   └── workflowRoutes.js
│   └── server.js
└── frontend
    └── src
        ├── components
        │   └── WorkflowList.vue
        ├── pages
        │   ├── Dashboard.vue
        │   ├── WorkflowEditor.vue
        │   ├── RuleEditor.vue
        │   ├── ExecutionViewer.vue
        │   └── AuditLog.vue
        ├── App.vue
        └── main.js
```

## Setup Instructions

Prerequisites:
- Node.js v18 or higher
- MongoDB running locally or MongoDB Atlas

### Backend Setup
```bash
cd backend
npm install
```

Start the backend server:
```bash
node server.js
```
Backend server runs at: `http://localhost:5000`

### Frontend Setup
Open another terminal:
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at: `http://localhost:5173`

## REST API Endpoints

### Workflows
- `GET /api/workflows` – Retrieve all workflows
- `GET /api/workflows/:id` – Retrieve workflow details
- `POST /api/workflows` – Create new workflow
- `PUT /api/workflows/:id` – Update workflow
- `DELETE /api/workflows/:id` – Delete workflow

### Workflow Execution
- `POST /api/workflows/:id/execute` – Start workflow execution
- `GET /api/workflows/executions` – Retrieve execution audit log
- `GET /api/workflows/executions/:id` – Get execution details
- `POST /api/workflows/executions/:id/cancel` – Cancel execution
- `POST /api/workflows/executions/:id/retry` – Retry failed step

### Steps
- `GET /api/workflows/:workflowId/steps`
- `POST /api/workflows/:workflowId/steps`
- `PUT /api/steps/:id`
- `DELETE /api/steps/:id`

### Rules
- `GET /api/workflows/steps/:stepId/rules`
- `POST /api/workflows/steps/:stepId/rules`
- `PUT /api/workflows/rules/:id`
- `DELETE /api/workflows/rules/:id`

## Sample Workflow

The repository includes a seed script that creates an example workflow.

### Expense Approval Workflow

Input schema:
```json
{
  "amount": "number",
  "country": "string",
  "priority": "string"
}
```

Steps:
1. Manager Approval
2. Finance Notification
3. CEO Approval
4. Task Rejection

Rules for Manager Approval:
- **Priority 10**: condition: `amount > 100 && country == 'US' && priority == 'High'`, next step: Finance Notification
- **Priority 20**: condition: `amount <= 100`, next step: CEO Approval
- **Priority 30**: condition: `priority == 'Low' && country != 'US'`, next step: Task Rejection
- **Priority 100**: condition: `DEFAULT`, next step: Task Rejection

## Execution Example

Trigger workflow execution:
```bash
curl -X POST http://localhost:5000/api/workflows/<workflow_id>/execute \
-H "Content-Type: application/json" \
-d '{
  "initialData": {
    "amount": 1500,
    "country": "US",
    "priority": "High"
  }
}'
```

Example execution log:
```text
Execution initialized for workflow: Expense Approval
Proceeding to start step: Manager Approval
Executing step: Manager Approval
Rule matched → Finance Notification
Executing step: Finance Notification
Workflow execution completed successfully
```

## Demo Video

The demo video shows:
- Creating a workflow
- Adding steps and rules
- Executing the workflow
- Viewing execution logs

*(Demo video link can be added here.)*

## Future Improvements

Possible enhancements:
- Drag and drop workflow designer
- Parallel workflow execution
- Slack or email notifications
- Workflow scheduling
- Rule syntax validation
