<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter, useRoute } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('admin@example.com')
const password = ref('password')
const errors = ref({})
const loginError = ref('')
const isLoading = ref(false)

async function handleLogin() {
  errors.value = {}
  loginError.value = ''
  if (!email.value) errors.value.email = 'メールアドレスを入力してください'
  if (!password.value) errors.value.password = 'パスワードを入力してください'
  if (Object.keys(errors.value).length > 0) return

  isLoading.value = true
  try {
    await authStore.login(email.value, password.value)
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (e) {
    loginError.value = authStore.error || 'ログインに失敗しました'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <h1 class="login-title">宿泊税計算システム</h1>
      <div class="alert alert-info" style="margin-top:12px;font-size:12px">
        モック: admin@example.com で管理者、それ以外で一般ユーザーとしてログイン（パスワードは何でもOK）
      </div>
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email">メールアドレス</label>
          <input id="email" v-model="email" type="email" placeholder="example@example.com" required autocomplete="email" />
          <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
        </div>
        <div class="form-group">
          <label for="password">パスワード</label>
          <input id="password" v-model="password" type="password" placeholder="パスワード" required autocomplete="current-password" />
          <span v-if="errors.password" class="error-message">{{ errors.password }}</span>
        </div>
        <div v-if="loginError" class="alert alert-error">{{ loginError }}</div>
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
