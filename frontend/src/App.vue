<script setup>
import { ref, provide } from 'vue'
import { useAuthStore } from '@/stores/auth'
import AppHeader from '@/components/common/AppHeader.vue'
import AppSidebar from '@/components/common/AppSidebar.vue'

const authStore = useAuthStore()

const sidebarOpen = ref(false)
provide('sidebarOpen', sidebarOpen)
</script>

<template>
  <div v-if="authStore.isAuthenticated" class="app-layout">
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

@media (max-width: 768px) {
  .app-main { padding: 16px; }
}
</style>
