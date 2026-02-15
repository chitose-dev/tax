<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMasterStore } from '@/stores/master'

const authStore = useAuthStore()
const masterStore = useMasterStore()

const myClient = computed(() => {
  return masterStore.getClientById(authStore.clientId)
})

const editing = ref(false)
const form = ref({
  clientCode: '', clientName: '', representativeName: '',
  address: '', phone: '', email: '', notes: ''
})

function startEdit() {
  const c = myClient.value
  if (c) {
    form.value = {
      clientCode: c.clientCode || '',
      clientName: c.clientName || '',
      representativeName: c.representativeName || '',
      address: c.address || '',
      phone: c.phone || '',
      email: c.email || '',
      notes: c.notes || ''
    }
  }
  editing.value = true
}

function saveSettings() {
  if (!form.value.clientName?.trim()) {
    alert('事業者名は必須です')
    return
  }
  masterStore.updateClient(authStore.clientId, { ...form.value })
  editing.value = false
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

    <div v-if="!myClient" class="alert alert-warning">
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
              <div class="detail-value">{{ myClient.representativeName || '未設定' }}</div>
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
            <div class="form-group"><label>事業者コード</label><input v-model="form.clientCode" maxlength="20" /></div>
            <div class="form-group"><label>事業者名 <span class="required">*</span></label><input v-model="form.clientName" required maxlength="100" /></div>
            <div class="form-group"><label>代表者名</label><input v-model="form.representativeName" maxlength="50" /></div>
            <div class="form-group"><label>住所</label><input v-model="form.address" maxlength="200" /></div>
            <div class="form-group"><label>電話番号</label><input v-model="form.phone" type="tel" maxlength="15" /></div>
            <div class="form-group"><label>メール</label><input v-model="form.email" type="email" maxlength="254" /></div>
            <div class="form-group"><label>備考</label><textarea v-model="form.notes" rows="2" maxlength="500"></textarea></div>
            <div class="flex gap-2" style="margin-top: 20px;">
              <button type="submit" class="btn-primary">保存</button>
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
