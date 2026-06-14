import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/login', component: () => import('@/views/auth/LoginView.vue'), meta: { public: true } },
  { path: '/register', component: () => import('@/views/auth/RegisterView.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    children: [
      { path: '', redirect: '/my-team' },
      { path: 'dashboard', component: () => import('@/views/DashboardView.vue') },
      { path: 'my-team', component: () => import('@/views/MyTeamView.vue') },
      { path: 'teams', component: () => import('@/views/TeamsView.vue') },
      { path: 'projects', component: () => import('@/views/ProjectsView.vue') },
      { path: 'kanban', component: () => import('@/views/KanbanView.vue') },
      { path: 'reports', component: () => import('@/views/ReportsView.vue') },
      { path: 'settings', component: () => import('@/views/SettingsView.vue') },
      { path: 'chat', component: () => import('@/views/ChatView.vue') },
      { path: 'admin', component: () => import('@/views/AdminView.vue') },
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  if (!to.meta.public && !token) return '/login'
  if (to.path === '/login' && token) return '/my-team'
})

export default router
