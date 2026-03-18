<template>
  <div class="editor-container">
    <header class="editor-header">
      <h2>Manage Rules for Step</h2>
      <button @click="$router.back()" class="btn btn-secondary">Back to Workflow</button>
    </header>

    <div class="rules-section">
      <div class="rules-header">
        <h3>Routing Rules</h3>
        <button @click="openRuleModal()" class="btn btn-success">+ Add Rule</button>
      </div>
      
      <div v-if="rules.length === 0" class="empty-state">
        No rules defined. (Execution will stop after this step unless a rule routes to a next step).
      </div>
      
      <div class="rule-list" v-else>
        <div class="rule-item" 
             v-for="(rule, index) in sortedRules" 
             :key="rule._id"
             draggable="true"
             @dragstart="onDragStart($event, index)"
             @dragenter.prevent="onDragEnter($event, index)"
             @dragover.prevent
             @dragend="onDragEnd"
             :class="{ 'drop-target': dropTargetIndex === index, 'dragging': draggedIndex === index }">
             
          <div class="rule-info">
            <div class="drag-handle" title="Drag to reorder">☰</div>
            <span class="rule-priority" title="Priority">{{ rule.priority }}</span>
            <div class="rule-text">
              <strong class="condition-badge">IF</strong>
              <code class="condition-code">{{ rule.condition }}</code>
              <strong class="condition-badge">THEN GOTO -></strong>
              <span class="next-step-badge">{{ getNextStepName(rule.next_step_id) }}</span>
            </div>
          </div>
          <div class="rule-actions">
            <button @click="openRuleModal(rule)" class="btn btn-sm btn-edit">Edit</button>
            <button @click="deleteRule(rule._id)" class="btn btn-sm btn-del">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Rule Modal -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <h3>{{ editingRule._id ? 'Edit' : 'Add' }} Rule</h3>
        
        <div class="form-group">
          <label>Condition</label>
          <input v-model="editingRule.condition" type="text" placeholder="e.g. data.amount > 1000 or DEFAULT" />
          <small>Use 'DEFAULT' as a fallback rule.</small>
        </div>
        
        <div class="form-group">
          <label>Next Step</label>
          <select v-model="editingRule.next_step_id">
            <option :value="null">-- Select Next Step -- (End of Workflow)</option>
            <option v-for="step in workflowSteps" :key="step._id" :value="step._id">
              {{ step.name }}
            </option>
          </select>
        </div>
        
        <div class="modal-actions">
          <button @click="saveRule" class="btn btn-primary">Save Rule</button>
          <button @click="closeModal" class="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const stepId = route.params.id

const rules = ref([])
const workflowSteps = ref([])
const showModal = ref(false)
const editingRule = ref(null)

// Drag and drop state
const draggedIndex = ref(null)
const dropTargetIndex = ref(null)

const onDragStart = (e, index) => {
  draggedIndex.value = index
  e.dataTransfer.effectAllowed = 'move'
}

const onDragEnter = (e, index) => {
  if (draggedIndex.value !== null && draggedIndex.value !== index) {
    dropTargetIndex.value = index
  }
}

const onDragEnd = async () => {
  if (draggedIndex.value !== null && dropTargetIndex.value !== null && draggedIndex.value !== dropTargetIndex.value) {
    // Determine new order
    const currentRules = [...sortedRules.value]
    const [movedItem] = currentRules.splice(draggedIndex.value, 1)
    currentRules.splice(dropTargetIndex.value, 0, movedItem)
    
    // Assign new priorities sequentially
    const updatedRules = currentRules.map((r, i) => ({ ...r, priority: (i + 1) * 10 }))
    
    // Update local state immediately
    rules.value = updatedRules
    
    // Persist changes to server
    const promises = updatedRules.map(r => 
      fetch(`/api/workflows/rules/${r._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r)
      })
    )
    
    try {
      await Promise.all(promises)
      await fetchRules() // Ensure everything is in sync
    } catch (e) {
      console.error('Failed to save new rule priorities', e)
    }
  }
  
  draggedIndex.value = null
  dropTargetIndex.value = null
}


const fetchRules = async () => {
  try {
    const res = await fetch(`/api/workflows/steps/${stepId}/rules`)
    if (res.ok) {
      rules.value = await res.json()
    }
  } catch (error) {
    console.error('Failed to fetch rules', error)
  }
}

const getNextStepName = (id) => {
  const step = workflowSteps.value.find(s => s._id === id)
  return step ? step.name : id
}

const fetchStepAndWorkflowSteps = async () => {
  try {
    const stepRes = await fetch(`/api/workflows/steps/${stepId}`)
    if (stepRes.ok) {
      const stepData = await stepRes.json()
      const workflowId = stepData.workflow_id
      
      const stepsRes = await fetch(`/api/workflows/${workflowId}/steps`)
      if (stepsRes.ok) {
        workflowSteps.value = await stepsRes.json()
      }
    }
  } catch (error) {
    console.error('Failed to fetch workflow steps', error)
  }
}

const sortedRules = computed(() => {
  return [...rules.value].sort((a, b) => (a.priority || 0) - (b.priority || 0))
})

const openRuleModal = (rule = null) => {
  if (rule) {
    editingRule.value = { ...rule }
  } else {
    editingRule.value = { 
      condition: 'DEFAULT', 
      next_step_id: null, 
      priority: (rules.value.length || 0) * 10 + 10,
      step_id: stepId 
    }
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingRule.value = null
}

const saveRule = async () => {
  try {
    const isUpdate = !!editingRule.value._id
    const url = isUpdate ? `/api/workflows/rules/${editingRule.value._id}` : `/api/workflows/steps/${stepId}/rules`
    const method = isUpdate ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingRule.value)
    })
    
    if (res.ok) {
      closeModal()
      fetchRules()
    } else {
      const data = await res.json()
      alert('Error: ' + data.message)
    }
  } catch (e) {
    alert('Network error while saving rule.')
  }
}

const deleteRule = async (ruleId) => {
  if (!confirm('Delete this rule?')) return
  try {
    const res = await fetch(`/api/workflows/rules/${ruleId}`, { method: 'DELETE' })
    if (res.ok) {
      fetchRules()
    }
  } catch (error) {
    console.error(error)
  }
}

onMounted(() => {
  fetchRules()
  fetchStepAndWorkflowSteps()
})
</script>

<style scoped>
.editor-container {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  max-width: 900px;
  margin: 0 auto;
}
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #eee;
  padding-bottom: 1rem;
  margin-bottom: 2rem;
}
.rules-section {
  margin-bottom: 3rem;
}
.rules-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
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
.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}
.form-group small {
  color: #7f8c8d;
  display: block;
  margin-top: 0.25rem;
}
.rule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e1e8ed;
  border-left: 4px solid #3498db;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  background: #fcfcfc;
  transition: all 0.2s;
}
.rule-item.dragging {
  opacity: 0.5;
}
.rule-item.drop-target {
  border-top: 2px solid #3498db;
  margin-top: 0.75rem;
}
.drag-handle {
  cursor: grab;
  font-size: 1.2rem;
  color: #bdc3c7;
  user-select: none;
}
.drag-handle:active {
  cursor: grabbing;
}
.rule-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.rule-priority {
  background: #ecf0f1;
  color: #2c3e50;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: bold;
  font-size: 0.9rem;
}
.rule-text {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.condition-badge {
  color: #7f8c8d;
  font-size: 0.8rem;
}
.condition-code {
  background: #f4f6f7;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-family: monospace;
  color: #e74c3c;
  font-weight: bold;
}
.next-step-badge {
  background: #2ecc71;
  color: white;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-family: monospace;
}
.rule-actions {
  display: flex;
  gap: 0.5rem;
}
.empty-state {
  text-align: center;
  padding: 2rem;
  color: #888;
  background: #f9f9f9;
  border-radius: 8px;
  border: 2px dashed #ddd;
}
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
.btn-edit { background: #f39c12; color: white; }
.btn-del { background: #e74c3c; color: white; }
</style>
