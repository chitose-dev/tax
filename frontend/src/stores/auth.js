import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const userProfile = ref(null)
  const isLoading = ref(!USE_MOCK)
  const error = ref(null)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => userProfile.value?.role === 'admin')
  const clientId = computed(() => userProfile.value?.clientId)
  const facilityIds = computed(() => userProfile.value?.facilityIds || [])

  async function login(email, password) {
    error.value = null
    isLoading.value = true
    try {
      if (!email || !password) {
        throw new Error('メールアドレスとパスワードを入力してください')
      }

      if (USE_MOCK) {
        await new Promise(r => setTimeout(r, 500))
        const isAdminUser = email === 'admin@example.com'
        user.value = { uid: 'user-1', email }
        userProfile.value = {
          id: 'user-1', email,
          displayName: isAdminUser ? '管理者' : 'テストユーザー',
          role: isAdminUser ? 'admin' : 'user',
          clientId: isAdminUser ? null : 'client-1',
          facilityIds: [], isActive: true
        }
        return
      }

      const { signInWithEmailAndPassword } = await import('firebase/auth')
      const { auth } = await import('@/lib/firebase')
      const credential = await signInWithEmailAndPassword(auth, email, password)
      user.value = credential.user

      const { api } = await import('@/lib/api')
      userProfile.value = await api.get('/auth/me')
    } catch (e) {
      const code = e.code || ''
      const messages = {
        'auth/invalid-credential': 'メールアドレスまたはパスワードが正しくありません',
        'auth/invalid-email': 'メールアドレスの形式が正しくありません',
        'auth/user-disabled': 'このアカウントは無効化されています',
        'auth/user-not-found': 'このメールアドレスのアカウントが見つかりません',
        'auth/wrong-password': 'パスワードが正しくありません',
        'auth/too-many-requests': 'ログイン試行回数が多すぎます。しばらくしてから再度お試しください',
        'auth/network-request-failed': 'ネットワークエラーが発生しました。接続を確認してください',
      }
      error.value = messages[code] || 'ログインに失敗しました'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    if (!USE_MOCK) {
      const { signOut } = await import('firebase/auth')
      const { auth } = await import('@/lib/firebase')
      await signOut(auth)
    }
    user.value = null
    userProfile.value = null
  }

  async function initAuth() {
    if (USE_MOCK) {
      isLoading.value = false
      return
    }

    isLoading.value = true
    const { onAuthStateChanged } = await import('firebase/auth')
    const { auth } = await import('@/lib/firebase')

    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          user.value = firebaseUser
          try {
            const { api } = await import('@/lib/api')
            userProfile.value = await api.get('/auth/me')
          } catch {
            user.value = null
            userProfile.value = null
          }
        } else {
          user.value = null
          userProfile.value = null
        }
        isLoading.value = false
        resolve()
      })
    })
  }

  return {
    user, userProfile, isLoading, error,
    isAuthenticated, isAdmin, clientId, facilityIds,
    login, logout, initAuth
  }
})
