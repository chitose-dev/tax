<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useImportStore } from '@/stores/import'
import { useSummaryStore } from '@/stores/summary'
import { useMasterStore } from '@/stores/master'

const authStore = useAuthStore()
const importStore = useImportStore()
const summaryStore = useSummaryStore()
const masterStore = useMasterStore()

const clientId = computed(() => authStore.isAdmin ? null : authStore.clientId)

const stats = computed(() => {
  const records = clientId.value
    ? importStore.lodgingRecords.filter(r => r.clientId === clientId.value)
    : importStore.lodgingRecords
  const totalTax = records.reduce((sum, r) => sum + (r.taxAmount || 0), 0)
  const logs = clientId.value
    ? importStore.importLogs.filter(l => l.clientId === clientId.value)
    : importStore.importLogs
  const summaries = clientId.value
    ? summaryStore.summaries.filter(s => s.clientId === clientId.value)
    : summaryStore.summaries

  return {
    totalRecords: records.length,
    totalTax,
    totalImports: logs.length,
    draftSummaries: summaries.filter(s => s.status === 'draft').length,
    confirmedSummaries: summaries.filter(s => s.status === 'confirmed' || s.status === 'exported').length,
  }
})

const recentImports = computed(() => {
  const logs = clientId.value
    ? importStore.importLogs.filter(l => l.clientId === clientId.value)
    : importStore.importLogs
  return logs.slice(0, 5)
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1>ダッシュボード</h1>
      <p>{{ authStore.isAdmin ? '全事業者の概要' : masterStore.getClientById(authStore.clientId)?.clientName || '' }}</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card card">
        <div class="card-body">
          <div class="stat-label">宿泊データ件数</div>
          <div class="stat-value">{{ stats.totalRecords.toLocaleString() }}</div>
        </div>
      </div>
      <div class="stat-card card">
        <div class="card-body">
          <div class="stat-label">税額合計</div>
          <div class="stat-value">&yen;{{ stats.totalTax.toLocaleString() }}</div>
        </div>
      </div>
      <div class="stat-card card">
        <div class="card-body">
          <div class="stat-label">インポート回数</div>
          <div class="stat-value">{{ stats.totalImports }}</div>
        </div>
      </div>
      <div class="stat-card card">
        <div class="card-body">
          <div class="stat-label">未確定集計</div>
          <div class="stat-value">{{ stats.draftSummaries }}</div>
        </div>
      </div>
    </div>

    <div class="card mt-4">
      <div class="card-header">
        <h2>最近のインポート</h2>
        <router-link to="/history" class="text-sm">すべて見る</router-link>
      </div>
      <div class="card-body" style="padding:0">
        <table v-if="recentImports.length > 0">
          <thead>
            <tr>
              <th>ファイル名</th>
              <th>件数</th>
              <th>状態</th>
              <th>日時</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in recentImports" :key="log.id">
              <td>{{ log.fileName }}</td>
              <td>{{ log.successRows }} / {{ log.totalRows }}</td>
              <td><span :class="['badge', 'badge-' + log.status]">{{ log.status }}</span></td>
              <td class="text-sm text-gray">{{ new Date(log.createdAt).toLocaleDateString('ja-JP') }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state"><p>まだインポート履歴がありません</p></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
.stat-label { font-size: 12px; color: var(--color-gray-500); text-transform: uppercase; letter-spacing: 0.03em; }
.stat-value { font-size: 28px; font-weight: 700; color: var(--color-gray-900); margin-top: 4px; }
</style>
