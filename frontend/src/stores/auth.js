import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const userProfile = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => userProfile.value?.role === 'admin')
  const clientId = computed(() => userProfile.value?.clientId)
  const facilityIds = computed(() => userProfile.value?.facilityIds || [])

  // モック: メール/パスワードでログイン
  async function login(email, password) {
    error.value = null
    isLoading.value = true
    try {
      await new Promise(r => setTimeout(r, 500)) // ローディング演出

      if (!email || !password) {
        throw new Error('メールアドレスとパスワードを入力してください')
      }

      // モック: admin@example.com → 管理者、それ以外 → 一般ユーザー
      const isAdminUser = email === 'admin@example.com'

      user.value = { uid: 'user-1', email }
      userProfile.value = {
        id: 'user-1',
        email,
        displayName: isAdminUser ? '管理者' : 'テストユーザー',
        role: isAdminUser ? 'admin' : 'user',
        clientId: isAdminUser ? null : 'client-1',
        facilityIds: [],
        isActive: true
      }
    } catch (e) {
      error.value = e.message || 'ログインに失敗しました'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    user.value = null
    userProfile.value = null
  }

  async function initAuth() {
    // モック: 何もしない（Firebase接続時にonAuthStateChangedに置換）
    isLoading.value = false
  }

  return {
    user, userProfile, isLoading, error,
    isAuthenticated, isAdmin, clientId, facilityIds,
    login, logout, initAuth
  }
})
