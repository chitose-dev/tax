<script setup>
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useImportStore } from '@/stores/import'
import { useSummaryStore } from '@/stores/summary'
import { useMasterStore } from '@/stores/master'

const authStore = useAuthStore()
const importStore = useImportStore()
const summaryStore = useSummaryStore()
const masterStore = useMasterStore()

const TAX_RATE = 200

const selectedClientId = ref(authStore.clientId || masterStore.clients[0]?.id || '')
const selectedFacilityId = ref('')
const selectedYearMonth = ref('')
const periodType = ref('monthly')

const clientFacilities = computed(() =>
  masterStore.facilities.filter(f => f.clientId === selectedClientId.value && f.isActive)
)

// 利用可能な年月一覧
const availableMonths = computed(() => {
  const months = new Set()
  importStore.lodgingRecords
    .filter(r => r.clientId === selectedClientId.value)
    .forEach(r => { if (r.yearMonth) months.add(r.yearMonth) })
  return [...months].sort().reverse()
})

// 集計結果を計算
const calculatedSummaries = computed(() => {
  if (!selectedClientId.value || !selectedYearMonth.value) return []

  const facilities = selectedFacilityId.value
    ? clientFacilities.value.filter(f => f.id === selectedFacilityId.value)
    : clientFacilities.value

  return facilities.map(facility => {
    let records
    if (periodType.value === 'quarterly') {
      // 3か月分
      const [y, m] = selectedYearMonth.value.split('-').map(Number)
      const months = []
      for (let i = 0; i < 3; i++) {
        const mm = m + i
        const yy = y + Math.floor((mm - 1) / 12)
        const mmm = ((mm - 1) % 12) + 1
        months.push(`${yy}-${String(mmm).padStart(2, '0')}`)
      }
      records = importStore.lodgingRecords.filter(r =>
        r.clientId === selectedClientId.value && r.facilityId === facility.id && months.includes(r.yearMonth)
      )
    } else {
      records = importStore.getRecordsByFilter(selectedClientId.value, facility.id, selectedYearMonth.value)
    }

    const totalAdults = records.reduce((s, r) => s + (r.adults || 0), 0)
    const totalChildren = records.reduce((s, r) => s + (r.children || 0), 0)
    const totalInfants = records.reduce((s, r) => s + (r.infants || 0), 0)
    const totalNights = records.reduce((s, r) => s + (r.nights || 0), 0)
    const taxablePersonNights = records.reduce((s, r) => s + ((r.adults + r.children) * r.nights), 0)
    const taxAmount = taxablePersonNights * TAX_RATE

    // 既存の集計状態を確認
    const existing = summaryStore.summaries.find(
      s => s.clientId === selectedClientId.value && s.facilityId === facility.id &&
           s.yearMonth === selectedYearMonth.value && s.periodType === periodType.value
    )

    return {
      facilityId: facility.id,
      facilityName: facility.facilityName,
      facilityCode: facility.facilityCode,
      totalRecords: records.length,
      totalNights, totalAdults, totalChildren, totalInfants,
      taxablePersonNights, taxAmount,
      status: existing?.status || null,
      summaryId: existing?.id || null,
    }
  })
})

const grandTotal = computed(() => ({
  records: calculatedSummaries.value.reduce((s, c) => s + c.totalRecords, 0),
  taxablePersonNights: calculatedSummaries.value.reduce((s, c) => s + c.taxablePersonNights, 0),
  taxAmount: calculatedSummaries.value.reduce((s, c) => s + c.taxAmount, 0),
}))

function saveSummary(item) {
  summaryStore.saveSummary({
    clientId: selectedClientId.value,
    facilityId: item.facilityId,
    periodType: periodType.value,
    periodStart: selectedYearMonth.value + '-01',
    periodEnd: selectedYearMonth.value + '-31',
    yearMonth: selectedYearMonth.value,
    totalRecords: item.totalRecords,
    totalNights: item.totalNights,
    totalAdults: item.totalAdults,
    totalChildren: item.totalChildren,
    totalInfants: item.totalInfants,
    taxablePersonNights: item.taxablePersonNights,
    taxAmount: item.taxAmount,
    status: 'draft',
    createdBy: authStore.user?.uid || 'user-1'
  })
}

function confirmSummary(item) {
  if (item.summaryId) {
    summaryStore.updateStatus(item.summaryId, 'confirmed', authStore.user?.uid)
  }
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1>集計</h1>
      <p>月次または3か月の宿泊税を集計します</p>
    </div>

    <!-- フィルター -->
    <div class="card mb-4">
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">
          <div v-if="authStore.isAdmin" class="form-group">
            <label>事業者</label>
            <select v-model="selectedClientId">
              <option v-for="c in masterStore.clients" :key="c.id" :value="c.id">{{ c.clientName }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>施設</label>
            <select v-model="selectedFacilityId">
              <option value="">全施設</option>
              <option v-for="f in clientFacilities" :key="f.id" :value="f.id">{{ f.facilityName }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>対象年月</label>
            <select v-model="selectedYearMonth">
              <option value="">選択してください</option>
              <option v-for="m in availableMonths" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>集計期間</label>
            <select v-model="periodType">
              <option value="monthly">月次</option>
              <option value="quarterly">3か月（選択月から）</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- 集計結果 -->
    <div v-if="selectedYearMonth && calculatedSummaries.length > 0" class="card">
      <div class="card-header">
        <h2>集計結果 - {{ selectedYearMonth }}{{ periodType === 'quarterly' ? '（3か月）' : '' }}</h2>
      </div>
      <div class="card-body" style="padding:0">
        <table>
          <thead>
            <tr>
              <th>施設</th>
              <th>件数</th>
              <th>課税人泊数</th>
              <th>税額</th>
              <th>状態</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in calculatedSummaries" :key="item.facilityId">
              <td>{{ item.facilityName }}</td>
              <td>{{ item.totalRecords }}</td>
              <td>{{ item.taxablePersonNights.toLocaleString() }}</td>
              <td style="font-weight:600">&yen;{{ item.taxAmount.toLocaleString() }}</td>
              <td>
                <span v-if="item.status" :class="['badge', 'badge-' + item.status]">
                  {{ item.status === 'draft' ? '下書き' : item.status === 'confirmed' ? '確定' : '出力済' }}
                </span>
                <span v-else class="text-sm text-gray">未保存</span>
              </td>
              <td style="text-align:right">
                <button v-if="!item.status" class="btn-secondary btn-sm" @click="saveSummary(item)">保存</button>
                <button v-else-if="item.status === 'draft'" class="btn-primary btn-sm" @click="confirmSummary(item)">確定</button>
                <span v-else class="text-sm text-gray">確定済</span>
              </td>
            </tr>
            <tr style="font-weight:700;background:var(--color-gray-50)">
              <td>合計</td>
              <td>{{ grandTotal.records }}</td>
              <td>{{ grandTotal.taxablePersonNights.toLocaleString() }}</td>
              <td>&yen;{{ grandTotal.taxAmount.toLocaleString() }}</td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else-if="selectedYearMonth" class="card">
      <div class="card-body empty-state"><p>該当するデータがありません</p></div>
    </div>
    <div v-else class="card">
      <div class="card-body empty-state"><p>年月を選択してください</p></div>
    </div>
  </div>
</template>
