<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSummaryStore } from '@/stores/summary'
import { useMasterStore } from '@/stores/master'

const authStore = useAuthStore()
const summaryStore = useSummaryStore()
const masterStore = useMasterStore()

const selectedClientId = ref(authStore.clientId || masterStore.clients[0]?.id || '')

const confirmedSummaries = computed(() =>
  summaryStore.summaries.filter(
    s => s.clientId === selectedClientId.value && (s.status === 'confirmed' || s.status === 'exported')
  )
)

function getFacilityName(facilityId) {
  return masterStore.facilities.find(f => f.id === facilityId)?.facilityName || facilityId
}

function getFacilityCode(facilityId) {
  return masterStore.facilities.find(f => f.id === facilityId)?.facilityCode || ''
}

function getClientCode(clientId) {
  return masterStore.clients.find(c => c.id === clientId)?.clientCode || ''
}

function downloadCSV(summary) {
  // eLTAX形式のCSV生成（簡易版）
  const clientCode = getClientCode(summary.clientId)
  const facilityCode = getFacilityCode(summary.facilityId)
  const facilityName = getFacilityName(summary.facilityId)

  const rows = [
    ['特別徴収義務者番号', '宿泊施設番号', '宿泊施設名称', '課税期間開始', '課税期間終了', '課税人泊数', '税率', '税額'],
    [clientCode, facilityCode, facilityName, summary.periodStart, summary.periodEnd, summary.taxablePersonNights, 200, summary.taxAmount]
  ]
  const csv = rows.map(r => r.join(',')).join('\n')
  const bom = '\uFEFF'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `eLTAX_${summary.yearMonth}_${facilityCode || 'export'}.csv`
  a.click()
  URL.revokeObjectURL(url)

  // ステータス更新
  if (summary.status === 'confirmed') {
    summaryStore.updateStatus(summary.id, 'exported')
  }
  summaryStore.addExportLog({
    clientId: summary.clientId,
    facilityId: summary.facilityId,
    summaryId: summary.id,
    periodType: summary.periodType,
    periodStart: summary.periodStart,
    periodEnd: summary.periodEnd,
    fileName: a.download,
    taxAmount: summary.taxAmount,
    createdBy: authStore.user?.uid || 'user-1'
  })
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1>eLTAX CSV出力</h1>
      <p>確定済みの集計をeLTAX形式のCSVでダウンロードします</p>
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

    <div class="card">
      <div class="card-header"><h2>出力可能な集計</h2></div>
      <div class="card-body" style="padding:0">
        <div class="table-wrapper">
        <table v-if="confirmedSummaries.length > 0">
          <thead>
            <tr>
              <th>年月</th>
              <th>施設</th>
              <th>種別</th>
              <th>課税人泊数</th>
              <th>税額</th>
              <th>状態</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in confirmedSummaries" :key="s.id">
              <td>{{ s.yearMonth }}</td>
              <td>{{ getFacilityName(s.facilityId) }}</td>
              <td>{{ s.periodType === 'monthly' ? '月次' : '3か月' }}</td>
              <td>{{ s.taxablePersonNights?.toLocaleString() }}</td>
              <td style="font-weight:600">&yen;{{ s.taxAmount?.toLocaleString() }}</td>
              <td><span :class="['badge', 'badge-' + s.status]">{{ s.status === 'exported' ? '出力済' : '確定' }}</span></td>
              <td style="text-align:right;white-space:nowrap">
                <button class="btn-primary btn-sm" @click="downloadCSV(s)">
                  {{ s.status === 'exported' ? '再ダウンロード' : 'CSV出力' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state"><p>確定済みの集計がありません。集計画面で確定してください。</p></div>
        </div>
      </div>
    </div>
  </div>
</template>
