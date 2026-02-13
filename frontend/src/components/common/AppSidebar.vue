<script setup>
import { useAuthStore } from '@/stores/auth'
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const authStore = useAuthStore()
const route = useRoute()

const navItems = computed(() => {
  const items = [
    { to: '/', label: 'ダッシュボード', icon: '□' },
    { to: '/import', label: 'CSVインポート', icon: '↑' },
    { to: '/summary', label: '集計', icon: '≡' },
    { to: '/export', label: 'CSV出力', icon: '↓' },
    { to: '/history', label: '履歴', icon: '◷' },
  ]
  if (authStore.isAdmin) {
    items.push(
      { to: '/master', label: 'マスター管理', icon: '⚙' },
      { to: '/admin', label: 'ユーザー管理', icon: '☰' },
    )
  }
  return items
})

function isActive(to) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}
</script>

<template>
  <nav class="sidebar">
    <ul class="sidebar-nav">
      <li v-for="item in navItems" :key="item.to">
        <router-link :to="item.to" :class="['sidebar-link', { active: isActive(item.to) }]">
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
</style>
