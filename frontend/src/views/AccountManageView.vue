<script setup>
import { ref, onMounted } from 'vue'
import { useMasterStore } from '@/stores/master'
import { useAuthStore } from '@/stores/auth'

const masterStore = useMasterStore()
const authStore = useAuthStore()

const users = ref([])
const isLoading = ref(false)
const showForm = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const editingUser = ref(null) // null=新規, object=編集
const form = ref({ email: '', password: '', displayName: '', role: 'user', clientId: '' })

function getClientName(clientId) {
  if (!clientId) return '-'
  return masterStore.clients.find(c => c.id === clientId)?.clientName || clientId
}

async function fetchUsers() {
  isLoading.value = true
  try {
    const { api } = await import('@/lib/api')
    users.value = await api.get('/users')
  } catch (e) {
    errorMessage.value = 'ユーザー一覧の取得に失敗しました'
  } finally {
    isLoading.value = false
  }
}

function openAddForm() {
  editingUser.value = null
  form.value = { email: '', password: '', displayName: '', role: 'user', clientId: '' }
  errorMessage.value = ''
  showForm.value = true
}

function openEditForm(user) {
  editingUser.value = user
  form.value = {
    email: user.email || '',
    password: '',
    displayName: user.displayName || '',
    role: user.role || 'user',
    clientId: user.clientId || ''
  }
  errorMessage.value = ''
  showForm.value = true
}

async function submitForm() {
  errorMessage.value = ''

  if (!form.value.displayName?.trim()) {
    errorMessage.value = '表示名は必須です'
    return
  }

  if (editingUser.value) {
    await updateUser()
  } else {
    await addUser()
  }
}

async function addUser() {
  if (!form.value.email || !form.value.password) {
    errorMessage.value = 'メールアドレスとパスワードは必須です'
    return
  }
  if (form.value.role === 'user' && !form.value.clientId) {
    errorMessage.value = '一般ユーザーには事業者の選択が必要です'
    return
  }

  isSubmitting.value = true
  try {
    const { api } = await import('@/lib/api')
    await api.post('/users', {
      email: form.value.email,
      password: form.value.password,
      displayName: form.value.displayName,
      role: form.value.role,
      clientId: form.value.role === 'user' ? form.value.clientId : null,
      facilityIds: []
    })
    await fetchUsers()
    showForm.value = false
  } catch (e) {
    errorMessage.value = e.data?.detail || e.message || 'ユーザー作成に失敗しました'
  } finally {
    isSubmitting.value = false
  }
}

async function updateUser() {
  if (form.value.role === 'user' && !form.value.clientId) {
    errorMessage.value = '一般ユーザーには事業者の選択が必要です'
    return
  }

  isSubmitting.value = true
  try {
    const { api } = await import('@/lib/api')
    const updateData = {
      displayName: form.value.displayName,
      role: form.value.role,
      clientId: form.value.role === 'user' ? form.value.clientId : null
    }
    await api.put(`/users/${editingUser.value.id}`, updateData)
    await fetchUsers()
    showForm.value = false
  } catch (e) {
    errorMessage.value = e.data?.detail || e.message || 'ユーザー更新に失敗しました'
  } finally {
    isSubmitting.value = false
  }
}

async function toggleActive(user) {
  try {
    const { api } = await import('@/lib/api')
    await api.put(`/users/${user.id}`, { isActive: !user.isActive })
    await fetchUsers()
  } catch (e) {
    errorMessage.value = e.data?.detail || 'ステータスの更新に失敗しました'
  }
}

async function deleteUser(user) {
  if (user.id === authStore.user?.uid) {
    errorMessage.value = '自分自身は削除できません'
    return
  }
  if (!confirm(`「${user.displayName || user.email}」を削除しますか？\nFirebase Authアカウントも完全に削除されます。`)) return

  try {
    const { api } = await import('@/lib/api')
    await api.delete(`/users/${user.id}`)
    await fetchUsers()
  } catch (e) {
    errorMessage.value = e.data?.detail || 'ユーザーの削除に失敗しました'
  }
}

onMounted(fetchUsers)
</script>

<template>
  <div>
    <div class="page-header">
      <h1>アカウント管理</h1>
      <p>システムユーザーの追加・管理を行います</p>
    </div>

    <div v-if="errorMessage && !showForm" class="card mb-4" style="border-left: 4px solid var(--danger-color, #e74c3c)">
      <div class="card-body" style="padding: 12px 16px; display: flex; justify-content: space-between; align-items: center">
        <span>{{ errorMessage }}</span>
        <button class="btn-sm" style="border:none;background:none;cursor:pointer;font-size:1.2em" @click="errorMessage = ''">×</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>アカウント一覧</h2>
        <button v-if="authStore.isAdmin" class="btn-primary btn-sm" @click="openAddForm">+ ユーザー追加</button>
      </div>
      <div class="card-body" style="padding:0">
        <div v-if="isLoading" style="padding: 2rem; text-align: center">読み込み中...</div>
        <div v-else class="table-wrapper">
          <table>
            <thead><tr><th>名前</th><th>メール</th><th>権限</th><th>所属事業者</th><th>状態</th><th></th></tr></thead>
            <tbody>
              <tr v-for="u in users" :key="u.id">
                <td>{{ u.displayName || '-' }}</td>
                <td class="text-sm">{{ u.email }}</td>
                <td><span :class="['badge', u.role === 'admin' ? 'badge-confirmed' : 'badge-draft']">{{ u.role === 'admin' ? '管理者' : '一般' }}</span></td>
                <td class="text-sm">{{ getClientName(u.clientId) }}</td>
                <td>
                  <span
                    :class="['badge', u.isActive !== false ? 'badge-success' : 'badge-error']"
                    style="cursor: pointer"
                    @click="toggleActive(u)"
                    :title="u.isActive !== false ? 'クリックで無効化' : 'クリックで有効化'"
                  >{{ u.isActive !== false ? '有効' : '無効' }}</span>
                </td>
                <td style="text-align:right;white-space:nowrap">
                  <button v-if="authStore.isAdmin" class="btn-secondary btn-sm" @click="openEditForm(u)" style="margin-right:4px">編集</button>
                  <button v-if="authStore.isAdmin" class="btn-danger btn-sm" @click="deleteUser(u)" :disabled="u.id === authStore.user?.uid">削除</button>
                </td>
              </tr>
              <tr v-if="users.length === 0">
                <td colspan="6" style="text-align:center;padding:2rem">ユーザーが登録されていません</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- User Form Modal (新規 / 編集 共通) -->
    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal">
        <h3>{{ editingUser ? 'ユーザー編集' : 'ユーザー追加' }}</h3>
        <div v-if="errorMessage" style="color: var(--danger-color, #e74c3c); margin-bottom: 12px; font-size: 0.9em; padding: 8px 12px; background: #fef2f2; border-radius: 6px">{{ errorMessage }}</div>
        <form @submit.prevent="submitForm">
          <!-- メール: 新規のみ入力可能 -->
          <div class="form-group">
            <label>メールアドレス <span v-if="!editingUser" class="required">*</span></label>
            <input v-if="!editingUser" v-model="form.email" type="email" required :disabled="isSubmitting" />
            <input v-else :value="form.email" type="email" disabled style="opacity:0.6" />
          </div>
          <!-- パスワード: 新規のみ -->
          <div v-if="!editingUser" class="form-group">
            <label>パスワード <span class="required">*</span></label>
            <input v-model="form.password" type="password" required minlength="6" placeholder="6文字以上" :disabled="isSubmitting" />
          </div>
          <div class="form-group">
            <label>表示名 <span class="required">*</span></label>
            <input v-model="form.displayName" required :disabled="isSubmitting" />
          </div>
          <div class="form-group">
            <label>権限 <span class="required">*</span></label>
            <select v-model="form.role" :disabled="isSubmitting">
              <option value="user">一般ユーザー</option>
              <option value="admin">管理者</option>
            </select>
          </div>
          <div v-if="form.role === 'user'" class="form-group">
            <label>所属事業者 <span class="required">*</span></label>
            <select v-model="form.clientId" :disabled="isSubmitting">
              <option value="">選択してください</option>
              <option v-for="c in masterStore.clients" :key="c.id" :value="c.id">{{ c.clientName }}</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="showForm = false" :disabled="isSubmitting">キャンセル</button>
            <button type="submit" class="btn-primary" :disabled="isSubmitting">{{ isSubmitting ? '保存中...' : (editingUser ? '更新' : '作成') }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
