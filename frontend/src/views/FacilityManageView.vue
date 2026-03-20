<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMasterStore } from '@/stores/master'

const authStore = useAuthStore()
const masterStore = useMasterStore()

// 施設フォームで事業者プルダウンを表示するためにクライアントデータを取得
onMounted(async () => {
  if (!masterStore.clients.length) {
    await masterStore.fetchClients()
  }
})

const activeTab = ref('facilities')

// 管理者は事業者を選択可能、一般ユーザーは自分のclientIdに固定
const selectedClientId = ref(authStore.isAdmin ? '' : authStore.clientId)

const effectiveClientId = computed(() => {
  if (!authStore.isAdmin) return authStore.clientId
  return selectedClientId.value || ''
})

// フィルタされた施設
const filteredFacilities = computed(() => {
  if (!effectiveClientId.value) return masterStore.facilities
  return masterStore.facilities.filter(f => f.clientId === effectiveClientId.value)
})

// フィルタされた部屋（表示中の施設に紐づくもの）
const filteredRooms = computed(() => {
  const facilityIds = filteredFacilities.value.map(f => f.id)
  return masterStore.rooms.filter(r => facilityIds.includes(r.facilityId))
})

// ROOM-01: 部屋タブの施設絞り込み
const roomFilterFacilityId = ref('')
const displayedRooms = computed(() => {
  if (!roomFilterFacilityId.value) return filteredRooms.value
  return filteredRooms.value.filter(r => r.facilityId === roomFilterFacilityId.value)
})

// --- Facility ---
const showFacilityForm = ref(false)
const editingFacility = ref(null)

function openFacilityForm(facility = null) {
  editingFacility.value = facility
  showFacilityForm.value = true
  formError.value = ''
}
const formError = ref('')

async function saveFacility(data) {
  formError.value = ''
  try {
    if (editingFacility.value) {
      await masterStore.updateFacility(editingFacility.value.id, data)
    } else {
      await masterStore.addFacility(data)
    }
    showFacilityForm.value = false
    // 施設一覧を再取得して確実に反映
    await masterStore.fetchFacilities(null, true)
  } catch (e) {
    formError.value = e.message || '施設の保存に失敗しました'
  }
}
async function deleteFacility(facility) {
  if (confirm(`「${facility.facilityName}」を削除しますか？`)) {
    try {
      await masterStore.deleteFacility(facility.id)
    } catch (e) {
      formError.value = e.message || '施設の削除に失敗しました'
    }
  }
}

// --- Room ---
const showRoomForm = ref(false)
const editingRoom = ref(null)

function openRoomForm(room = null) {
  editingRoom.value = room
  showRoomForm.value = true
  formError.value = ''
}
async function saveRoom(data) {
  formError.value = ''
  try {
    if (editingRoom.value) {
      await masterStore.updateRoom(editingRoom.value.id, data)
    } else {
      await masterStore.addRoom(data)
    }
    showRoomForm.value = false
    // 部屋一覧を再取得して確実に反映
    await masterStore.fetchRooms(null, true)
  } catch (e) {
    formError.value = e.message || '部屋の保存に失敗しました'
  }
}
async function deleteRoom(room) {
  if (confirm(`「${room.roomName}」を削除しますか？`)) {
    try {
      await masterStore.deleteRoom(room.id)
    } catch (e) {
      formError.value = e.message || '部屋の削除に失敗しました'
    }
  }
}

function getClientName(clientId) {
  return masterStore.clients.find(c => c.id === clientId)?.clientName || '-'
}
function getFacilityName(facilityId) {
  return masterStore.facilities.find(f => f.id === facilityId)?.facilityName || '-'
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1>施設・部屋管理</h1>
      <p>施設と部屋の情報を管理します</p>
    </div>

    <!-- 管理者: 事業者選択 -->
    <div v-if="authStore.isAdmin" class="form-group" style="max-width: 320px; margin-bottom: 20px;">
      <label>事業者を選択</label>
      <select v-model="selectedClientId">
        <option value="">すべての事業者</option>
        <option v-for="c in masterStore.clients" :key="c.id" :value="c.id">{{ c.clientName }}</option>
      </select>
    </div>

    <div class="tabs">
      <button :class="['tab', { active: activeTab === 'facilities' }]" @click="activeTab = 'facilities'">施設</button>
      <button :class="['tab', { active: activeTab === 'rooms' }]" @click="activeTab = 'rooms'">部屋</button>
    </div>

    <!-- 施設 -->
    <div v-if="activeTab === 'facilities'" class="card">
      <div class="card-header">
        <h2>施設一覧</h2>
        <button v-if="authStore.isAdmin || authStore.clientId" class="btn-primary btn-sm" @click="openFacilityForm()">+ 新規登録</button>
      </div>
      <div class="card-body" style="padding:0">
        <div class="table-wrapper">
          <table>
            <thead><tr><th>事業者</th><th>コード</th><th>施設名</th><th>プレフィックス</th><th>状態</th><th v-if="authStore.isAdmin || authStore.clientId"></th></tr></thead>
            <tbody>
              <tr v-if="filteredFacilities.length === 0">
                <td :colspan="(authStore.isAdmin || authStore.clientId) ? 6 : 5" class="empty-state">施設が登録されていません</td>
              </tr>
              <tr v-for="f in filteredFacilities" :key="f.id">
                <td class="text-sm">{{ getClientName(f.clientId) }}</td>
                <td>{{ f.facilityCode || '-' }}</td>
                <td>{{ f.facilityName }}</td>
                <td><code style="background:var(--color-gray-100);padding:2px 6px;border-radius:4px">{{ f.roomCodePrefix }}</code></td>
                <td><span :class="['badge', f.isActive ? 'badge-success' : 'badge-error']">{{ f.isActive ? '有効' : '無効' }}</span></td>
                <td v-if="authStore.isAdmin || authStore.clientId" style="text-align:right;white-space:nowrap">
                  <button v-if="authStore.isAdmin || f.clientId === authStore.clientId" class="btn-secondary btn-sm" @click="openFacilityForm(f)" style="margin-right:4px">編集</button>
                  <button v-if="authStore.isAdmin" class="btn-danger btn-sm" @click="deleteFacility(f)">削除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 部屋 -->
    <div v-if="activeTab === 'rooms'" class="card">
      <div class="card-header">
        <h2>部屋一覧</h2>
        <button v-if="authStore.isAdmin || authStore.clientId" class="btn-primary btn-sm" @click="openRoomForm()">+ 新規登録</button>
      </div>
      <div class="card-body">
        <div class="form-group" style="max-width:300px;margin-bottom:16px">
          <label>施設で絞り込み</label>
          <select v-model="roomFilterFacilityId">
            <option value="">すべての施設</option>
            <option v-for="f in filteredFacilities" :key="f.id" :value="f.id">{{ f.facilityName }}</option>
          </select>
        </div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>施設</th><th>部屋コード</th><th>部屋名</th><th>定員</th><th>状態</th><th v-if="authStore.isAdmin || authStore.clientId"></th></tr></thead>
            <tbody>
              <tr v-if="displayedRooms.length === 0">
                <td :colspan="(authStore.isAdmin || authStore.clientId) ? 6 : 5" class="empty-state">部屋が登録されていません</td>
              </tr>
              <tr v-for="r in displayedRooms" :key="r.id">
                <td class="text-sm">{{ getFacilityName(r.facilityId) }}</td>
                <td><code style="background:var(--color-gray-100);padding:2px 6px;border-radius:4px">{{ r.roomCode }}</code></td>
                <td>{{ r.roomName }}</td>
                <td>{{ r.capacity || '-' }}</td>
                <td><span :class="['badge', r.isActive ? 'badge-success' : 'badge-error']">{{ r.isActive ? '有効' : '無効' }}</span></td>
                <td v-if="authStore.isAdmin || authStore.clientId" style="text-align:right;white-space:nowrap">
                  <button class="btn-secondary btn-sm" @click="openRoomForm(r)" style="margin-right:4px">編集</button>
                  <button v-if="authStore.isAdmin" class="btn-danger btn-sm" @click="deleteRoom(r)">削除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Facility Form Modal -->
    <div v-if="showFacilityForm" class="modal-overlay" @click.self="showFacilityForm = false">
      <div class="modal">
        <h3>{{ editingFacility ? '施設編集' : '新規施設登録' }}</h3>
        <div v-if="formError" style="color: var(--danger-color, #e74c3c); margin-bottom: 12px; font-size: 0.9em; padding: 8px 12px; background: #fef2f2; border-radius: 6px">{{ formError }}</div>
        <FacilityFormInline
          :facility="editingFacility"
          :clients="authStore.isAdmin ? masterStore.clients : masterStore.clients.filter(c => c.id === authStore.clientId)"
          :default-client-id="effectiveClientId"
          :lock-client="!authStore.isAdmin"
          @save="saveFacility"
          @close="showFacilityForm = false"
        />
      </div>
    </div>

    <!-- Room Form Modal -->
    <div v-if="showRoomForm" class="modal-overlay" @click.self="showRoomForm = false">
      <div class="modal">
        <h3>{{ editingRoom ? '部屋編集' : '新規部屋登録' }}</h3>
        <div v-if="formError" style="color: var(--danger-color, #e74c3c); margin-bottom: 12px; font-size: 0.9em; padding: 8px 12px; background: #fef2f2; border-radius: 6px">{{ formError }}</div>
        <RoomFormInline
          :room="editingRoom"
          :facilities="filteredFacilities"
          @save="saveRoom"
          @close="showRoomForm = false"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'

const FacilityFormInline = {
  props: { facility: Object, clients: Array, defaultClientId: String, lockClient: Boolean },
  emits: ['save', 'close'],
  setup(props, { emit }) {
    const form = ref({ clientId: '', facilityCode: '', facilityName: '', roomCodePrefix: '', address: '', phone: '', capacity: null, notes: '', isActive: true })
    const validationError = ref('')
    onMounted(() => {
      if (props.facility) {
        form.value = { clientId: props.facility.clientId||'', facilityCode: props.facility.facilityCode||'', facilityName: props.facility.facilityName||'', roomCodePrefix: props.facility.roomCodePrefix||'', address: props.facility.address||'', phone: props.facility.phone||'', capacity: props.facility.capacity??null, notes: props.facility.notes||'', isActive: props.facility.isActive !== false }
      } else if (props.defaultClientId) {
        form.value.clientId = props.defaultClientId
      }
    })
    return { form, validationError, submit() {
      validationError.value = ''
      if (!form.value.clientId) { validationError.value = '事業者を選択してください'; return }
      if (!form.value.facilityName?.trim()) { validationError.value = '施設名は必須です（空白のみは不可）'; return }
      if (!form.value.roomCodePrefix || form.value.roomCodePrefix.length !== 1) { validationError.value = 'プレフィックスは1文字で入力してください'; return }
      form.value.roomCodePrefix = form.value.roomCodePrefix.toUpperCase()
      // null/undefinedのオプショナルフィールドを除去（API 422防止）
      const data = {
        clientId: form.value.clientId,
        facilityCode: form.value.facilityCode || '',
        facilityName: form.value.facilityName,
        roomCodePrefix: form.value.roomCodePrefix,
        isActive: form.value.isActive
      }
      if (form.value.address?.trim()) data.address = form.value.address
      if (form.value.phone?.trim()) data.phone = form.value.phone
      if (form.value.capacity != null && form.value.capacity !== '' && !isNaN(form.value.capacity)) data.capacity = Number(form.value.capacity)
      emit('save', data)
    }}
  },
  template: `<form @submit.prevent="submit">
    <div v-if="validationError" style="color: var(--danger-color, #e74c3c); margin-bottom: 12px; font-size: 0.9em; padding: 8px 12px; background: #fef2f2; border-radius: 6px">{{ validationError }}</div>
    <div class="form-group"><label>事業者 <span class="required">*</span></label><select v-model="form.clientId" required :disabled="!!facility || lockClient"><option value="">選択してください</option><option v-for="c in clients" :key="c.id" :value="c.id">{{c.clientName}}</option></select></div>
    <div class="form-group"><label>施設コード</label><input v-model="form.facilityCode" maxlength="20" placeholder="後日設定可能" /></div>
    <div class="form-group"><label>施設名 <span class="required">*</span></label><input v-model="form.facilityName" required maxlength="100" /></div>
    <div class="form-group"><label>プレフィックス <span class="required">*</span><span class="hint">（1文字固定）</span></label><input v-model="form.roomCodePrefix" required maxlength="1" minlength="1" class="input-small" @input="form.roomCodePrefix = form.roomCodePrefix.toUpperCase()" /><p class="form-hint">CSVの部屋コード先頭1桁と照合して施設を自動識別します（例: A→施設A, K→施設K）</p></div>
    <div class="form-group"><label>所在地</label><input v-model="form.address" maxlength="200" /></div>
    <div class="form-group"><label>電話</label><input v-model="form.phone" type="tel" maxlength="15" /></div>
    <div class="form-group"><label>収容人数</label><input :value="form.capacity" @input="form.capacity = $event.target.value === '' ? null : Number($event.target.value)" type="number" min="0" class="input-small" /></div>
    <div class="form-group"><label>備考</label><textarea v-model="form.notes" rows="2" maxlength="500"></textarea></div>
    <div class="form-group"><label class="checkbox"><input type="checkbox" v-model="form.isActive" />有効</label></div>
    <div class="modal-actions"><button type="button" class="btn-secondary" @click="$emit('close')">キャンセル</button><button type="submit" class="btn-primary">保存</button></div>
  </form>`
}

const RoomFormInline = {
  props: { room: Object, facilities: Array },
  emits: ['save', 'close'],
  setup(props, { emit }) {
    const form = ref({ facilityId: '', roomCode: '', roomName: '', capacity: null, notes: '', isActive: true })
    const validationError = ref('')
    const selectedPrefix = computed(() => {
      const f = props.facilities.find(f => f.id === form.value.facilityId)
      return f?.roomCodePrefix || ''
    })
    onMounted(() => {
      if (props.room) form.value = { facilityId: props.room.facilityId||'', roomCode: props.room.roomCode||'', roomName: props.room.roomName||'', capacity: props.room.capacity??null, notes: props.room.notes||'', isActive: props.room.isActive !== false }
    })
    return { form, validationError, selectedPrefix, submit() {
      validationError.value = ''
      if (!form.value.facilityId) { validationError.value = '施設を選択してください'; return }
      if (!form.value.roomCode?.trim()) { validationError.value = '部屋コードは必須です（空白のみは不可）'; return }
      if (!form.value.roomName?.trim()) { validationError.value = '部屋名は必須です（空白のみは不可）'; return }
      form.value.roomCode = form.value.roomCode.toUpperCase()
      if (selectedPrefix.value && !form.value.roomCode.startsWith(selectedPrefix.value)) {
        validationError.value = `部屋コードは「${selectedPrefix.value}」で始まる必要があります`
        return
      }
      // ROOM-05: null/undefinedのフィールドを除去（capacityは空なら送信しない）
      const data = { facilityId: form.value.facilityId, roomCode: form.value.roomCode, roomName: form.value.roomName }
      if (form.value.capacity != null && form.value.capacity !== '' && !isNaN(form.value.capacity)) data.capacity = Number(form.value.capacity)
      if (form.value.notes?.trim()) data.notes = form.value.notes
      data.isActive = form.value.isActive
      emit('save', data)
    }}
  },
  template: `<form @submit.prevent="submit">
    <div v-if="validationError" style="color: var(--danger-color, #e74c3c); margin-bottom: 12px; font-size: 0.9em; padding: 8px 12px; background: #fef2f2; border-radius: 6px">{{ validationError }}</div>
    <div class="form-group"><label>施設 <span class="required">*</span></label><select v-model="form.facilityId" required :disabled="!!room"><option value="">選択</option><option v-for="f in facilities" :key="f.id" :value="f.id">{{f.facilityName}}（{{f.roomCodePrefix}}）</option></select></div>
    <div class="form-group"><label>部屋コード <span class="required">*</span><span class="hint" v-if="selectedPrefix">（{{selectedPrefix}}で始めてください）</span></label><input v-model="form.roomCode" required maxlength="10" @input="form.roomCode = form.roomCode.toUpperCase()" /></div>
    <div class="form-group"><label>部屋名 <span class="required">*</span></label><input v-model="form.roomName" required maxlength="50" /></div>
    <div class="form-group"><label>定員</label><input :value="form.capacity" @input="form.capacity = $event.target.value === '' ? null : Number($event.target.value)" type="number" min="0" class="input-small" /></div>
    <div class="form-group"><label>備考</label><textarea v-model="form.notes" rows="2" maxlength="500"></textarea></div>
    <div class="form-group"><label class="checkbox"><input type="checkbox" v-model="form.isActive" />有効</label></div>
    <div class="modal-actions"><button type="button" class="btn-secondary" @click="$emit('close')">キャンセル</button><button type="submit" class="btn-primary">保存</button></div>
  </form>`
}

export default {
  components: { FacilityFormInline, RoomFormInline }
}
</script>
