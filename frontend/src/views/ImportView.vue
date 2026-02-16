<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useImportStore } from '@/stores/import'
import { useMasterStore } from '@/stores/master'
import { parseFile, applyColumnMapping } from '@/utils/csv-parser'
import { previewFacilityResolution } from '@/utils/facility-resolver'

const router = useRouter()
const authStore = useAuthStore()
const importStore = useImportStore()
const masterStore = useMasterStore()

const step = ref(1) // 1: アップロード, 2: 列マッピング, 3: プレビュー
const isLoading = ref(false)
const error = ref('')
const dragOver = ref(false)

// Step 1: ファイル
const selectedFile = ref(null)
const parsedHeaders = ref([])
const parsedRows = ref([])

// Step 2: マッピング
const mapping = ref({
  roomCode: null,
  checkInDate: null,
  checkOutDate: null,
  nights: null,
  adults: null,
  children: null,
  infants: null,
  amount: null
})

const requiredFields = [
  { key: 'roomCode', label: 'リスティング（部屋コード）' },
  { key: 'checkInDate', label: 'チェックイン日' },
  { key: 'checkOutDate', label: 'チェックアウト日' },
  { key: 'nights', label: '泊数' },
  { key: 'adults', label: '大人人数' },
  { key: 'children', label: '子供人数' },
]
const optionalFields = [
  { key: 'infants', label: '乳幼児人数' },
  { key: 'amount', label: '宿泊料金' },
]

// Step 3: プレビュー
const previewResult = ref(null)

// 選択中の事業者（管理者は選択、一般ユーザーは固定）
const selectedClientId = ref(authStore.clientId || '')
const clientFacilities = computed(() => {
  const cid = selectedClientId.value
  return cid ? masterStore.facilities.filter(f => f.clientId === cid && f.isActive) : []
})

// ファイル選択
async function handleFile(file) {
  if (!file) return
  error.value = ''
  const ext = file.name.split('.').pop().toLowerCase()
  if (!['csv', 'xlsx', 'xls'].includes(ext)) {
    error.value = 'CSV または Excelファイルを選択してください'
    return
  }
  selectedFile.value = file
  isLoading.value = true
  try {
    const result = await parseFile(file)
    parsedHeaders.value = result.headers
    parsedRows.value = result.rows
    importStore.setParsedData(result.headers, result.rows, file.name)
    autoDetectMapping(result.headers)
    step.value = 2
  } catch (e) {
    error.value = e.message
  } finally {
    isLoading.value = false
  }
}

function onFileInput(e) {
  handleFile(e.target.files[0])
}
function onDrop(e) {
  dragOver.value = false
  handleFile(e.dataTransfer.files[0])
}

// 列名から自動マッピング
function autoDetectMapping(headers) {
  const lower = headers.map(h => (h || '').toLowerCase())
  const find = (...keywords) => {
    const idx = lower.findIndex(h => keywords.some(k => h.includes(k)))
    return idx >= 0 ? idx : null
  }
  mapping.value.roomCode = find('リスティング', 'listing', '部屋', 'room')
  mapping.value.checkInDate = find('チェックイン', 'checkin', 'check-in', 'check_in', '入日')
  mapping.value.checkOutDate = find('チェックアウト', 'checkout', 'check-out', 'check_out', '出日')
  mapping.value.nights = find('泊数', 'nights', '泊')
  mapping.value.adults = find('大人', 'adults', 'adult')
  mapping.value.children = find('子供', 'children', 'child', '小人')
  mapping.value.infants = find('乳幼児', 'infant', '幼児')
  mapping.value.amount = find('料金', 'amount', '金額', '売上')
}

// マッピング確定 → プレビュー
function confirmMapping() {
  error.value = ''
  // 必須チェック
  for (const f of requiredFields) {
    if (mapping.value[f.key] === null || mapping.value[f.key] === undefined || mapping.value[f.key] === '') {
      error.value = `「${f.label}」の列を選択してください`
      return
    }
  }

  if (!selectedClientId.value) {
    error.value = '事業者を選択してください'
    return
  }

  const records = applyColumnMapping(parsedRows.value, mapping.value)
  const facilities = clientFacilities.value
  previewResult.value = previewFacilityResolution(records, facilities)
  importStore.setColumnMapping(mapping.value)
  importStore.setMappedRecords(previewResult.value.records)
  step.value = 3
}

// 確定 → インポート実行
function executeImport() {
  const validRecords = previewResult.value.records.filter(r => r.isValid)
  if (validRecords.length === 0) {
    error.value = '有効なレコードがありません'
    return
  }
  importStore.confirmImport(selectedClientId.value, validRecords)
  router.push('/import/confirm')
}

function reset() {
  step.value = 1
  selectedFile.value = null
  parsedHeaders.value = []
  parsedRows.value = []
  previewResult.value = null
  error.value = ''
  importStore.clearImportState()
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1>CSVインポート</h1>
      <p>宿泊データをCSVまたはExcelファイルから取り込みます</p>
    </div>

    <!-- ステップインジケーター -->
    <div class="steps mb-4">
      <div :class="['step-item', { active: step >= 1 }]">1. ファイル選択</div>
      <div :class="['step-item', { active: step >= 2 }]">2. 列マッピング</div>
      <div :class="['step-item', { active: step >= 3 }]">3. 確認・取込</div>
    </div>

    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <!-- Step 1: ファイルアップロード -->
    <div v-if="step === 1" class="card">
      <div class="card-body">
        <div v-if="authStore.isAdmin" class="form-group">
          <label>事業者を選択 <span class="required">*</span></label>
          <select v-model="selectedClientId">
            <option value="">選択してください</option>
            <option v-for="c in masterStore.clients" :key="c.id" :value="c.id">{{ c.clientName }}</option>
          </select>
        </div>
        <div
          class="dropzone"
          :class="{ 'dropzone-active': dragOver }"
          @dragover.prevent="dragOver = true"
          @dragleave="dragOver = false"
          @drop.prevent="onDrop"
          @click="$refs.fileInput.click()"
        >
          <div v-if="isLoading">読み込み中...</div>
          <div v-else>
            <p style="font-size:32px;margin-bottom:8px">+</p>
            <p>ここにCSV/Excelファイルをドロップ</p>
            <p class="text-sm text-gray">またはクリックしてファイルを選択</p>
            <p class="text-sm text-gray mt-2">対応形式: .csv, .xlsx, .xls</p>
          </div>
          <input ref="fileInput" type="file" accept=".csv,.xlsx,.xls" hidden @change="onFileInput" />
        </div>
      </div>
    </div>

    <!-- Step 2: 列マッピング -->
    <div v-if="step === 2" class="card">
      <div class="card-header">
        <h2>列マッピング</h2>
        <button class="btn-secondary btn-sm" @click="reset">やり直す</button>
      </div>
      <div class="card-body">
        <p class="text-sm text-gray mb-4">ファイル: {{ selectedFile?.name }} ({{ parsedRows.length }}行)</p>

        <div v-if="authStore.isAdmin" class="form-group">
          <label>事業者 <span class="required">*</span></label>
          <select v-model="selectedClientId">
            <option value="">選択してください</option>
            <option v-for="c in masterStore.clients" :key="c.id" :value="c.id">{{ c.clientName }}</option>
          </select>
        </div>

        <h3 style="font-size:14px;font-weight:600;margin-bottom:12px">必須項目</h3>
        <div class="mapping-grid">
          <div v-for="f in requiredFields" :key="f.key" class="form-group">
            <label>{{ f.label }} <span class="required">*</span></label>
            <select v-model="mapping[f.key]">
              <option :value="null">-- 選択 --</option>
              <option v-for="(h, i) in parsedHeaders" :key="i" :value="i">{{ h || `列${i+1}` }}</option>
            </select>
          </div>
        </div>

        <h3 style="font-size:14px;font-weight:600;margin:16px 0 12px">任意項目</h3>
        <div class="mapping-grid">
          <div v-for="f in optionalFields" :key="f.key" class="form-group">
            <label>{{ f.label }}</label>
            <select v-model="mapping[f.key]">
              <option :value="null">-- なし --</option>
              <option v-for="(h, i) in parsedHeaders" :key="i" :value="i">{{ h || `列${i+1}` }}</option>
            </select>
          </div>
        </div>

        <!-- サンプルデータ表示 -->
        <div v-if="parsedRows.length > 0" style="margin-top:20px">
          <h3 style="font-size:14px;font-weight:600;margin-bottom:8px">データプレビュー（先頭3行）</h3>
          <div style="overflow-x:auto">
            <table>
              <thead>
                <tr><th v-for="(h, i) in parsedHeaders" :key="i">{{ h || `列${i+1}` }}</th></tr>
              </thead>
              <tbody>
                <tr v-for="(row, ri) in parsedRows.slice(0, 3)" :key="ri">
                  <td v-for="(cell, ci) in row" :key="ci" class="text-sm">{{ cell }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style="margin-top:20px;text-align:right">
          <button class="btn-primary" @click="confirmMapping">次へ: 確認</button>
        </div>
      </div>
    </div>

    <!-- Step 3: プレビュー & 確定 -->
    <div v-if="step === 3 && previewResult">
      <!-- 施設振り分け結果 -->
      <div class="card mb-4">
        <div class="card-header">
          <h2>施設振り分け結果</h2>
          <button class="btn-secondary btn-sm" @click="step = 2">マッピングに戻る</button>
        </div>
        <div class="card-body">
          <div class="stats-grid mb-4" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
            <div class="alert alert-success" style="margin:0;text-align:center">
              <div style="font-size:24px;font-weight:700">{{ previewResult.records.filter(r=>r.isValid).length }}</div>
              <div class="text-sm">有効レコード</div>
            </div>
            <div class="alert alert-error" style="margin:0;text-align:center">
              <div style="font-size:24px;font-weight:700">{{ previewResult.errors.length }}</div>
              <div class="text-sm">エラー</div>
            </div>
            <div class="alert alert-info" style="margin:0;text-align:center">
              <div style="font-size:24px;font-weight:700">{{ previewResult.facilityBreakdown.length }}</div>
              <div class="text-sm">施設数</div>
            </div>
          </div>

          <div v-if="previewResult.facilityBreakdown.length > 0">
            <h3 style="font-size:14px;font-weight:600;margin-bottom:8px">施設別内訳</h3>
            <div class="table-wrapper">
              <table>
                <thead><tr><th>施設名</th><th>件数</th></tr></thead>
                <tbody>
                  <tr v-for="fb in previewResult.facilityBreakdown" :key="fb.facilityId">
                    <td>{{ fb.facilityName }}</td>
                    <td>{{ fb.count }}件</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="previewResult.errors.length > 0" style="margin-top:16px">
            <h3 style="font-size:14px;font-weight:600;margin-bottom:8px;color:var(--color-danger)">エラー一覧</h3>
            <div class="table-wrapper">
              <table>
                <thead><tr><th>行</th><th>部屋コード</th><th>エラー</th></tr></thead>
                <tbody>
                  <tr v-for="(err, i) in previewResult.errors.slice(0, 20)" :key="i">
                    <td>{{ err.row }}</td>
                    <td>{{ err.value }}</td>
                    <td class="text-sm">{{ err.message }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-if="previewResult.errors.length > 20" class="text-sm text-gray mt-2">
              ...他 {{ previewResult.errors.length - 20 }}件のエラー
            </p>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn-secondary" @click="reset">キャンセル</button>
        <button class="btn-primary" @click="executeImport" :disabled="previewResult.records.filter(r=>r.isValid).length === 0">
          取込確定（{{ previewResult.records.filter(r=>r.isValid).length }}件）
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.steps { display: flex; gap: 4px; }
.step-item {
  flex: 1; text-align: center; padding: 10px; background: var(--color-gray-100);
  color: var(--color-gray-400); font-size: 13px; font-weight: 500; border-radius: var(--border-radius);
}
.step-item.active { background: var(--color-primary-light); color: var(--color-primary); }
.dropzone {
  border: 2px dashed var(--color-gray-300); border-radius: 8px; padding: 48px 24px;
  text-align: center; cursor: pointer; transition: all 0.15s;
}
.dropzone:hover, .dropzone-active { border-color: var(--color-primary); background: var(--color-primary-light); }
.mapping-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
</style>
