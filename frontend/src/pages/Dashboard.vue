<template>
  <div class="dashboard">
    <h2>Dashboard</h2>
    <div class="dashboard-actions">
      <button @click="createNew" class="btn btn-primary">Create New Workflow</button>
    </div>
    
    <div class="content">
      <WorkflowList :workflows="workflows" @refresh="fetchWorkflows" @execute="openExecuteModal" @edit="editWorkflow" />
    </div>

    <!-- Execution Modal -->
    <div v-if="showExecuteModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Execute Workflow: {{ selectedWorkflow?.name }}</h3>
        
        <div v-if="Object.keys(parsedSchema).length === 0" class="empty-state">
           This workflow doesn't require any inputs. Click Run Execution to start.
        </div>
        
        <div v-else class="schema-form">
          <div v-for="(rules, key) in parsedSchema" :key="key" class="form-group">
            <label>
              {{ key }} 
              <span v-if="rules.required" class="req-star">*</span>
              <span class="type-badge">({{ rules.type }})</span>
            </label>
            
            <!-- Generate input based on type and allowed_values -->
            <select v-if="rules.allowed_values && rules.allowed_values.length" v-model="executionData[key]" class="form-control">
               <option value="">Select {{ key }}...</option>
               <option v-for="val in rules.allowed_values" :key="val" :value="val">{{ val }}</option>
            </select>
            
            <input v-else-if="rules.type === 'number'" type="number" v-model.number="executionData[key]" class="form-control" placeholder="Enter number..." />
            
            <div v-else-if="rules.type === 'boolean'" class="checkbox-wrapper">
              <input type="checkbox" v-model="executionData[key]" />
            </div>
            
            <input v-else type="text" v-model="executionData[key]" class="form-control" placeholder="Enter string..." />
          </div>
        </div>

        <div class="modal-actions">
          <button @click="confirmExecute" class="btn btn-exec" :disabled="isExecuting">
            {{ isExecuting ? 'Running...' : 'Run Execution' }}
          </button>
          <button @click="closeExecuteModal" class="btn btn-secondary" :disabled="isExecuting">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import WorkflowList from '../components/WorkflowList.vue'

const workflows = ref([])
const router = useRouter()

// Execution Modal State
const showExecuteModal = ref(false)
const selectedWorkflow = ref(null)
const executionData = ref({})
const isExecuting = ref(false)

const fetchWorkflows = async () => {
  try {
    const res = await fetch('/api/workflows')
    if (res.ok) {
      workflows.value = await res.json()
    }
  } catch (error) {
    console.error('Error fetching workflows:', error)
  }
}

const createNew = async () => {
  const newWorkflow = {
    name: 'New Workflow ' + Math.floor(Math.random() * 1000),
    description: 'Auto-generated test workflow',
    status: 'draft',
    input_schema: {
      "initiatedBy": {
        type: "string",
        required: true
      }
    }
  }
  
  try {
    const res = await fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newWorkflow)
    })
    if (res.ok) {
      await fetchWorkflows()
    }
  } catch (error) {
    console.error('Error creating workflow:', error)
  }
}

const editWorkflow = (id) => {
  router.push(`/workflow/${id}`)
}

// Map the raw input_schema to a normalized format for the UI
const parsedSchema = computed(() => {
  const schema = selectedWorkflow.value?.input_schema || {}
  const parsed = {}
  for (const [key, val] of Object.entries(schema)) {
    if (typeof val === 'string') {
      parsed[key] = { type: val, required: false, allowed_values: [] }
    } else {
      parsed[key] = {
        type: val.type || 'string',
        required: !!val.required,
        allowed_values: Array.isArray(val.allowed_values) ? val.allowed_values : []
      }
    }
  }
  return parsed
})

const openExecuteModal = (id) => {
  const wf = workflows.value.find(w => w._id === id)
  if (wf) {
    selectedWorkflow.value = wf
    executionData.value = {}
    
    // Initialize properties
    for (const [key, rules] of Object.entries(parsedSchema.value)) {
      if (rules.type === 'boolean') {
        executionData.value[key] = false
      } else if (rules.type === 'number') {
        executionData.value[key] = null
      } else {
        executionData.value[key] = ''
      }
    }
    
    showExecuteModal.value = true
  }
}

const closeExecuteModal = () => {
  showExecuteModal.value = false
  selectedWorkflow.value = null
  executionData.value = {}
  isExecuting.value = false
}

const confirmExecute = async () => {
  // Validate required fields
  for (const [key, rules] of Object.entries(parsedSchema.value)) {
    const val = executionData.value[key]
    if (rules.required && (val === '' || val === null || val === undefined)) {
      alert(`Field "${key}" is required.`)
      return
    }
  }

  isExecuting.value = true
  try {
    const res = await fetch(`/api/workflows/${selectedWorkflow.value._id}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initialData: executionData.value })
    })
    const data = await res.json()
    
    if (res.ok && data.result && data.result.executionId) {
       closeExecuteModal()
       router.push(`/execution/${data.result.executionId}`)
    } else {
       alert(`Execution Result: ${data.message || JSON.stringify(data.errors || data)}`)
       isExecuting.value = false
    }
  } catch (error) {
    console.error('Error executing workflow:', error)
    alert('Execution failed due to network error.')
    isExecuting.value = false
  }
}

onMounted(() => {
  fetchWorkflows()
})
</script>

<style scoped>
.dashboard {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.dashboard-actions {
  margin-bottom: 1.5rem;
}
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}
.btn-primary {
  background-color: #42b983;
  color: white;
}
.btn-primary:hover {
  background-color: #3aa876;
}
.btn-exec {
  background: #3498db;
  color: white;
}
.btn-secondary {
  background: #95a5a6;
  color: white;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}
.schema-form {
  margin-top: 1.5rem;
}
.form-group {
  margin-bottom: 1rem;
}
.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #34495e;
}
.req-star {
  color: #e74c3c;
  margin-left: 0.2rem;
}
.type-badge {
  font-weight: normal;
  color: #7f8c8d;
  font-size: 0.85rem;
  margin-left: 0.5rem;
}
.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-family: inherit;
}
.checkbox-wrapper {
  padding: 0.5rem 0;
}
.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}
.empty-state {
  text-align: center;
  padding: 2rem;
  color: #7f8c8d;
  background: #f9f9f9;
  border-radius: 8px;
  margin-top: 1.5rem;
}
</style>
