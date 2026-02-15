<script setup>
import { ref } from 'vue'
import { useMasterStore } from '@/stores/master'

const masterStore = useMasterStore()

const users = ref([
  { id: 'user-1', email: 'admin@example.com', displayName: '管理者', role: 'admin', clientId: null, isActive: true },
  { id: 'user-2', email: 'user@sample-hotel.example.com', displayName: '山田スタッフ', role: 'user', clientId: 'client-1', isActive: true },
  { id: 'user-3', email: 'user@test-ryokan.example.com', displayName: '鈴木スタッフ', role: 'user', clientId: 'client-2', isActive: true },
])

const showForm = ref(false)
const form = ref({ email: '', password: '', displayName: '', role: 'user', clientId: '' })

function getClientName(clientId) {
  if (!clientId) return '-'
  return masterStore.clients.find(c => c.id === clientId)?.clientName || clientId
}

function addUser() {
  if (!form.value.email || !form.value.displayName) { alert('必須項目を入力してください'); return }
  if (form.value.role === 'user' && !form.value.clientId) { alert('一般ユーザーには事業者の選択が必要です'); return }
  users.value.push({
    id: 'user-' + Date.now(),
    email: form.value.email,
    displayName: form.value.displayName,
    role: form.value.role,
    clientId: form.value.role === 'user' ? form.value.clientId : null,
    isActive: true
  })
  showForm.value = false
  form.value = { email: '', password: '', displayName: '', role: 'user', clientId: '' }
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
      <h1>アカウント管理</h1>
      <p>システムユーザーの追加・管理を行います</p>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>アカウント一覧</h2>
        <button class="btn-primary btn-sm" @click="showForm = true">+ ユーザー追加</button>
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

    <!-- User Form Modal -->
    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal">
        <h3>ユーザー追加</h3>
        <form @submit.prevent="addUser">
          <div class="form-group"><label>メールアドレス <span class="required">*</span></label><input v-model="form.email" type="email" required /></div>
          <div class="form-group"><label>パスワード <span class="required">*</span></label><input v-model="form.password" type="password" required minlength="8" placeholder="8文字以上" /></div>
          <div class="form-group"><label>表示名 <span class="required">*</span></label><input v-model="form.displayName" required /></div>
          <div class="form-group">
            <label>権限 <span class="required">*</span></label>
            <select v-model="form.role"><option value="user">一般ユーザー</option><option value="admin">管理者</option></select>
          </div>
          <div v-if="form.role === 'user'" class="form-group">
            <label>所属事業者 <span class="required">*</span></label>
            <select v-model="form.clientId">
              <option value="">選択してください</option>
              <option v-for="c in masterStore.clients" :key="c.id" :value="c.id">{{ c.clientName }}</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="showForm = false">キャンセル</button>
            <button type="submit" class="btn-primary">作成</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
