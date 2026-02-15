<script setup>
import { ref } from 'vue'
import { useMasterStore } from '@/stores/master'

const masterStore = useMasterStore()

const showClientForm = ref(false)
const editingClient = ref(null)

function openClientForm(client = null) {
  editingClient.value = client
  showClientForm.value = true
}
function saveClient(data) {
  if (editingClient.value) {
    masterStore.updateClient(editingClient.value.id, data)
  } else {
    masterStore.addClient(data)
  }
  showClientForm.value = false
}
function deleteClient(client) {
  if (confirm(`「${client.clientName}」を削除しますか？`)) {
    masterStore.deleteClient(client.id)
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
                <td>{{ c.representativeName || '-' }}</td>
                <td>{{ c.phone || '-' }}</td>
                <td><span :class="['badge', c.isActive ? 'badge-success' : 'badge-error']">{{ c.isActive ? '有効' : '無効' }}</span></td>
                <td style="text-align:right">
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
    const form = ref({ clientCode: '', clientName: '', representativeName: '', address: '', phone: '', email: '', notes: '', isActive: true })
    onMounted(() => {
      if (props.client) form.value = { clientCode: props.client.clientCode||'', clientName: props.client.clientName||'', representativeName: props.client.representativeName||'', address: props.client.address||'', phone: props.client.phone||'', email: props.client.email||'', notes: props.client.notes||'', isActive: props.client.isActive !== false }
    })
    return { form, submit() { if (!form.value.clientName?.trim()) { alert('事業者名は必須です'); return } emit('save', { ...form.value }) } }
  },
  template: `<form @submit.prevent="submit">
    <div class="form-group"><label>事業者コード</label><input v-model="form.clientCode" maxlength="20" placeholder="後日設定可能" /></div>
    <div class="form-group"><label>事業者名 <span class="required">*</span></label><input v-model="form.clientName" required maxlength="100" /></div>
    <div class="form-group"><label>代表者名</label><input v-model="form.representativeName" maxlength="50" /></div>
    <div class="form-group"><label>住所</label><input v-model="form.address" maxlength="200" /></div>
    <div class="form-group"><label>電話番号</label><input v-model="form.phone" type="tel" maxlength="15" /></div>
    <div class="form-group"><label>メール</label><input v-model="form.email" type="email" maxlength="254" /></div>
    <div class="form-group"><label>備考</label><textarea v-model="form.notes" rows="2" maxlength="500"></textarea></div>
    <div class="form-group"><label class="checkbox"><input type="checkbox" v-model="form.isActive" />有効</label></div>
    <div class="modal-actions"><button type="button" class="btn-secondary" @click="$emit('close')">キャンセル</button><button type="submit" class="btn-primary">保存</button></div>
  </form>`
}

export default {
  components: { ClientFormInline }
}
</script>
