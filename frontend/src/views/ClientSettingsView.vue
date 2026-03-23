<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMasterStore } from '@/stores/master'

const authStore = useAuthStore()
const masterStore = useMasterStore()

const loading = ref(true)

const myClient = computed(() => {
  return masterStore.getClientById(authStore.clientId)
})

// 一般ユーザーでも確実にクライアントデータを取得
async function ensureClientLoaded() {
  if (!authStore.clientId) {
    loading.value = false
    return
  }
  if (myClient.value) {
    loading.value = false
    return
  }
  try {
    await masterStore.fetchClients(true)
    // fetchClientsで取得できなかった場合、個別に取得を試みる
    if (!myClient.value) {
      const { api } = await import('@/lib/api')
      const client = await api.get(`/clients/${authStore.clientId}`)
      if (client && !masterStore.clients.find(c => c.id === client.id)) {
        masterStore.clients.push(client)
      }
    }
  } catch (e) {
    console.error('Failed to load client:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => ensureClientLoaded())

// authの初期化が遅れた場合にも対応
watch(() => authStore.clientId, (id) => {
  if (id && !myClient.value) {
    loading.value = true
    ensureClientLoaded()
  }
})

const editing = ref(false)
const form = ref({
  clientCode: '', clientName: '', representative: '',
  postalCode: '', address: '', phone: '', email: '',
  corporateType: 1, corporateNumber: '', notes: ''
})

function startEdit() {
  const c = myClient.value
  if (c) {
    form.value = {
      clientCode: c.clientCode || '',
      clientName: c.clientName || '',
      representative: c.representative || '',
      postalCode: c.postalCode || '',
      address: c.address || '',
      phone: c.phone || '',
      email: c.email || '',
      corporateType: c.corporateType ?? 1,
      corporateNumber: c.corporateNumber || '',
      notes: c.notes || ''
    }
  }
  editing.value = true
}

const saving = ref(false)
const formError = ref('')
const postalLoading = ref(false)
async function lookupAddress() {
  const code = (form.value.postalCode || '').replace(/-/g, '')
  if (code.length !== 7) return
  postalLoading.value = true
  try {
    const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${code}`)
    const data = await res.json()
    if (data.results && data.results.length > 0) {
      const r = data.results[0]
      form.value.address = r.address1 + r.address2 + r.address3
    }
  } catch (e) { /* ignore */ }
  postalLoading.value = false
}

async function saveSettings() {
  formError.value = ''
  if (!form.value.clientName?.trim()) {
    formError.value = '事業者名は必須です（空白のみは不可）'
    return
  }
  saving.value = true
  try {
    await masterStore.updateClient(authStore.clientId, { ...form.value })
    editing.value = false
  } catch (e) {
    formError.value = '保存に失敗しました: ' + (e.data?.detail || e.message || '不明なエラー')
  } finally {
    saving.value = false
  }
}

function cancelEdit() {
  editing.value = false
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1>事業者設定</h1>
      <p>自社の事業者情報を確認・編集できます</p>
    </div>

    <div v-if="loading" class="card">
      <div class="card-body empty-state"><p>読み込み中...</p></div>
    </div>

    <div v-else-if="!myClient" class="alert alert-warning">
      所属する事業者情報が見つかりません。管理者にお問い合わせください。
    </div>

    <template v-else>
      <!-- 表示モード -->
      <div v-if="!editing" class="card">
        <div class="card-header">
          <h2>事業者情報</h2>
          <button class="btn-primary btn-sm" @click="startEdit">編集</button>
        </div>
        <div class="card-body">
          <div class="detail-grid">
            <div class="detail-item">
              <div class="detail-label">事業者コード</div>
              <div class="detail-value">{{ myClient.clientCode || '未設定' }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">事業者名</div>
              <div class="detail-value">{{ myClient.clientName }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">代表者名</div>
              <div class="detail-value">{{ myClient.representative || '未設定' }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">郵便番号</div>
              <div class="detail-value">{{ myClient.postalCode || '未設定' }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">住所</div>
              <div class="detail-value">{{ myClient.address || '未設定' }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">電話番号</div>
              <div class="detail-value">{{ myClient.phone || '未設定' }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">メール</div>
              <div class="detail-value">{{ myClient.email || '未設定' }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">個人/法人区分</div>
              <div class="detail-value">{{ myClient.corporateType === 2 ? '個人' : '法人' }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">法人番号</div>
              <div class="detail-value">{{ myClient.corporateNumber || '未設定' }}</div>
            </div>
            <div v-if="myClient.notes" class="detail-item detail-full">
              <div class="detail-label">備考</div>
              <div class="detail-value">{{ myClient.notes }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 編集モード -->
      <div v-else class="card">
        <div class="card-header">
          <h2>事業者情報の編集</h2>
        </div>
        <div class="card-body">
          <form @submit.prevent="saveSettings">
            <div v-if="formError" style="color: var(--danger-color, #e74c3c); margin-bottom: 12px; font-size: 0.9em; padding: 8px 12px; background: #fef2f2; border-radius: 6px">{{ formError }}</div>
            <div class="form-group"><label>事業者コード</label><input v-model="form.clientCode" maxlength="20" /></div>
            <div class="form-group"><label>事業者名 <span class="required">*</span></label><input v-model="form.clientName" required maxlength="100" /></div>
            <div class="form-group"><label>代表者名</label><input v-model="form.representative" maxlength="50" /></div>
            <div class="form-group"><label>郵便番号</label><div style="display:flex;gap:8px;align-items:center"><input v-model="form.postalCode" maxlength="7" placeholder="1234567" style="flex:1" @input="if(form.postalCode.replace(/-/g,'').length===7) lookupAddress()" /><button type="button" class="btn-secondary btn-sm" @click="lookupAddress" :disabled="postalLoading">{{ postalLoading ? '検索中...' : '住所検索' }}</button></div></div>
            <div class="form-group"><label>住所</label><input v-model="form.address" maxlength="200" /></div>
            <div class="form-group"><label>電話番号</label><input v-model="form.phone" type="tel" maxlength="20" /></div>
            <div class="form-group"><label>メール</label><input v-model="form.email" type="email" maxlength="254" /></div>
            <div class="form-group"><label>個人/法人区分</label><select v-model="form.corporateType"><option :value="1">法人</option><option :value="2">個人</option></select></div>
            <div class="form-group"><label>法人番号</label><input v-model="form.corporateNumber" maxlength="13" placeholder="13桁（法人の場合）" /></div>
            <div class="form-group"><label>備考</label><textarea v-model="form.notes" rows="2" maxlength="500"></textarea></div>
            <div class="flex gap-2" style="margin-top: 20px;">
              <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
              <button type="button" class="btn-secondary" @click="cancelEdit">キャンセル</button>
            </div>
          </form>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
.detail-full { grid-column: 1 / -1; }
.detail-label { font-size: 12px; color: var(--color-gray-500); text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 4px; }
.detail-value { font-size: 15px; color: var(--color-gray-800); }

@media (max-width: 768px) {
  .detail-grid { grid-template-columns: 1fr; gap: 14px; }
}
</style>
