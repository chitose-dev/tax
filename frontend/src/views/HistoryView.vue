<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useImportStore } from '@/stores/import'
import { useSummaryStore } from '@/stores/summary'
import { useMasterStore } from '@/stores/master'

const authStore = useAuthStore()
const importStore = useImportStore()
const summaryStore = useSummaryStore()
const masterStore = useMasterStore()

const activeTab = ref('import')

const selectedClientId = ref(authStore.clientId || masterStore.clients[0]?.id || '')

const importHistory = computed(() =>
  importStore.importLogs.filter(l => l.clientId === selectedClientId.value)
)

const exportHistory = computed(() =>
  summaryStore.exportLogs.filter(l => l.clientId === selectedClientId.value)
)

function getFacilityNames(ids) {
  return ids.map(id => masterStore.facilities.find(f => f.id === id)?.facilityName || id).join(', ')
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1>履歴</h1>
      <p>インポートとエクスポートの履歴を確認します</p>
    </div>

    <div v-if="authStore.isAdmin" class="card mb-4">
      <div class="card-body">
        <div class="form-group" style="max-width:300px">
          <label>事業者</label>
          <select v-model="selectedClientId">
            <option v-for="c in masterStore.clients" :key="c.id" :value="c.id">{{ c.clientName }}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="tabs">
      <button :class="['tab', { active: activeTab === 'import' }]" @click="activeTab = 'import'">インポート履歴</button>
      <button :class="['tab', { active: activeTab === 'export' }]" @click="activeTab = 'export'">エクスポート履歴</button>
    </div>

    <!-- インポート履歴 -->
    <div v-if="activeTab === 'import'" class="card">
      <div class="card-body" style="padding:0">
        <table v-if="importHistory.length > 0">
          <thead>
            <tr><th>日時</th><th>ファイル名</th><th>施設</th><th>成功/全体</th><th>状態</th></tr>
          </thead>
          <tbody>
            <tr v-for="log in importHistory" :key="log.id">
              <td class="text-sm">{{ formatDate(log.createdAt) }}</td>
              <td>{{ log.fileName }}</td>
              <td class="text-sm">{{ getFacilityNames(log.facilityIds || []) }}</td>
              <td>{{ log.successRows }} / {{ log.totalRows }}</td>
              <td><span :class="['badge', 'badge-' + log.status]">{{ log.status }}</span></td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state"><p>インポート履歴がありません</p></div>
      </div>
    </div>

    <!-- エクスポート履歴 -->
    <div v-if="activeTab === 'export'" class="card">
      <div class="card-body" style="padding:0">
        <table v-if="exportHistory.length > 0">
          <thead>
            <tr><th>日時</th><th>ファイル名</th><th>期間</th><th>税額</th></tr>
          </thead>
          <tbody>
            <tr v-for="log in exportHistory" :key="log.id">
              <td class="text-sm">{{ formatDate(log.createdAt) }}</td>
              <td>{{ log.fileName }}</td>
              <td>{{ log.periodStart }} 〜 {{ log.periodEnd }}</td>
              <td>&yen;{{ log.taxAmount?.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state"><p>エクスポート履歴がありません</p></div>
      </div>
    </div>
  </div>
</template>
