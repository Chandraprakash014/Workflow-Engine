<template>
  <div class="workflow-list">
    <div class="list-controls">
      <input v-model="searchQuery" class="search-input" placeholder="Search workflows by name..." />
      <select v-model="filterStatus" class="filter-select">
        <option value="all">All Statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>

    <div v-if="paginatedWorkflows.length === 0" class="empty-state">
      No workflows match your criteria. Create one to get started!
    </div>
    
    <div v-else class="grid">
      <div v-for="w in paginatedWorkflows" :key="w._id" class="card">
        <h3>{{ w.name }}</h3>
        <div class="meta">
          <span class="status" :class="w.is_active ? 'active' : 'inactive'">{{ w.is_active ? 'Active' : 'Inactive' }}</span>
          <span class="task-count">Version {{ w.version }}</span>
        </div>
        <div class="actions">
          <button @click="$emit('execute', w._id)" class="btn btn-exec">Execute</button>
          <button @click="$emit('edit', w._id)" class="btn btn-edit">Edit</button>
          <button @click="deleteWorkflow(w._id)" class="btn btn-del">Delete</button>
        </div>
      </div>
    </div>

    <div class="pagination" v-if="totalPages > 1">
      <button @click="prevPage" :disabled="currentPage === 1" class="btn btn-sm btn-secondary">Prev</button>
      <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
      <button @click="nextPage" :disabled="currentPage === totalPages" class="btn btn-sm btn-secondary">Next</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  workflows: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['refresh', 'execute', 'edit'])

// Search, Filter, Pagination state
const searchQuery = ref('')
const filterStatus = ref('all')
const currentPage = ref(1)
const itemsPerPage = 6

const filteredWorkflows = computed(() => {
  return props.workflows.filter(w => {
    const searchLow = searchQuery.value.toLowerCase()
    const matchesSearch = w.name.toLowerCase().includes(searchLow)
    
    let matchesStatus = true
    if (filterStatus.value === 'active') matchesStatus = w.is_active === true
    else if (filterStatus.value === 'inactive') matchesStatus = w.is_active === false

    return matchesSearch && matchesStatus
  })
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredWorkflows.value.length / itemsPerPage))
})

const paginatedWorkflows = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredWorkflows.value.slice(start, end)
})

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--
}

// Reset page to 1 when search or filter changes
watch([searchQuery, filterStatus], () => {
  currentPage.value = 1
})

const deleteWorkflow = async (id) => {
  if (!confirm('Are you sure you want to delete this workflow?')) return
  
  try {
    const res = await fetch(`/api/workflows/${id}`, { method: 'DELETE' })
    if (res.ok) {
      emit('refresh')
    }
  } catch (error) {
    console.error('Error deleting workflow:', error)
  }
}
</script>

<style scoped>
.list-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}
.search-input {
  flex: 1;
  padding: 0.6rem 1rem;
  border: 1px solid #dcdde1;
  border-radius: 6px;
  font-size: 1rem;
}
.filter-select {
  padding: 0.6rem 1rem;
  border: 1px solid #dcdde1;
  border-radius: 6px;
  font-size: 1rem;
  background: white;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
}
.page-info {
  font-weight: 500;
  color: #34495e;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}
.card {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 1.25rem;
  background: #fafafa;
  transition: box-shadow 0.2s, transform 0.2s;
  display: flex;
  flex-direction: column;
}
.card:hover {
  box-shadow: 0 6px 16px rgba(0,0,0,0.06);
  transform: translateY(-2px);
}
.card h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: #2c3e50;
  font-size: 1.2rem;
}
.desc {
  color: #7f8c8d;
  font-size: 0.95rem;
  margin-bottom: 1.5rem;
  flex-grow: 1;
}
.meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  font-size: 0.85rem;
  font-weight: 600;
  align-items: center;
}
.status {
  padding: 0.3rem 0.8rem;
  border-radius: 12px;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.5px;
}
.status.active { background: #e8f8f5; color: #1abc9c; }
.status.inactive { background: #fdedec; color: #e74c3c; }
.status.draft { background: #eaeded; color: #7f8c8d; }
.task-count {
  color: #95a5a6;
}

.actions {
  display: flex;
  gap: 0.75rem;
}
.btn {
  padding: 0.5rem 0.8rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: opacity 0.2s;
}
.btn:hover {
  opacity: 0.9;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
}
.btn-secondary {
  background: #95a5a6;
  color: white;
}
.btn-exec {
  background: #3498db;
  color: white;
  flex: 1;
}
.btn-edit {
  background: #f39c12;
  color: white;
  flex: 1;
}
.btn-del {
  background: transparent;
  color: #e74c3c;
  border: 1px solid #e74c3c;
}
.btn-del:hover { background: #fdf2f0; }

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #95a5a6;
  background: #fdfdfd;
  border-radius: 12px;
  border: 2px dashed #ecf0f1;
  font-size: 1.1rem;
}
</style>
