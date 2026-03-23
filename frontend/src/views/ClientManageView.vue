<script setup>
import { ref } from 'vue'
import { useMasterStore } from '@/stores/master'

const masterStore = useMasterStore()

const showClientForm = ref(false)
const editingClient = ref(null)
const formError = ref('')

function openClientForm(client = null) {
  editingClient.value = client
  formError.value = ''
  showClientForm.value = true
}
async function saveClient(data) {
  formError.value = ''
  try {
    if (editingClient.value) {
      await masterStore.updateClient(editingClient.value.id, data)
    } else {
      await masterStore.addClient(data)
    }
    showClientForm.value = false
    await masterStore.fetchClients(true)
  } catch (e) {
    formError.value = e.message || '事業者の保存に失敗しました'
  }
}
async function deleteClient(client) {
  if (confirm(`「${client.clientName}」を削除しますか？`)) {
    try {
      await masterStore.deleteClient(client.id)
    } catch (e) {
      formError.value = e.message || '事業者の削除に失敗しました'
    }
  }
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1>事業者管理</h1>
      <p>事業者（クライアント）の登録・編集を行います</p>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>事業者一覧</h2>
        <button class="btn-primary btn-sm" @click="openClientForm()">+ 新規登録</button>
      </div>
      <div class="card-body" style="padding:0">
        <div class="table-wrapper">
          <table>
            <thead><tr><th>コード</th><th>事業者名</th><th>代表者</th><th>電話</th><th>状態</th><th></th></tr></thead>
            <tbody>
              <tr v-if="masterStore.clients.length === 0">
                <td colspan="6" class="empty-state">事業者が登録されていません</td>
              </tr>
              <tr v-for="c in masterStore.clients" :key="c.id">
                <td>{{ c.clientCode || '-' }}</td>
                <td>{{ c.clientName }}</td>
                <td>{{ c.representative || '-' }}</td>
                <td>{{ c.phone || '-' }}</td>
                <td><span :class="['badge', c.isActive ? 'badge-success' : 'badge-error']">{{ c.isActive ? '有効' : '無効' }}</span></td>
                <td style="text-align:right;white-space:nowrap">
                  <button class="btn-secondary btn-sm" @click="openClientForm(c)" style="margin-right:4px">編集</button>
                  <button class="btn-danger btn-sm" @click="deleteClient(c)">削除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Client Form Modal -->
    <div v-if="showClientForm" class="modal-overlay" @click.self="showClientForm = false">
      <div class="modal">
        <h3>{{ editingClient ? '事業者編集' : '新規事業者登録' }}</h3>
        <div v-if="formError" style="color: var(--danger-color, #e74c3c); margin-bottom: 12px; font-size: 0.9em; padding: 8px 12px; background: #fef2f2; border-radius: 6px">{{ formError }}</div>
        <ClientFormInline :client="editingClient" @save="saveClient" @close="showClientForm = false" />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

const ClientFormInline = {
  props: { client: Object },
  emits: ['save', 'close'],
  setup(props, { emit }) {
    const form = ref({ clientCode: '', clientName: '', representative: '', address: '', postalCode: '', phone: '', email: '', corporateType: 1, corporateNumber: '', notes: '', isActive: true })
    const validationError = ref('')
    const postalLoading = ref(false)
    function onPostalInput() {
      const code = (form.value.postalCode || '').replace(/-/g, '')
      if (code.length === 7) lookupAddress()
    }
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
    onMounted(() => {
      if (props.client) form.value = { clientCode: props.client.clientCode||'', clientName: props.client.clientName||'', representative: props.client.representative||'', address: props.client.address||'', postalCode: props.client.postalCode||'', phone: props.client.phone||'', email: props.client.email||'', corporateType: props.client.corporateType ?? 1, corporateNumber: props.client.corporateNumber||'', notes: props.client.notes||'', isActive: props.client.isActive !== false }
    })
    return { form, validationError, postalLoading, lookupAddress, onPostalInput, submit() { validationError.value = ''; if (!form.value.clientName?.trim()) { validationError.value = '事業者名は必須です（空白のみは不可）'; return } emit('save', { ...form.value }) } }
  },
  template: `<form @submit.prevent="submit">
    <div v-if="validationError" style="color: var(--danger-color, #e74c3c); margin-bottom: 12px; font-size: 0.9em; padding: 8px 12px; background: #fef2f2; border-radius: 6px">{{ validationError }}</div>
    <div class="form-group"><label>事業者コード</label><input v-model="form.clientCode" maxlength="20" placeholder="後日設定可能" /></div>
    <div class="form-group"><label>事業者名 <span class="required">*</span></label><input v-model="form.clientName" required maxlength="100" /></div>
    <div class="form-group"><label>代表者名</label><input v-model="form.representative" maxlength="50" /></div>
    <div class="form-group"><label>郵便番号</label><div style="display:flex;gap:8px;align-items:center"><input v-model="form.postalCode" maxlength="7" placeholder="1234567" style="flex:1" @input="onPostalInput" /><button type="button" class="btn-secondary btn-sm" @click="lookupAddress" :disabled="postalLoading">{{ postalLoading ? '検索中...' : '住所検索' }}</button></div></div>
    <div class="form-group"><label>住所</label><input v-model="form.address" maxlength="200" /></div>
    <div class="form-group"><label>電話番号</label><input v-model="form.phone" type="tel" maxlength="20" /></div>
    <div class="form-group"><label>メール</label><input v-model="form.email" type="email" maxlength="254" /></div>
    <div class="form-group"><label>個人/法人区分</label><select v-model="form.corporateType"><option :value="1">法人</option><option :value="2">個人</option></select></div>
    <div class="form-group"><label>法人番号</label><input v-model="form.corporateNumber" maxlength="13" placeholder="13桁（法人の場合）" /></div>
    <div class="form-group"><label>備考</label><textarea v-model="form.notes" rows="2" maxlength="500"></textarea></div>
    <div class="form-group"><label class="checkbox"><input type="checkbox" v-model="form.isActive" />有効</label></div>
    <div class="modal-actions"><button type="button" class="btn-secondary" @click="$emit('close')">キャンセル</button><button type="submit" class="btn-primary">保存</button></div>
  </form>`
}

export default {
  components: { ClientFormInline }
}
</script>
