import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Dashboard from './pages/Dashboard.vue'
import WorkflowEditor from './pages/WorkflowEditor.vue'
import RuleEditor from './pages/RuleEditor.vue'
import ExecutionViewer from './pages/ExecutionViewer.vue'
import AuditLog from './pages/AuditLog.vue'

const routes = [
  { path: '/', component: Dashboard },
  { path: '/workflow/:id', component: WorkflowEditor },
  { path: '/step/:id/rules', component: RuleEditor },
  { path: '/execution/:id', component: ExecutionViewer },
  { path: '/audit', component: AuditLog }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const app = createApp(App)
app.use(router)
app.mount('#app')