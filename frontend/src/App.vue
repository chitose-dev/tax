<script setup>
import { ref, provide, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMasterStore } from '@/stores/master'
import AppHeader from '@/components/common/AppHeader.vue'
import AppSidebar from '@/components/common/AppSidebar.vue'

const authStore = useAuthStore()
const masterStore = useMasterStore()

const sidebarOpen = ref(false)
provide('sidebarOpen', sidebarOpen)

// 認証済みになったらマスターデータをロード
watch(() => authStore.isAuthenticated, (authenticated) => {
  if (authenticated) masterStore.init()
}, { immediate: true })
</script>

<template>
  <div v-if="authStore.isLoading" class="loading-screen">
    <p>読み込み中...</p>
  </div>
  <div v-else-if="authStore.isAuthenticated" class="app-layout">
    <AppHeader />
    <div class="app-body">
      <AppSidebar />
      <main class="app-main">
        <router-view />
      </main>
    </div>
  </div>
  <router-view v-else />
</template>

<style>
.app-layout { display: flex; flex-direction: column; height: 100vh; }
.app-body { display: flex; flex: 1; overflow: hidden; }
.app-main { flex: 1; overflow-y: auto; overflow-x: hidden; min-width: 0; padding: 24px 32px; }

.loading-screen { display: flex; align-items: center; justify-content: center; height: 100vh; color: var(--color-gray-500); }
@media (max-width: 768px) {
  .app-main { padding: 16px; }
}
</style>
