<template>
  <div class="audit-container">
    <header class="audit-header">
      <h2>Execution Audit Log</h2>
      <button @click="$router.push('/')" class="btn btn-secondary">Back to Dashboard</button>
    </header>

    <div class="table-wrapper">
      <div v-if="loading" class="state-message">Loading audit logs...</div>
      <div v-else-if="executions.length === 0" class="state-message empty">
        No executions found.
      </div>
      
      <table v-else class="audit-table">
        <thead>
          <tr>
            <th>Execution ID</th>
            <th>Workflow</th>
            <th>Status</th>
            <th>Started By</th>
            <th>Start Time</th>
            <th>End Time</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ex in executions" :key="ex._id">
            <td class="cell-id" :title="ex._id">{{ truncateId(ex._id) }}</td>
            <td>
              <span class="workflow-name" v-if="ex.workflow_id && typeof ex.workflow_id === 'object'">
                 {{ ex.workflow_id.name }}
              </span>
              <span v-else>{{ truncateId(ex.workflow_id) }}</span>
              <span class="muted-text"> v{{ ex.workflow_version }}</span>
            </td>
            <td>
              <span class="status-badge" :class="ex.status">{{ ex.status }}</span>
            </td>
            <td>{{ ex.triggered_by || 'Auto' }}</td>
            <td class="cell-time">{{ formatDate(ex.started_at) }}</td>
            <td class="cell-time">{{ ex.ended_at ? formatDate(ex.ended_at) : '--' }}</td>
            <td>
              <button @click="$router.push(`/execution/${ex._id}`)" class="btn btn-sm btn-info">View Logs</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const executions = ref([])
const loading = ref(true)

const fetchExecutions = async () => {
  try {
    loading.value = true
    const res = await fetch('/api/workflows/executions')
    if (res.ok) {
      executions.value = await res.json()
    }
  } catch (error) {
    console.error('Failed to fetch executions', error)
  } finally {
    loading.value = false
  }
}

const truncateId = (id) => {
  if (!id) return ''
  return id.substring(id.length - 6)
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString()
}

onMounted(() => {
  fetchExecutions()
})
</script>

<style scoped>
.audit-container {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  max-width: 1200px;
  margin: 0 auto;
}
.audit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #eee;
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
}
.table-wrapper {
  overflow-x: auto;
}
.audit-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
  text-align: left;
}
.audit-table th, .audit-table td {
  padding: 1rem;
  border-bottom: 1px solid #eee;
}
.audit-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 0.5px;
}
.audit-table tbody tr:hover {
  background: #fdfdfd;
}
.cell-id {
  font-family: monospace;
  color: #7f8c8d;
}
.workflow-name {
  font-weight: 600;
  color: #2c3e50;
}
.muted-text {
  color: #95a5a6;
  font-size: 0.85em;
}
.cell-time {
  color: #555;
  font-size: 0.9rem;
}
.status-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  text-transform: uppercase;
  font-size: 0.75rem;
  font-weight: bold;
}
.status-badge.completed { background: #e6f4ea; color: #137333; }
.status-badge.failed { background: #fce8e6; color: #c5221f; }
.status-badge.canceled { background: #f1f3f4; color: #5f6368; }
.status-badge.in_progress { background: #e8f0fe; color: #1967d2; }
.status-badge.pending { background: #fef7e0; color: #b06000; }

.state-message {
  padding: 3rem;
  text-align: center;
  color: #888;
}
.state-message.empty {
  background: #f9f9f9;
  border: 2px dashed #eee;
  border-radius: 8px;
}
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}
.btn-sm { padding: 0.4rem 0.8rem; font-size: 0.85rem; }
.btn-secondary { background: #95a5a6; color: white; }
.btn-info { background: #3498db; color: white; }
.btn-info:hover { background: #2980b9; }
</style>
