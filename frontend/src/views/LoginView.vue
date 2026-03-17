<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter, useRoute } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

// 認証済みなら即リダイレクト
watch(() => authStore.isAuthenticated, (authenticated) => {
  if (authenticated) {
    const redirect = route.query.redirect || '/'
    router.replace(redirect)
  }
}, { immediate: true })

const useMock = import.meta.env.VITE_USE_MOCK === 'true'
const email = ref(useMock ? 'admin@example.com' : '')
const password = ref('')
const validationErrors = ref({})
const isLoading = ref(false)
const loginAttempted = ref(false)

// authStore.errorを直接監視してエラー表示
const loginError = computed(() => {
  if (!loginAttempted.value) return ''
  return authStore.error || ''
})

async function handleLogin() {
  validationErrors.value = {}
  loginAttempted.value = false
  authStore.error = null

  if (!email.value) validationErrors.value.email = 'メールアドレスを入力してください'
  if (!password.value) validationErrors.value.password = 'パスワードを入力してください'
  if (Object.keys(validationErrors.value).length > 0) return

  isLoading.value = true
  loginAttempted.value = true
  try {
    await authStore.login(email.value, password.value)
    const redirect = route.query.redirect || '/'
    await router.replace(redirect)
  } catch (e) {
    // authStore.error は login() 内でセット済み
    // loginAttempted=true + computed loginError で自動表示
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <h1 class="login-title">宿泊税計算システム</h1>
      <div v-if="useMock" class="alert alert-info" style="margin-top:12px;font-size:12px">
        モック: admin@example.com で管理者、それ以外で一般ユーザーとしてログイン（パスワードは何でもOK）
      </div>
      <form @submit.prevent="handleLogin" class="login-form" novalidate>
        <div class="form-group">
          <label for="email">メールアドレス</label>
          <input id="email" v-model="email" type="email" placeholder="example@example.com" autocomplete="email" />
          <span v-if="validationErrors.email" class="error-message">{{ validationErrors.email }}</span>
        </div>
        <div class="form-group">
          <label for="password">パスワード</label>
          <input id="password" v-model="password" type="password" placeholder="パスワード" autocomplete="current-password" />
          <span v-if="validationErrors.password" class="error-message">{{ validationErrors.password }}</span>
        </div>
        <div v-if="loginError" class="alert alert-error" style="margin-top:12px">{{ loginError }}</div>
        <button type="submit" class="btn-primary" :disabled="isLoading" style="width:100%;margin-top:8px">
          <span v-if="isLoading">ログイン中...</span>
          <span v-else>ログイン</span>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: var(--color-gray-50); }
.login-card { background: var(--color-white); border-radius: 8px; box-shadow: var(--shadow-lg); padding: 40px; width: 90%; max-width: 400px; }
.login-title { font-size: 20px; font-weight: 700; text-align: center; color: var(--color-gray-900); }
.login-form { margin-top: 24px; }
</style>
