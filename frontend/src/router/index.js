import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePlannersStore } from '@/stores/planners'

const routes = [
  { path: '/login', component: () => import('@/views/auth/LoginView.vue'), meta: { public: true } },
  { path: '/register', component: () => import('@/views/auth/RegisterView.vue'), meta: { public: true } },
  // Planner-Auswahl (nach Login, bevor ein Planner gewählt wird)
  {
    path: '/planners',
    component: () => import('@/components/layout/AppLayout.vue'),
    children: [
      { path: '', component: () => import('@/views/PlannersView.vue') },
    ]
  },
  // Planner-Kontext: alle Inhaltsseiten unter /planner/:plannerId/...
  {
    path: '/planner/:plannerId',
    component: () => import('@/components/layout/AppLayout.vue'),
    meta: { requiresPlanner: true },
    children: [
      { path: '', redirect: to => `/planner/${to.params.plannerId}/dashboard` },
      { path: 'dashboard',  component: () => import('@/views/DashboardView.vue') },
      { path: 'my-team',    component: () => import('@/views/MyTeamView.vue') },
      { path: 'teams',      component: () => import('@/views/TeamsView.vue') },
      { path: 'projects',   component: () => import('@/views/ProjectsView.vue') },
      { path: 'kanban',     component: () => import('@/views/KanbanView.vue') },
      { path: 'gantt',      component: () => import('@/views/GanttView.vue') },
      { path: 'reports',    component: () => import('@/views/ReportsView.vue') },
      { path: 'settings',   component: () => import('@/views/SettingsView.vue') },
      { path: 'chat',       component: () => import('@/views/ChatView.vue') },
      { path: 'admin',      component: () => import('@/views/AdminView.vue') },
    ]
  },
  // Fallback: / leitet zu /planners (Planner-Auswahl)
  { path: '/', redirect: '/planners' },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

function getToken() {
  const m = document.cookie.match(/(?:^|; )planner_token=([^;]*)/)
  return m ? decodeURIComponent(m[1]) : sessionStorage.getItem('planner_token')
}

router.beforeEach((to) => {
  const token = getToken()

  // Nicht eingeloggt → Login
  if (!to.meta.public && !token) return '/login'

  // Eingeloggt und Login-Seite → Planner-Auswahl
  if (to.path === '/login' && token) return '/planners'

  // Planner-Kontext-Guard: plannerId in URL muss zum aktiven Planner passen
  if (to.meta.requiresPlanner && to.params.plannerId) {
    const plannersStore = usePlannersStore()
    plannersStore.setActivePlanner(to.params.plannerId)
  }
})

export default router
