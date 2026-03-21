<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useImportStore } from '@/stores/import'
import { useSummaryStore } from '@/stores/summary'
import { useMasterStore } from '@/stores/master'

const authStore = useAuthStore()
const importStore = useImportStore()
const summaryStore = useSummaryStore()
const masterStore = useMasterStore()

const TAX_RATE = 200

function getLastDayOfMonth(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return `${yearMonth}-${String(lastDay).padStart(2, '0')}`
}

const selectedClientId = ref(authStore.clientId || '')
const selectedFacilityId = ref('')
const selectedYearMonth = ref('')
const selectedQuarter = ref('')
const periodType = ref('monthly')

const clientFacilities = computed(() =>
  masterStore.facilities.filter(f => f.clientId === selectedClientId.value && f.isActive)
)

// EDGE-10: 削除済み施設を含む全施設（宿泊レコードのfacilityIdから復元）
const allFacilitiesForSummary = computed(() => {
  const knownIds = new Set(clientFacilities.value.map(f => f.id))
  const orphanIds = new Set()
  importStore.lodgingRecords
    .filter(r => r.clientId === selectedClientId.value)
    .forEach(r => { if (r.facilityId && !knownIds.has(r.facilityId)) orphanIds.add(r.facilityId) })
  const orphanFacilities = [...orphanIds].map(id => ({
    id, facilityName: `（削除済み施設: ${id.slice(0, 8)}...）`, facilityCode: '', isActive: false, clientId: selectedClientId.value
  }))
  return [...clientFacilities.value, ...orphanFacilities]
})

// clientsがロードされたらデフォルト選択
watch(() => masterStore.clients, (clients) => {
  if (!selectedClientId.value && clients.length > 0) {
    selectedClientId.value = clients[0].id
  }
}, { immediate: true })

// clientId変更時に宿泊レコード＋集計をフェッチ
watch(selectedClientId, async (id) => {
  if (id) {
    selectedYearMonth.value = ''
    await Promise.all([
      importStore.fetchLodgingRecords(id),
      summaryStore.loadSummaries(id)
    ])
  }
})

// ページ表示時にも必ずフェッチ（インポート後の遷移対応）
onMounted(async () => {
  if (selectedClientId.value) {
    await Promise.all([
      importStore.fetchLodgingRecords(selectedClientId.value),
      summaryStore.loadSummaries(selectedClientId.value)
    ])
  }
})

// 利用可能な年月一覧
const availableMonths = computed(() => {
  const months = new Set()
  importStore.lodgingRecords
    .filter(r => r.clientId === selectedClientId.value)
    .forEach(r => { if (r.yearMonth) months.add(r.yearMonth) })
  return [...months].sort().reverse()
})

// 利用可能な四半期一覧
const availableQuarters = computed(() => {
  const quarters = new Set()
  availableMonths.value.forEach(ym => {
    const [y, m] = ym.split('-').map(Number)
    const q = Math.ceil(m / 3)
    quarters.add(`${y}-Q${q}`)
  })
  return [...quarters].sort().reverse().map(q => ({
    value: q,
    label: q.replace('-Q1', '年 1-3月').replace('-Q2', '年 4-6月').replace('-Q3', '年 7-9月').replace('-Q4', '年 10-12月')
  }))
})

// 四半期の構成月を取得
function getQuarterMonths(yearQuarter) {
  const [y, qStr] = yearQuarter.split('-Q')
  const q = parseInt(qStr)
  const start = (q - 1) * 3 + 1
  return [0, 1, 2].map(i => `${y}-${String(start + i).padStart(2, '0')}`)
}

// 集計結果を計算
const calculatedSummaries = computed(() => {
  const isQuarterly = periodType.value === 'quarterly'
  if (!selectedClientId.value) return []
  if (isQuarterly && !selectedQuarter.value) return []
  if (!isQuarterly && !selectedYearMonth.value) return []

  const facilities = selectedFacilityId.value
    ? allFacilitiesForSummary.value.filter(f => f.id === selectedFacilityId.value)
    : allFacilitiesForSummary.value

  return facilities.map(facility => {
    let records
    if (isQuarterly) {
      const months = getQuarterMonths(selectedQuarter.value)
      records = importStore.lodgingRecords.filter(r =>
        r.clientId === selectedClientId.value && r.facilityId === facility.id && months.includes(r.yearMonth)
      )
    } else {
      records = importStore.lodgingRecords.filter(r =>
        r.clientId === selectedClientId.value && r.facilityId === facility.id && r.yearMonth === selectedYearMonth.value
      )
    }

    // nightsがない場合はcheckIn/checkOutから算出
    function getNights(r) {
      if (r.nights) return r.nights
      if (r.checkInDate && r.checkOutDate) {
        const diff = new Date(r.checkOutDate) - new Date(r.checkInDate)
        return Math.max(0, Math.round(diff / 86400000))
      }
      return 1
    }

    const totalAdults = records.reduce((s, r) => s + (r.adults || 0), 0)
    const totalChildren = records.reduce((s, r) => s + (r.children || 0), 0)
    const totalInfants = records.reduce((s, r) => s + (r.infants || 0), 0)
    const totalNights = records.reduce((s, r) => s + getNights(r), 0)
    const taxablePersonNights = records.reduce((s, r) => s + ((r.adults || 0) + (r.children || 0)) * getNights(r), 0)
    const taxAmount = taxablePersonNights * TAX_RATE

    // 既存の集計状態を確認
    const existing = summaryStore.summaries.find(s => {
      if (s.clientId !== selectedClientId.value || s.facilityId !== facility.id) return false
      if (isQuarterly) return s.periodType === 'quarterly' && s.yearQuarter === selectedQuarter.value
      return (!s.periodType || s.periodType === 'monthly') && s.yearMonth === selectedYearMonth.value
    })

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

const summaryError = ref('')

async function deleteSummary(item) {
  if (!item.summaryId) return
  // SUM-06~09: 一般ユーザーは確定済みの集計を削除できない
  if (!authStore.isAdmin && item.status === 'confirmed') {
    summaryError.value = '確定済みの集計は削除できません'
    return
  }
  const label = item.facilityName + ' ' + selectedYearMonth.value
  if (!confirm(`「${label}」の集計を削除しますか？`)) return
  summaryError.value = ''
  try {
    await summaryStore.deleteSummary(item.summaryId)
    await summaryStore.loadSummaries(selectedClientId.value)
  } catch (e) {
    summaryError.value = e.data?.detail || e.message || '集計の削除に失敗しました'
  }
}

async function saveAndConfirm(item) {
  summaryError.value = ''
  try {
    // 保存（generate）→ 即確定
    const isQuarterly = periodType.value === 'quarterly'
    const summaryId = await summaryStore.saveSummary({
      clientId: selectedClientId.value,
      facilityId: item.facilityId,
      periodType: periodType.value,
      yearMonth: isQuarterly ? null : selectedYearMonth.value,
      yearQuarter: isQuarterly ? selectedQuarter.value : null,
    })
    // 保存成功したら即確定
    if (summaryId) {
      await summaryStore.updateStatus(summaryId, 'confirmed', authStore.user?.uid)
    }
    // 最新データ再取得
    await summaryStore.loadSummaries(selectedClientId.value)
  } catch (e) {
    summaryError.value = e.data?.detail || e.message || '集計の確定に失敗しました'
  }
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1>集計</h1>
      <p>月次または3か月の宿泊税を集計します</p>
    </div>

    <div v-if="summaryError" class="card mb-4" style="border-left: 4px solid var(--danger-color, #e74c3c)">
      <div class="card-body" style="padding: 12px 16px; display: flex; justify-content: space-between; align-items: center">
        <span>{{ summaryError }}</span>
        <button class="btn-sm" style="border:none;background:none;cursor:pointer;font-size:1.2em" @click="summaryError = ''">×</button>
      </div>
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
              <option v-for="f in allFacilitiesForSummary" :key="f.id" :value="f.id">{{ f.facilityName }}</option>
            </select>
          </div>
          <div v-if="periodType !== 'quarterly'" class="form-group">
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
              <option value="quarterly">四半期</option>
            </select>
          </div>
          <div v-if="periodType === 'quarterly'" class="form-group">
            <label>四半期</label>
            <select v-model="selectedQuarter">
              <option value="">選択してください</option>
              <option v-for="q in availableQuarters" :key="q.value" :value="q.value">{{ q.label }}</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- 集計結果 -->
    <div v-if="(selectedYearMonth || selectedQuarter) && calculatedSummaries.length > 0" class="card">
      <div class="card-header">
        <h2>集計結果 - {{ periodType === 'quarterly' ? selectedQuarter.replace('-Q1', '年 Q1(1-3月)').replace('-Q2', '年 Q2(4-6月)').replace('-Q3', '年 Q3(7-9月)').replace('-Q4', '年 Q4(10-12月)') : selectedYearMonth }}</h2>
      </div>
      <div class="card-body" style="padding:0">
        <div class="table-wrapper">
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
              <td style="text-align:right;white-space:nowrap">
                <button v-if="!item.status || item.status === 'draft'" class="btn-primary btn-sm" @click="saveAndConfirm(item)">確定</button>
                <span v-else class="text-sm text-gray">確定済</span>
                <button
                  v-if="item.summaryId && (authStore.isAdmin || item.status === 'draft')"
                  class="btn-danger btn-sm"
                  style="margin-left:4px"
                  @click="deleteSummary(item)"
                >削除</button>
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
    </div>

    <div v-else-if="selectedYearMonth || selectedQuarter" class="card">
      <div class="card-body empty-state"><p>該当するデータがありません</p></div>
    </div>
    <div v-else class="card">
      <div class="card-body empty-state"><p>{{ periodType === 'quarterly' ? '四半期を選択してください' : '年月を選択してください' }}</p></div>
    </div>
  </div>
</template>
