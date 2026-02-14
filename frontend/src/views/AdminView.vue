<script setup>
import { ref } from 'vue'
import { useMasterStore } from '@/stores/master'

const masterStore = useMasterStore()

const activeTab = ref('clients')

// ===== 事業者管理 =====
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

// ===== アカウント管理 =====
const users = ref([
  { id: 'user-1', email: 'admin@example.com', displayName: '管理者', role: 'admin', clientId: null, isActive: true },
  { id: 'user-2', email: 'user@sample-hotel.example.com', displayName: '山田スタッフ', role: 'user', clientId: 'client-1', isActive: true },
  { id: 'user-3', email: 'user@test-ryokan.example.com', displayName: '鈴木スタッフ', role: 'user', clientId: 'client-2', isActive: true },
])

const showUserForm = ref(false)
const userForm = ref({ email: '', password: '', displayName: '', role: 'user', clientId: '' })

function getClientName(clientId) {
  if (!clientId) return '-'
  return masterStore.clients.find(c => c.id === clientId)?.clientName || clientId
}

function addUser() {
  if (!userForm.value.email || !userForm.value.displayName) { alert('必須項目を入力してください'); return }
  if (userForm.value.role === 'user' && !userForm.value.clientId) { alert('一般ユーザーには事業者の選択が必要です'); return }
  users.value.push({
    id: 'user-' + Date.now(),
    email: userForm.value.email,
    displayName: userForm.value.displayName,
    role: userForm.value.role,
    clientId: userForm.value.role === 'user' ? userForm.value.clientId : null,
    isActive: true
  })
  showUserForm.value = false
  userForm.value = { email: '', password: '', displayName: '', role: 'user', clientId: '' }
}

function deleteUser(user) {
  if (confirm(`「${user.displayName}」を削除しますか？`)) {
    users.value = users.value.filter(u => u.id !== user.id)
  }
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1>管理者設定</h1>
      <p>事業者の登録・アカウントの管理を行います</p>
    </div>

    <div class="tabs">
      <button :class="['tab', { active: activeTab === 'clients' }]" @click="activeTab = 'clients'">事業者管理</button>
      <button :class="['tab', { active: activeTab === 'accounts' }]" @click="activeTab = 'accounts'">アカウント管理</button>
    </div>

    <!-- 事業者管理タブ -->
    <div v-if="activeTab === 'clients'" class="card">
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

    <!-- アカウント管理タブ -->
    <div v-if="activeTab === 'accounts'" class="card">
      <div class="card-header">
        <h2>アカウント一覧</h2>
        <button class="btn-primary btn-sm" @click="showUserForm = true">+ ユーザー追加</button>
      </div>
      <div class="card-body" style="padding:0">
        <div class="table-wrapper">
          <table>
            <thead><tr><th>名前</th><th>メール</th><th>権限</th><th>所属事業者</th><th>状態</th><th></th></tr></thead>
            <tbody>
              <tr v-for="u in users" :key="u.id">
                <td>{{ u.displayName }}</td>
                <td class="text-sm">{{ u.email }}</td>
                <td><span :class="['badge', u.role === 'admin' ? 'badge-confirmed' : 'badge-draft']">{{ u.role === 'admin' ? '管理者' : '一般' }}</span></td>
                <td class="text-sm">{{ getClientName(u.clientId) }}</td>
                <td><span :class="['badge', u.isActive ? 'badge-success' : 'badge-error']">{{ u.isActive ? '有効' : '無効' }}</span></td>
                <td style="text-align:right">
                  <button class="btn-danger btn-sm" @click="deleteUser(u)">削除</button>
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

    <!-- User Form Modal -->
    <div v-if="showUserForm" class="modal-overlay" @click.self="showUserForm = false">
      <div class="modal">
        <h3>ユーザー追加</h3>
        <form @submit.prevent="addUser">
          <div class="form-group"><label>メールアドレス <span class="required">*</span></label><input v-model="userForm.email" type="email" required /></div>
          <div class="form-group"><label>パスワード <span class="required">*</span></label><input v-model="userForm.password" type="password" required minlength="8" placeholder="8文字以上" /></div>
          <div class="form-group"><label>表示名 <span class="required">*</span></label><input v-model="userForm.displayName" required /></div>
          <div class="form-group">
            <label>権限 <span class="required">*</span></label>
            <select v-model="userForm.role"><option value="user">一般ユーザー</option><option value="admin">管理者</option></select>
          </div>
          <div v-if="userForm.role === 'user'" class="form-group">
            <label>所属事業者 <span class="required">*</span></label>
            <select v-model="userForm.clientId">
              <option value="">選択してください</option>
              <option v-for="c in masterStore.clients" :key="c.id" :value="c.id">{{ c.clientName }}</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="showUserForm = false">キャンセル</button>
            <button type="submit" class="btn-primary">作成</button>
          </div>
        </form>
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
