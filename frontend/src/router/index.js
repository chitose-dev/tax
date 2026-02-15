import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

import LoginView from '@/views/LoginView.vue'
import DashboardView from '@/views/DashboardView.vue'
import ImportView from '@/views/ImportView.vue'
import ImportConfirmView from '@/views/ImportConfirmView.vue'
import SummaryView from '@/views/SummaryView.vue'
import ExportView from '@/views/ExportView.vue'
import HistoryView from '@/views/HistoryView.vue'
import AdminView from '@/views/AdminView.vue'
import FacilityManageView from '@/views/FacilityManageView.vue'

const routes = [
  { path: '/login', name: 'Login', component: LoginView, meta: { requiresAuth: false, guestOnly: true } },
  { path: '/', name: 'Dashboard', component: DashboardView, meta: { requiresAuth: true } },
  { path: '/dashboard', redirect: '/' },
  { path: '/import', name: 'Import', component: ImportView, meta: { requiresAuth: true } },
  { path: '/import/confirm', name: 'ImportConfirm', component: ImportConfirmView, meta: { requiresAuth: true } },
  { path: '/summary', name: 'Summary', component: SummaryView, meta: { requiresAuth: true } },
  { path: '/export', name: 'Export', component: ExportView, meta: { requiresAuth: true } },
  { path: '/history', name: 'History', component: HistoryView, meta: { requiresAuth: true } },
  { path: '/facilities', name: 'Facilities', component: FacilityManageView, meta: { requiresAuth: true } },
  { path: '/admin', name: 'Admin', component: AdminView, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/master', redirect: '/admin' },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  if (authStore.isLoading) {
    await authStore.initAuth()
  }

  const isAuthenticated = authStore.isAuthenticated
  const isAdmin = authStore.isAdmin

  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'Login', query: { redirect: to.fullPath } })
  }
  if (to.meta.guestOnly && isAuthenticated) {
    return next({ name: 'Dashboard' })
  }
  if (to.meta.requiresAdmin && !isAdmin) {
    return next({ name: 'Dashboard' })
  }
  next()
})

export default router
