<script setup>
import { ref, onMounted } from 'vue'
import { useMasterStore } from '@/stores/master'
import { useAuthStore } from '@/stores/auth'
import { db, secondaryAuth } from '@/lib/firebase'
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as secondarySignOut } from 'firebase/auth'

const masterStore = useMasterStore()
const authStore = useAuthStore()

const users = ref([])
const isLoading = ref(false)
const showForm = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const form = ref({ email: '', password: '', displayName: '', role: 'user', clientId: '' })

function getClientName(clientId) {
  if (!clientId) return '-'
  return masterStore.clients.find(c => c.id === clientId)?.clientName || clientId
}

async function fetchUsers() {
  isLoading.value = true
  try {
    const snapshot = await getDocs(collection(db, 'users'))
    users.value = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (e) {
    console.error('ユーザー一覧の取得に失敗:', e)
    errorMessage.value = 'ユーザー一覧の取得に失敗しました'
  } finally {
    isLoading.value = false
  }
}

async function addUser() {
  if (!form.value.email || !form.value.password || !form.value.displayName) {
    errorMessage.value = '必須項目を入力してください'
    return
  }
  if (form.value.role === 'user' && !form.value.clientId) {
    errorMessage.value = '一般ユーザーには事業者の選択が必要です'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    let uid

    try {
      // セカンダリAuthでユーザー作成（メインのログインセッションに影響しない）
      const credential = await createUserWithEmailAndPassword(
        secondaryAuth, form.value.email, form.value.password
      )
      uid = credential.user.uid
      await secondarySignOut(secondaryAuth)
    } catch (createErr) {
      if (createErr.code === 'auth/email-already-in-use') {
        // Firebase Authにアカウントが残っている場合（削除後の再作成など）
        // パスワードでサインインしてUIDを取得し、Firestoreプロフィールを再作成
        try {
          const credential = await signInWithEmailAndPassword(
            secondaryAuth, form.value.email, form.value.password
          )
          uid = credential.user.uid
          await secondarySignOut(secondaryAuth)
        } catch (signInErr) {
          if (signInErr.code === 'auth/wrong-password' || signInErr.code === 'auth/invalid-credential') {
            errorMessage.value = 'このメールアドレスは既にFirebase Authに登録されていますが、パスワードが一致しません。同じパスワードを入力するか、Firebaseコンソールからアカウントを削除してください。'
          } else {
            errorMessage.value = `既存アカウントの復旧に失敗しました: ${signInErr.message}`
          }
          isSubmitting.value = false
          return
        }
      } else {
        throw createErr
      }
    }

    // Firestoreにユーザープロフィール保存（新規 or 再作成）
    await setDoc(doc(db, 'users', uid), {
      email: form.value.email,
      displayName: form.value.displayName,
      role: form.value.role,
      clientId: form.value.role === 'user' ? form.value.clientId : null,
      facilityIds: [],
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    // 一覧を再取得
    await fetchUsers()
    showForm.value = false
    form.value = { email: '', password: '', displayName: '', role: 'user', clientId: '' }
  } catch (e) {
    const messages = {
      'auth/invalid-email': 'メールアドレスの形式が正しくありません',
      'auth/weak-password': 'パスワードは6文字以上にしてください',
    }
    errorMessage.value = messages[e.code] || `ユーザー作成に失敗しました: ${e.message}`
  } finally {
    isSubmitting.value = false
  }
}

async function toggleActive(user) {
  try {
    await setDoc(doc(db, 'users', user.id), {
      isActive: !user.isActive,
      updatedAt: serverTimestamp()
    }, { merge: true })
    user.isActive = !user.isActive
  } catch (e) {
    errorMessage.value = 'ステータスの更新に失敗しました'
  }
}

async function deleteUser(user) {
  if (user.id === authStore.user?.uid) {
    errorMessage.value = '自分自身は削除できません'
    return
  }
  if (!confirm(`「${user.displayName || user.email}」を完全に削除しますか？\nFirebase AuthとFirestoreの両方から削除されます。`)) return

  try {
    // バックエンドAPI経由で物理削除（Firebase Auth + Firestore両方）
    const { api } = await import('@/lib/api')
    await api.delete(`/users/${user.id}`)
    await fetchUsers()
  } catch (e) {
    console.error('ユーザー削除エラー:', e)
    errorMessage.value = 'ユーザーの削除に失敗しました: ' + (e.message || '不明なエラー')
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

    <div v-if="errorMessage" class="card mb-4" style="border-left: 4px solid var(--danger-color, #e74c3c)">
      <div class="card-body" style="padding: 12px 16px; display: flex; justify-content: space-between; align-items: center">
        <span>{{ errorMessage }}</span>
        <button class="btn-sm" style="border:none;background:none;cursor:pointer;font-size:1.2em" @click="errorMessage = ''">×</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>アカウント一覧</h2>
        <button class="btn-primary btn-sm" @click="showForm = true; errorMessage = ''">+ ユーザー追加</button>
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
                  <button class="btn-danger btn-sm" @click="deleteUser(u)" :disabled="u.id === authStore.user?.uid">削除</button>
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

    <!-- User Form Modal -->
    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal">
        <h3>ユーザー追加</h3>
        <div v-if="errorMessage" style="color: var(--danger-color, #e74c3c); margin-bottom: 12px; font-size: 0.9em">{{ errorMessage }}</div>
        <form @submit.prevent="addUser">
          <div class="form-group"><label>メールアドレス <span class="required">*</span></label><input v-model="form.email" type="email" required :disabled="isSubmitting" /></div>
          <div class="form-group"><label>パスワード <span class="required">*</span></label><input v-model="form.password" type="password" required minlength="6" placeholder="6文字以上" :disabled="isSubmitting" /></div>
          <div class="form-group"><label>表示名 <span class="required">*</span></label><input v-model="form.displayName" required :disabled="isSubmitting" /></div>
          <div class="form-group">
            <label>権限 <span class="required">*</span></label>
            <select v-model="form.role" :disabled="isSubmitting"><option value="user">一般ユーザー</option><option value="admin">管理者</option></select>
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
            <button type="submit" class="btn-primary" :disabled="isSubmitting">{{ isSubmitting ? '作成中...' : '作成' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
