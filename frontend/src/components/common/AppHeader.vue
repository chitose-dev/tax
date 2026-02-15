<script setup>
import { inject } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const sidebarOpen = inject('sidebarOpen')

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <header class="header">
    <div class="header-left">
      <button class="hamburger-btn" @click="toggleSidebar" aria-label="メニュー">
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
      </button>
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
.header-left { display: flex; align-items: center; gap: 12px; }
.header-title { font-size: 16px; font-weight: 700; color: var(--color-gray-900); }
.header-right { display: flex; align-items: center; gap: 12px; }
.header-user { font-size: 13px; color: var(--color-gray-600); }

.hamburger-btn {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}
.hamburger-line {
  display: block;
  width: 20px;
  height: 2px;
  background: var(--color-gray-600);
  border-radius: 1px;
}

@media (max-width: 768px) {
  .hamburger-btn { display: flex; }
  .header-user { display: none; }
  .header-title { font-size: 14px; }
  .header { padding: 0 12px; }
}
@media (max-width: 480px) {
  .header-title { font-size: 13px; }
  .header-right .badge { display: none; }
}
</style>
