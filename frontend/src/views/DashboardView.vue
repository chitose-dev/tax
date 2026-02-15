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

// 一般ユーザー用の統計
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

// 管理者用の統計
const adminStats = computed(() => {
  if (!authStore.isAdmin) return null
  return {
    totalClients: masterStore.clients.length,
    activeClients: masterStore.clients.filter(c => c.isActive).length,
    totalFacilities: masterStore.facilities.length,
    totalRooms: masterStore.rooms.length,
    totalRecords: importStore.lodgingRecords.length,
    totalTax: importStore.lodgingRecords.reduce((sum, r) => sum + (r.taxAmount || 0), 0),
    pendingSummaries: summaryStore.summaries.filter(s => s.status === 'draft').length,
    confirmedSummaries: summaryStore.summaries.filter(s => s.status === 'confirmed').length,
    exportedSummaries: summaryStore.summaries.filter(s => s.status === 'exported').length,
  }
})

// 管理者用: 事業者ごとの概要
const clientOverview = computed(() => {
  if (!authStore.isAdmin) return []
  return masterStore.clients.map(c => {
    const facilities = masterStore.facilities.filter(f => f.clientId === c.id)
    const rooms = masterStore.rooms.filter(r => facilities.some(f => f.id === r.facilityId))
    const records = importStore.lodgingRecords.filter(r => r.clientId === c.id)
    const summaries = summaryStore.summaries.filter(s => s.clientId === c.id)
    return {
      id: c.id,
      name: c.clientName,
      isActive: c.isActive,
      facilityCount: facilities.length,
      roomCount: rooms.length,
      recordCount: records.length,
      draftCount: summaries.filter(s => s.status === 'draft').length,
      confirmedCount: summaries.filter(s => s.status === 'confirmed').length,
    }
  })
})
</script>

<template>
  <div>
    <!-- 管理者ダッシュボード -->
    <template v-if="authStore.isAdmin">
      <div class="page-header">
        <h1>管理者ダッシュボード</h1>
        <p>システム全体の概要</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card card">
          <div class="card-body">
            <div class="stat-label">登録事業者数</div>
            <div class="stat-value">{{ adminStats.totalClients }}</div>
            <div class="stat-sub">有効: {{ adminStats.activeClients }}</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="card-body">
            <div class="stat-label">施設数</div>
            <div class="stat-value">{{ adminStats.totalFacilities }}</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="card-body">
            <div class="stat-label">部屋数</div>
            <div class="stat-value">{{ adminStats.totalRooms }}</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="card-body">
            <div class="stat-label">宿泊データ総数</div>
            <div class="stat-value">{{ adminStats.totalRecords.toLocaleString() }}</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="card-body">
            <div class="stat-label">税額合計</div>
            <div class="stat-value">&yen;{{ adminStats.totalTax.toLocaleString() }}</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="card-body">
            <div class="stat-label">集計状況</div>
            <div class="stat-value">{{ adminStats.confirmedSummaries + adminStats.exportedSummaries }}</div>
            <div class="stat-sub">未確定: {{ adminStats.pendingSummaries }}</div>
          </div>
        </div>
      </div>

      <div class="card mt-4">
        <div class="card-header">
          <h2>事業者一覧</h2>
          <router-link to="/admin/clients" class="text-sm">管理画面へ</router-link>
        </div>
        <div class="card-body" style="padding:0">
          <div class="table-wrapper">
            <table>
              <thead>
                <tr><th>事業者名</th><th>施設</th><th>部屋</th><th>データ件数</th><th>未確定</th><th>確定済</th><th>状態</th></tr>
              </thead>
              <tbody>
                <tr v-for="c in clientOverview" :key="c.id">
                  <td>{{ c.name }}</td>
                  <td>{{ c.facilityCount }}</td>
                  <td>{{ c.roomCount }}</td>
                  <td>{{ c.recordCount }}</td>
                  <td>{{ c.draftCount }}</td>
                  <td>{{ c.confirmedCount }}</td>
                  <td><span :class="['badge', c.isActive ? 'badge-success' : 'badge-error']">{{ c.isActive ? '有効' : '無効' }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- 一般ユーザーダッシュボード -->
    <template v-else>
      <div class="page-header">
        <h1>ダッシュボード</h1>
        <p>{{ masterStore.getClientById(authStore.clientId)?.clientName || '' }}</p>
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
          <div class="table-wrapper">
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
  </div>
</template>

<style scoped>
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
.stat-label { font-size: 12px; color: var(--color-gray-500); text-transform: uppercase; letter-spacing: 0.03em; }
.stat-value { font-size: 28px; font-weight: 700; color: var(--color-gray-900); margin-top: 4px; }
.stat-sub { font-size: 12px; color: var(--color-gray-400); margin-top: 2px; }
@media (max-width: 768px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .stat-value { font-size: 22px; }
}
@media (max-width: 480px) {
  .stats-grid { grid-template-columns: 1fr; }
}
</style>
