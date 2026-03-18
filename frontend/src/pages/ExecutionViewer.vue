<template>
  <div class="execution-container" v-if="execution">
    <header class="execution-header">
      <h2>Execution Details</h2>
      <div class="header-actions">
        <button v-if="execution.status === 'in_progress'" @click="cancelExecution" class="btn btn-warning">Cancel Execution</button>
        <button v-if="execution.status === 'failed'" @click="retryExecution" class="btn btn-info">Retry from Failure</button>
        <button @click="$router.push('/')" class="btn btn-secondary">Back to Dashboard</button>
      </div>
    </header>

    <div class="status-panel">
      <div class="status-item">
        <strong>Status:</strong> 
        <span class="status-badge" :class="execution.status">{{ execution.status }}</span>
      </div>
      <div class="status-item">
        <strong>Workflow ID:</strong> 
        <span>{{ execution.workflow_id }}</span> (v{{ execution.workflow_version }})
      </div>
      <div class="status-item" v-if="execution.current_step_id">
        <strong>Current Step ID:</strong> 
        <code>{{ execution.current_step_id }}</code>
      </div>
      <div class="status-item">
        <strong>Duration:</strong> 
        <span>{{ durationStr }}</span>
      </div>
    </div>

    <div class="logs-section">
      <h3>Execution Logs</h3>
      <div class="log-window">
        <div v-if="!execution.logs || execution.logs.length === 0" class="empty-logs">
          No logs available for this execution.
        </div>
        <div v-else class="log-list">
          <div v-for="(log, idx) in execution.logs" :key="idx" class="log-entry" :class="log.status || 'info'">
            <span class="log-time">[{{ new Date(log.started_at || log.timestamp).toLocaleTimeString() }}]</span>
            <div class="log-content">
              <strong v-if="log.step_name">Step: {{ log.step_name }} ({{ log.step_type }}) - {{ log.status?.toUpperCase() }}</strong>
              <span v-else-if="log.message">{{ log.message }}</span>
              <div v-if="log.error_message" class="error-text">{{ log.error_message }}</div>
              <div v-if="log.evaluated_rules && log.evaluated_rules.length > 0" class="rules-text">
                Rules evaluated: {{ log.evaluated_rules.length }}
              </div>
              <div v-if="log.selected_next_step" class="next-step-text">
                Next Step ID: {{ log.selected_next_step }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="loading">Loading execution data...</div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const executionId = route.params.id

const execution = ref(null)
let pollInterval = null

const fetchExecution = async () => {
  try {
    const res = await fetch(`/api/workflows/executions/${executionId}`)
    if (res.ok) {
      execution.value = await res.json()
      
      // Stop polling if we reached a terminal state
      if (['completed', 'failed', 'canceled'].includes(execution.value.status)) {
         if (pollInterval) clearInterval(pollInterval)
      }
    }
  } catch (error) {
    console.error('Failed to fetch execution status', error)
  }
}

const cancelExecution = async () => {
  if (!confirm('Cancel this execution?')) return
  try {
    const res = await fetch(`/api/workflows/executions/${executionId}/cancel`, { method: 'POST' })
    if (res.ok) fetchExecution()
  } catch (e) {
    console.error(e)
  }
}

const retryExecution = async () => {
  try {
    const res = await fetch(`/api/workflows/executions/${executionId}/retry`, { method: 'POST' })
    if (res.ok) {
      // Resume polling
      pollInterval = setInterval(fetchExecution, 1000)
    }
  } catch (e) {
    console.error(e)
  }
}

const durationStr = computed(() => {
  if (!execution.value) return '0s'
  const start = new Date(execution.value.started_at)
  const end = execution.value.ended_at ? new Date(execution.value.ended_at) : new Date()
  const diff = Math.floor((end - start) / 1000)
  if (diff < 60) return `${diff}s`
  return `${Math.floor(diff / 60)}m ${diff % 60}s`
})

onMounted(() => {
  fetchExecution()
  // Poll for updates every second initially
  pollInterval = setInterval(fetchExecution, 1000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<style scoped>
.execution-container {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  max-width: 900px;
  margin: 0 auto;
}
.execution-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #eee;
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
}
.header-actions {
  display: flex;
  gap: 0.5rem;
}
.status-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 6px;
  margin-bottom: 2rem;
  border-left: 4px solid #3498db;
}
.status-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.95rem;
}
.status-badge {
  display: inline-block;
  padding: 0.3rem 0.6rem;
  border-radius: 12px;
  text-transform: uppercase;
  font-size: 0.8rem;
  font-weight: bold;
  max-width: fit-content;
}
.status-badge.completed { background: #e6f4ea; color: #137333; }
.status-badge.failed { background: #fce8e6; color: #c5221f; }
.status-badge.canceled { background: #f1f3f4; color: #5f6368; }
.status-badge.in_progress { background: #e8f0fe; color: #1967d2; }
.status-badge.pending { background: #fef7e0; color: #b06000; }

.logs-section h3 {
  margin-bottom: 1rem;
}
.log-window {
  background: #1e1e1e;
  border-radius: 6px;
  padding: 1rem;
  height: 400px;
  overflow-y: auto;
  font-family: 'Courier New', Courier, monospace;
}
.empty-logs {
  color: #888;
  font-style: italic;
  text-align: center;
  margin-top: 2rem;
}
.log-entry {
  margin-bottom: 0.5rem;
  line-height: 1.4;
  border-bottom: 1px solid #333;
  padding-bottom: 0.25rem;
}
.log-time {
  color: #569cd6;
  margin-right: 0.75rem;
  font-size: 0.85rem;
}
.log-msg {
  color: #d4d4d4;
  word-break: break-all;
}
.log-entry.error .log-msg {
  color: #f44336;
}
.log-content {
  display: inline-block;
  vertical-align: top;
}
.error-text {
  color: #ff5252;
  margin-top: 4px;
}
.rules-text {
  color: #81c784;
  font-size: 0.9em;
  margin-top: 2px;
}
.next-step-text {
  color: #64b5f6;
  font-size: 0.9em;
  margin-top: 2px;
}
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
}
.btn-secondary { background: #95a5a6; color: white; }
.btn-warning { background: #f1c40f; color: #2c3e50; }
.btn-info { background: #3498db; color: white; }
</style>
