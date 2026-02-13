<script setup>
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <header class="header">
    <div class="header-left">
      <h1 class="header-title">宿泊税計算システム</h1>
    </div>
    <div class="header-right">
      <span class="header-user">{{ authStore.userProfile?.displayName }}</span>
      <span v-if="authStore.isAdmin" class="badge badge-confirmed">管理者</span>
      <button class="btn-secondary btn-sm" @click="handleLogout">ログアウト</button>
    </div>
  </header>
</template>

<style scoped>
.header {
  height: var(--header-height);
  background: var(--color-white);
  border-bottom: 1px solid var(--color-gray-200);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
}
.header-title { font-size: 16px; font-weight: 700; color: var(--color-gray-900); }
.header-right { display: flex; align-items: center; gap: 12px; }
.header-user { font-size: 13px; color: var(--color-gray-600); }
</style>
