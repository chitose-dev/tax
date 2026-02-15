<script setup>
import { inject } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const authStore = useAuthStore()
const route = useRoute()
const sidebarOpen = inject('sidebarOpen')

const navItems = computed(() => {
  const items = [
    { to: '/', label: 'ダッシュボード', icon: '□' },
    { to: '/import', label: 'CSVインポート', icon: '↑' },
    { to: '/summary', label: '集計', icon: '≡' },
    { to: '/export', label: 'CSV出力', icon: '↓' },
    { to: '/history', label: '履歴', icon: '◷' },
    { to: '/facilities', label: '施設・部屋管理', icon: '⌂' },
  ]
  if (!authStore.isAdmin) {
    items.push(
      { to: '/client-settings', label: '事業者設定', icon: '✎' },
    )
  }
  if (authStore.isAdmin) {
    items.push(
      { to: '/admin/clients', label: '事業者管理', icon: '⚙', separator: true },
      { to: '/admin/accounts', label: 'アカウント管理', icon: '☰' },
    )
  }
  return items
})

function isActive(to) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}

function closeSidebar() {
  sidebarOpen.value = false
}
</script>

<template>
  <!-- Mobile overlay backdrop -->
  <div v-if="sidebarOpen" class="sidebar-overlay" @click="closeSidebar"></div>

  <nav :class="['sidebar', { 'sidebar-open': sidebarOpen }]">
    <ul class="sidebar-nav">
      <li v-for="item in navItems" :key="item.to" :class="{ 'nav-separator': item.separator }">
        <router-link :to="item.to" :class="['sidebar-link', { active: isActive(item.to) }]" @click="closeSidebar">
          <span class="sidebar-icon">{{ item.icon }}</span>
          {{ item.label }}
        </router-link>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  background: var(--color-white);
  border-right: 1px solid var(--color-gray-200);
  overflow-y: auto;
  flex-shrink: 0;
}
.sidebar-nav { list-style: none; padding: 12px 8px; }
.sidebar-nav li { margin-bottom: 2px; }
.sidebar-nav li.nav-separator { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--color-gray-200); }
.sidebar-link {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  border-radius: var(--border-radius);
  color: var(--color-gray-600);
  font-size: 14px; font-weight: 500;
  text-decoration: none;
  transition: all 0.15s;
}
.sidebar-link:hover { background: var(--color-gray-50); color: var(--color-gray-800); text-decoration: none; }
.sidebar-link.active { background: var(--color-primary-light); color: var(--color-primary); }
.sidebar-icon { font-size: 16px; width: 20px; text-align: center; }

.sidebar-overlay { display: none; }

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: var(--header-height);
    left: 0;
    bottom: 0;
    z-index: 100;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    box-shadow: var(--shadow-lg);
  }
  .sidebar.sidebar-open {
    transform: translateX(0);
  }
  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    top: var(--header-height);
    background: rgba(0, 0, 0, 0.3);
    z-index: 99;
  }
}
</style>
