<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSummaryStore } from '@/stores/summary'
import { useMasterStore } from '@/stores/master'
import { useImportStore } from '@/stores/import'
import { generateMonthlyReportPDF } from '@/lib/monthly-report'

const authStore = useAuthStore()
const summaryStore = useSummaryStore()
const masterStore = useMasterStore()
const importStore = useImportStore()

const selectedClientId = ref(authStore.clientId || masterStore.clients[0]?.id || '')

function getPeriodStart(s) {
  if (s.periodStart) return s.periodStart
  return s.yearMonth ? s.yearMonth + '-01' : ''
}
function getPeriodEnd(s) {
  if (s.periodEnd) return s.periodEnd
  if (!s.yearMonth) return ''
  const [y, m] = s.yearMonth.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return `${s.yearMonth}-${String(lastDay).padStart(2, '0')}`
}

// 集計データをロード
onMounted(async () => {
  if (selectedClientId.value) {
    await summaryStore.loadSummaries(selectedClientId.value)
  }
})

watch(selectedClientId, async (id) => {
  if (id) await summaryStore.loadSummaries(id)
})

const confirmedSummaries = computed(() =>
  summaryStore.summaries.filter(
    s => s.clientId === selectedClientId.value && (s.status === 'confirmed' || s.status === 'exported')
  )
)

// 四半期の構成月を算出（熊本市ルール: Q1=12,1,2月 / Q2=3,4,5月 / Q3=6,7,8月 / Q4=9,10,11月）
// 注: Q1の12月は前年度
function getQuarterMonths(yearQuarter) {
  if (!yearQuarter) return []
  const [y, qStr] = yearQuarter.split('-Q')
  const q = parseInt(qStr)
  const year = parseInt(y)
  const quarterMonths = {
    1: [{ y: year - 1, m: 12 }, { y: year, m: 1 }, { y: year, m: 2 }],
    2: [{ y: year, m: 3 }, { y: year, m: 4 }, { y: year, m: 5 }],
    3: [{ y: year, m: 6 }, { y: year, m: 7 }, { y: year, m: 8 }],
    4: [{ y: year, m: 9 }, { y: year, m: 10 }, { y: year, m: 11 }],
  }
  const months = quarterMonths[q] || []
  return months.map(({ y, m }) => `${y}-${String(m).padStart(2, '0')}`)
}

// 二重計上警告: 同じ期間で月次exportedと四半期が共存
function hasDuplicateExportWarning(summary) {
  if (summary.periodType !== 'quarterly' || !summary.yearQuarter) return false
  const months = getQuarterMonths(summary.yearQuarter)
  return months.some(ym =>
    summaryStore.summaries.some(s =>
      s.clientId === summary.clientId && s.facilityId === summary.facilityId &&
      s.periodType === 'monthly' && s.yearMonth === ym && s.status === 'exported'
    )
  )
}

function getFacilityName(facilityId) {
  return masterStore.facilities.find(f => f.id === facilityId)?.facilityName || facilityId
}

function getFacilityCode(facilityId) {
  return masterStore.facilities.find(f => f.id === facilityId)?.facilityCode || ''
}

function getClientCode(clientId) {
  return masterStore.clients.find(c => c.id === clientId)?.clientCode || ''
}

function getYearMonthForEltax(summary) {
  if (summary.yearMonth) return summary.yearMonth.replace('-', '')
  if (summary.yearQuarter) {
    const [y, qStr] = summary.yearQuarter.split('-Q')
    const q = parseInt(qStr)
    const lastMonth = q * 3
    return `${y}${String(lastMonth).padStart(2, '0')}`
  }
  return ''
}

// CSVフィールド用: ダブルクォーテーションをエスケープし改行を除去
function csvSafe(val) {
  const s = String(val ?? '')
  return s.replace(/\r?\n/g, ' ').replace(/"/g, '""')
}

function generateEltaxCSV(summary, client, facility) {
  const today = new Date()
  const todayStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`

  const taxableNights = Number(summary.taxablePersonNights) || 0
  const taxAmount = Number(summary.taxAmount) || 0
  const yearMonth = getYearMonthForEltax(summary)
  const postalCode = (client?.postalCode || '').replace(/-/g, '')

  const cols = [
    '',                                          // 1: 税目区分
    '',                                          // 2: 様式ID
    '',                                          // 3: 手続ID
    '',                                          // 4: 利用者ID
    '',                                          // 5: 納税者ID
    '',                                          // 6: 代理人利用者ID
    '',                                          // 7: 代理人納税者ID
    '',                                          // 8: 申告受付番号
    '',                                          // 9: 受付年月日
    '43100',                                     // 10: 宛先【地方公共団体コード】
    '001',                                       // 11: 宛先【税務事務所コード】
    '熊本市長',                                  // 12: 宛先【長名】
    todayStr,                                    // 13: 提出年月日
    facility?.facilityCode || client?.clientCode || '', // 14: 証票番号
    client?.clientName || '',                    // 15: 氏名又は名称
    '',                                          // 16: 代表者氏名
    postalCode,                                  // 17: 郵便番号
    client?.address || '',                       // 18: 住所又は所在地
    client?.phone || '',                         // 19: 電話番号
    '',                                          // 20: 担当者氏名
    '',                                          // 21: 担当者連絡先
    String(client?.corporateType ?? 1),           // 22: 個人番号・法人番号区分（1=法人, 2=個人）
    (client?.corporateType === 2 ? (client?.personalNumber || '') : ''), // 23: 個人番号（個人の場合12桁）
    (client?.corporateType !== 2 ? (client?.corporateNumber || '') : ''), // 24: 法人番号（法人の場合13桁）
    facility?.facilityCode || '',                // 25: 施設番号
    facility?.facilityName || '',                // 26: 施設名称
    facility?.address || '',                     // 27: 施設所在地
    facility?.phone || '',                       // 28: 施設電話番号
    yearMonth,                                   // 29: 納入税額－行為年月
    '宿泊税（定額）',                            // 30: 申告区分１
    '200',                                       // 31: 申告区分１【税率】
    String(taxableNights),                       // 32: 申告区分１【宿泊数】
    String(taxAmount),                           // 33: 申告区分１【税額】
  ]

  // 34〜69: 申告区分２〜１０（各4列×9区分＝36列）→ 全て空欄
  for (let i = 0; i < 36; i++) {
    cols.push('')
  }

  cols.push(
    String(taxableNights),                       // 70: 課税対象宿泊合計【宿泊数】
    String(taxAmount),                           // 71: 課税対象宿泊合計【税額】
    '0',                                         // 72: 課税免除【宿泊数】
    String(taxableNights),                       // 73: 合計【宿泊数】
    String(taxAmount),                           // 74: 合計【税額】
    ''                                           // 75: 備考
  )

  // 全セルをダブルクォーテーションで囲む（値内の"は""にエスケープ済み）
  return cols.map(c => `"${csvSafe(c)}"`).join(',')
}

async function downloadCSV(summary) {
  const client = masterStore.getClientById(summary.clientId)
  const facility = masterStore.facilities.find(f => f.id === summary.facilityId)

  const csv = generateEltaxCSV(summary, client, facility)

  // UTF-8 BOM無しで出力
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const yearMonth = getYearMonthForEltax(summary)
  const facilityName = facility?.facilityName || 'export'
  a.download = `eLTAX_納入申告_${yearMonth}_${facilityName}.csv`
  a.click()
  URL.revokeObjectURL(url)

  // バックエンドAPIでexportedステータスをDB保存
  try {
    const { api } = await import('@/lib/api')
    const exportParams = {
      clientId: summary.clientId,
      facilityId: summary.facilityId,
      format: 'csv'
    }
    if (summary.yearQuarter) {
      exportParams.yearQuarter = summary.yearQuarter
    } else {
      exportParams.yearMonth = summary.yearMonth
    }
    await api.get('/summaries/export', exportParams)
    // APIからステータス更新を反映
    await summaryStore.loadSummaries(selectedClientId.value)
  } catch (e) {
    // API失敗時はローカルでフォールバック更新
    const idx = summaryStore.summaries.findIndex(s => s.id === summary.id)
    if (idx !== -1) summaryStore.summaries[idx].status = 'exported'
  }

  summaryStore.addExportLog({
    clientId: summary.clientId,
    facilityId: summary.facilityId,
    summaryId: summary.id,
    periodType: summary.periodType,
    periodStart: getPeriodStart(summary),
    periodEnd: getPeriodEnd(summary),
    fileName: a.download,
    taxAmount: summary.taxAmount,
    createdBy: authStore.user?.uid || 'user-1'
  })
}

async function downloadMonthlyReportPDF(summary) {
  try {
    const facility = masterStore.facilities.find(f => f.id === summary.facilityId)
    const client = masterStore.clients.find(c => c.id === summary.clientId)
    const facilityName = facility?.facilityName || ''
    const facilityCode = facility?.facilityCode || ''
    const clientCode = client?.clientCode || ''
    const clientName = client?.clientName || ''

    // 対象月のリストを構築
    let yearMonths = []
    if (summary.periodType === 'quarterly' && summary.yearQuarter) {
      yearMonths = getQuarterMonths(summary.yearQuarter)
    } else if (summary.yearMonth) {
      yearMonths = [summary.yearMonth]
    }

    // 各月の宿泊レコードを取得して展開
    const months = []
    for (const ym of yearMonths) {
      const [y, m] = ym.split('-').map(Number)
      const records = await importStore.getRecordsByFilter(
        summary.clientId, summary.facilityId, ym
      )
      months.push({ year: y, month: m, records })
    }

    await generateMonthlyReportPDF({ facilityName, facilityCode, clientCode, clientName, months })
  } catch (err) {
    console.error('[ExportView] PDF generation error:', err)
    alert('PDF生成に失敗しました: ' + err.message)
  }
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
              <td>{{ s.yearQuarter || s.yearMonth }}</td>
              <td>{{ getFacilityName(s.facilityId) }}</td>
              <td>{{ s.periodType === 'quarterly' ? '四半期' : '月次' }}</td>
              <td>{{ (s.taxablePersonNights)?.toLocaleString() }}</td>
              <td style="font-weight:600">&yen;{{ (s.taxAmount)?.toLocaleString() }}</td>
              <td><span :class="['badge', 'badge-' + s.status]">{{ s.status === 'exported' ? '出力済' : '確定' }}</span></td>
              <td style="text-align:right;white-space:nowrap">
                <span v-if="hasDuplicateExportWarning(s)" style="color:var(--warning-color,#f39c12);font-size:0.85em;margin-right:6px" title="同期間の月次集計が既に出力済みです。二重申告にご注意ください。">⚠️ 月次出力済</span>
                <button class="btn-primary btn-sm" @click="downloadCSV(s)">
                  {{ s.status === 'exported' ? '再ダウンロード' : 'CSV出力' }}
                </button>
                <button class="btn-primary btn-sm" style="margin-left:4px;background:var(--secondary-color,#6c757d)" @click="downloadMonthlyReportPDF(s)">
                  月計表PDF
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
