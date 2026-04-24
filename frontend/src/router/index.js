import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'

import LoginView from '@/views/LoginView.vue'
import ErrorView from '@/views/ErrorView.vue'
import DashboardView from '@/views/DashboardView.vue'
import ImportView from '@/views/ImportView.vue'
import ImportConfirmView from '@/views/ImportConfirmView.vue'
import SummaryView from '@/views/SummaryView.vue'
import ExportView from '@/views/ExportView.vue'
import HistoryView from '@/views/HistoryView.vue'
import FacilityManageView from '@/views/FacilityManageView.vue'
import ClientSettingsView from '@/views/ClientSettingsView.vue'
import ClientManageView from '@/views/ClientManageView.vue'
import AccountManageView from '@/views/AccountManageView.vue'

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
  { path: '/client-settings', name: 'ClientSettings', component: ClientSettingsView, meta: { requiresAuth: true } },
  { path: '/admin/clients', name: 'ClientManage', component: ClientManageView, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/accounts', name: 'AccountManage', component: AccountManageView, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin', redirect: '/admin/clients' },
  { path: '/master', redirect: '/admin/clients' },
  { path: '/error', name: 'Error', component: ErrorView, meta: { requiresAuth: false } },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

let _authReady = null

router.beforeEach(async (to, from, next) => {
  // --- slug ゲート: ?admin で管理者モード、?client=xxx で事業者モード、それ以外はエラー ---
  if (to.name !== 'Error') {
    const tenant = useTenantStore()
    const params = new URLSearchParams(window.location.search)
    const isAdminUrl = params.has('admin')
    const slug = params.get('client')
    if (isAdminUrl) {
      if (!tenant.isAdminMode) tenant.setAdminMode()
    } else if (!tenant.isLoaded || tenant.slug !== slug || tenant.isAdminMode) {
      const ok = await tenant.loadBySlug(slug)
      if (!ok) return next({ name: 'Error' })
    }
  }

  // --- 認証ガード ---
  const authStore = useAuthStore()

  if (!_authReady) {
    _authReady = authStore.initAuth()
  }
  if (authStore.isLoading) {
    await _authReady
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

  // --- 事業者(URL slug)とユーザーの所属clientId整合チェック ---
  // 管理者(clientId=null)はどのURLでもOK。一般ユーザーは自社URLのみ。
  if (isAuthenticated) {
    const tenant = useTenantStore()
    // 管理者URL(?admin)は管理者のみ許可
    if (tenant.isAdminMode && !isAdmin) {
      await authStore.logout()
      authStore.error = 'メールアドレスまたはパスワードが正しくありません'
      return next({ name: 'Login' })
    }
    // 事業者URL(?client=xxx)は管理者または所属ユーザーのみ許可
    if (!tenant.isAdminMode && !isAdmin
        && tenant.clientId && authStore.clientId
        && authStore.clientId !== tenant.clientId) {
      await authStore.logout()
      authStore.error = 'メールアドレスまたはパスワードが正しくありません'
      return next({ name: 'Login' })
    }
  }

  next()
})

export default router
