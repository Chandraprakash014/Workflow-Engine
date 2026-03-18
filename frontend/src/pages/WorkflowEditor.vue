<template>
  <div class="editor-container" v-if="workflow">
    <header class="editor-header">
      <h2>Edit Workflow: {{ workflow.name }}</h2>
      <button @click="$router.push('/')" class="btn btn-secondary">Back to Dashboard</button>
    </header>

    <div class="form-section">
      <h3>Workflow Details</h3>
      <div class="form-group">
        <label>Name</label>
        <input v-model="workflow.name" type="text" />
      </div>

      <div class="form-group">
        <label>Start Step</label>
        <select v-model="workflow.start_step_id">
          <option :value="null">-- Select Start Step --</option>
          <option v-for="step in steps" :key="step._id" :value="step._id">
            {{ step.name }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>Input Schema</label>
        <div class="schema-editor">
          <div v-if="schemaFields.length === 0" class="empty-schema">
            No fields in input schema.
          </div>
          <div v-for="(field, index) in schemaFields" :key="index" class="schema-field">
            <div class="field-inputs">
              <input v-model="field.key" placeholder="Field Name" class="field-key" />
              <select v-model="field.type" class="field-type">
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
              </select>
              <label class="field-req"><input type="checkbox" v-model="field.required" /> Required</label>
              <input v-model="field.allowedValues" placeholder="Allowed Values (csv)" class="field-vals" />
            </div>
            <button @click="removeField(index)" class="btn btn-sm btn-del inline-del">Remove</button>
          </div>
          <button @click="addField" class="btn btn-sm btn-secondary mt-2">+ Add Field</button>
        </div>
      </div>
      <button @click="saveWorkflow" class="btn btn-primary">Save Workflow Details</button>
    </div>

    <div class="steps-section">
      <div class="steps-header">
        <h3>Steps</h3>
        <button @click="openStepModal()" class="btn btn-success">+ Add Step</button>
      </div>
      
      <div v-if="steps.length === 0" class="empty-state">
        No steps added yet.
      </div>
      
      <div class="step-list" v-else>
        <div class="step-item" v-for="step in sortedSteps" :key="step._id">
          <div class="step-info">
            <span class="step-order">{{ step.order }}</span>
            <div class="step-text">
              <strong>{{ step.name }}</strong>
              <span class="step-type">{{ step.step_type }}</span>
            </div>
          </div>
          <div class="step-actions">
            <button @click="$router.push(`/step/${step._id}/rules`)" class="btn btn-sm btn-info">Manage Rules</button>
            <button @click="openStepModal(step)" class="btn btn-sm btn-edit">Edit</button>
            <button @click="deleteStep(step._id)" class="btn btn-sm btn-del">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Step Modal -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <h3>{{ editingStep._id ? 'Edit' : 'Add' }} Step</h3>
        
        <div class="form-group">
          <label>Name</label>
          <input v-model="editingStep.name" type="text" />
        </div>
        
        <div class="form-group">
          <label>Type</label>
          <select v-model="editingStep.step_type">
            <option value="task">Task</option>
            <option value="approval">Approval</option>
            <option value="notification">Notification</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Order</label>
          <input v-model.number="editingStep.order" type="number" />
        </div>
        
        <div class="form-group">
          <label>Metadata (JSON)</label>
          <textarea v-model="metadataJson" rows="4"></textarea>
        </div>
        
        <div class="modal-actions">
          <button @click="saveStep" class="btn btn-primary">Save Step</button>
          <button @click="closeModal" class="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="loading">Loading workflow...</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const workflowId = route.params.id

const workflow = ref(null)
const steps = ref([])

// Input Schema state
const schemaFields = ref([])

const showModal = ref(false)
const editingStep = ref(null)
const metadataJson = ref('{}')

const parseInputSchema = (schema) => {
  if (!schema) return []
  return Object.entries(schema).map(([key, val]) => {
    if (typeof val === 'string') {
      return { key, type: val, required: false, allowedValues: '' }
    }
    return {
      key,
      type: val.type || 'string',
      required: !!val.required,
      allowedValues: Array.isArray(val.allowed_values) ? val.allowed_values.join(', ') : ''
    }
  })
}

const buildInputSchemaPayload = () => {
  const schema = {}
  schemaFields.value.forEach(field => {
    const k = field.key.trim()
    if (k) {
      const allowed = field.allowedValues.split(',').map(s => s.trim()).filter(Boolean)
      if (field.required || allowed.length > 0) {
        schema[k] = {
          type: field.type,
          required: field.required
        }
        if (allowed.length > 0) schema[k].allowed_values = allowed
      } else {
        schema[k] = field.type
      }
    }
  })
  return schema
}

const addField = () => {
  schemaFields.value.push({ key: '', type: 'string', required: false, allowedValues: '' })
}
const removeField = (idx) => {
  schemaFields.value.splice(idx, 1)
}

const fetchWorkflow = async () => {
  try {
    const res = await fetch(`/api/workflows/${workflowId}`)
    if (res.ok) {
      workflow.value = await res.json()
      schemaFields.value = parseInputSchema(workflow.value.input_schema)
    }
  } catch (error) {
    console.error('Failed to fetch workflow', error)
  }
}

const fetchSteps = async () => {
  try {
    const res = await fetch(`/api/workflows/${workflowId}/steps`)
    if (res.ok) {
      steps.value = await res.json()
    }
  } catch (error) {
    console.error('Failed to fetch steps', error)
  }
}

const sortedSteps = computed(() => {
  return [...steps.value].sort((a, b) => a.order - b.order)
})

const saveWorkflow = async () => {
  try {
    const schemaPayload = buildInputSchemaPayload()
    const payload = { 
      ...workflow.value, 
      input_schema: schemaPayload 
    }
    const res = await fetch(`/api/workflows/${workflowId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (res.ok) {
      alert('Workflow saved successfully!')
      fetchWorkflow()
    } else {
      alert('Failed to save.')
    }
  } catch (e) {
    console.error(e)
    alert('Failed to save workflow.')
  }
}

const openStepModal = (step = null) => {
  if (step) {
    editingStep.value = { ...step }
    metadataJson.value = JSON.stringify(step.metadata || {}, null, 2)
  } else {
    editingStep.value = { 
      name: '', 
      step_type: 'task', 
      order: steps.value.length + 1, 
      workflow_id: workflowId 
    }
    metadataJson.value = '{}'
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingStep.value = null
}

const saveStep = async () => {
  try {
    const payload = {
      ...editingStep.value,
      metadata: JSON.parse(metadataJson.value)
    }
    
    // Determine if updating or creating
    const isUpdate = !!payload._id
    const url = isUpdate ? `/api/workflows/steps/${payload._id}` : `/api/workflows/${workflowId}/steps`
    const method = isUpdate ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    if (res.ok) {
      closeModal()
      fetchSteps()
    } else {
      const data = await res.json()
      alert('Error: ' + data.message)
    }
  } catch (e) {
    alert('Invalid JSON data or network error.')
  }
}

const deleteStep = async (stepId) => {
  if (!confirm('Delete this step?')) return
  try {
    const res = await fetch(`/api/workflows/steps/${stepId}`, { method: 'DELETE' })
    if (res.ok) {
      fetchSteps()
    }
  } catch (error) {
    console.error(error)
  }
}

onMounted(() => {
  fetchWorkflow()
  fetchSteps()
})
</script>

<style scoped>
.editor-container {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #eee;
  padding-bottom: 1rem;
  margin-bottom: 2rem;
}
.form-section, .steps-section {
  margin-bottom: 3rem;
}
.form-group {
  margin-bottom: 1.5rem;
}
.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #34495e;
}
.form-group input, .form-group textarea, .form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-family: inherit;
}

/* Schema Editor Styles */
.schema-editor {
  border: 1px solid #e1e8ed;
  border-radius: 6px;
  padding: 1rem;
  background: #fdfdfd;
}
.empty-schema {
  color: #7f8c8d;
  font-style: italic;
  margin-bottom: 1rem;
}
.schema-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px dotted #e1e8ed;
}
.schema-field:last-child {
  border-bottom: none;
}
.field-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}
.field-key {
  flex: 2;
}
.field-type {
  flex: 1;
}
.field-req {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-weight: normal !important;
  color: #2c3e50 !important;
  margin: 0 !important;
  font-size: 0.9rem;
}
.field-req input {
  width: auto !important;
}
.field-vals {
  flex: 2;
}
.inline-del {
  flex-shrink: 0;
}
.mt-2 {
  margin-top: 0.5rem;
}

.steps-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.step-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #eee;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  background: #fdfdfd;
}
.step-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.step-order {
  background: #34495e;
  color: white;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: bold;
}
.step-type {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.2rem 0.5rem;
  background: #ecf0f1;
  color: #7f8c8d;
  font-size: 0.8rem;
  border-radius: 12px;
  text-transform: uppercase;
}
.step-actions {
  display: flex;
  gap: 0.5rem;
}
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
}
.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}
.btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}
.btn-sm { padding: 0.3rem 0.6rem; font-size: 0.85rem; }
.btn-primary { background: #3498db; color: white; }
.btn-secondary { background: #95a5a6; color: white; }
.btn-success { background: #2ecc71; color: white; }
.btn-info { background: #9b59b6; color: white; }
.btn-edit { background: #f39c12; color: white; }
.btn-del { background: #e74c3c; color: white; }
</style>
