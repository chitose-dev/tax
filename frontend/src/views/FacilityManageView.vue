<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMasterStore } from '@/stores/master'

const authStore = useAuthStore()
const masterStore = useMasterStore()

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

// --- Facility ---
const showFacilityForm = ref(false)
const editingFacility = ref(null)

function openFacilityForm(facility = null) {
  editingFacility.value = facility
  showFacilityForm.value = true
}
function saveFacility(data) {
  if (editingFacility.value) {
    masterStore.updateFacility(editingFacility.value.id, data)
  } else {
    masterStore.addFacility(data)
  }
  showFacilityForm.value = false
}
function deleteFacility(facility) {
  if (confirm(`「${facility.facilityName}」を削除しますか？`)) {
    masterStore.deleteFacility(facility.id)
  }
}

// --- Room ---
const showRoomForm = ref(false)
const editingRoom = ref(null)

function openRoomForm(room = null) {
  editingRoom.value = room
  showRoomForm.value = true
}
function saveRoom(data) {
  if (editingRoom.value) {
    masterStore.updateRoom(editingRoom.value.id, data)
  } else {
    masterStore.addRoom(data)
  }
  showRoomForm.value = false
}
function deleteRoom(room) {
  if (confirm(`「${room.roomName}」を削除しますか？`)) {
    masterStore.deleteRoom(room.id)
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
        <button class="btn-primary btn-sm" @click="openFacilityForm()">+ 新規登録</button>
      </div>
      <div class="card-body" style="padding:0">
        <div class="table-wrapper">
          <table>
            <thead><tr><th>事業者</th><th>コード</th><th>施設名</th><th>プレフィックス</th><th>状態</th><th></th></tr></thead>
            <tbody>
              <tr v-if="filteredFacilities.length === 0">
                <td colspan="6" class="empty-state">施設が登録されていません</td>
              </tr>
              <tr v-for="f in filteredFacilities" :key="f.id">
                <td class="text-sm">{{ getClientName(f.clientId) }}</td>
                <td>{{ f.facilityCode || '-' }}</td>
                <td>{{ f.facilityName }}</td>
                <td><code style="background:var(--color-gray-100);padding:2px 6px;border-radius:4px">{{ f.roomCodePrefix }}</code></td>
                <td><span :class="['badge', f.isActive ? 'badge-success' : 'badge-error']">{{ f.isActive ? '有効' : '無効' }}</span></td>
                <td style="text-align:right;white-space:nowrap">
                  <button class="btn-secondary btn-sm" @click="openFacilityForm(f)" style="margin-right:4px">編集</button>
                  <button class="btn-danger btn-sm" @click="deleteFacility(f)">削除</button>
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
        <button class="btn-primary btn-sm" @click="openRoomForm()">+ 新規登録</button>
      </div>
      <div class="card-body" style="padding:0">
        <div class="table-wrapper">
          <table>
            <thead><tr><th>施設</th><th>部屋コード</th><th>部屋名</th><th>定員</th><th>状態</th><th></th></tr></thead>
            <tbody>
              <tr v-if="filteredRooms.length === 0">
                <td colspan="6" class="empty-state">部屋が登録されていません</td>
              </tr>
              <tr v-for="r in filteredRooms" :key="r.id">
                <td class="text-sm">{{ getFacilityName(r.facilityId) }}</td>
                <td><code style="background:var(--color-gray-100);padding:2px 6px;border-radius:4px">{{ r.roomCode }}</code></td>
                <td>{{ r.roomName }}</td>
                <td>{{ r.capacity || '-' }}</td>
                <td><span :class="['badge', r.isActive ? 'badge-success' : 'badge-error']">{{ r.isActive ? '有効' : '無効' }}</span></td>
                <td style="text-align:right;white-space:nowrap">
                  <button class="btn-secondary btn-sm" @click="openRoomForm(r)" style="margin-right:4px">編集</button>
                  <button class="btn-danger btn-sm" @click="deleteRoom(r)">削除</button>
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
    onMounted(() => {
      if (props.facility) {
        form.value = { clientId: props.facility.clientId||'', facilityCode: props.facility.facilityCode||'', facilityName: props.facility.facilityName||'', roomCodePrefix: props.facility.roomCodePrefix||'', address: props.facility.address||'', phone: props.facility.phone||'', capacity: props.facility.capacity||null, notes: props.facility.notes||'', isActive: props.facility.isActive !== false }
      } else if (props.defaultClientId) {
        form.value.clientId = props.defaultClientId
      }
    })
    return { form, submit() {
      if (!form.value.clientId) { alert('事業者を選択してください'); return }
      if (!form.value.facilityName?.trim()) { alert('施設名は必須です'); return }
      if (!form.value.roomCodePrefix || form.value.roomCodePrefix.length !== 2) { alert('プレフィックスは2文字で入力してください'); return }
      form.value.roomCodePrefix = form.value.roomCodePrefix.toUpperCase()
      emit('save', { ...form.value })
    }}
  },
  template: `<form @submit.prevent="submit">
    <div class="form-group"><label>事業者 <span class="required">*</span></label><select v-model="form.clientId" required :disabled="!!facility || lockClient"><option value="">選択してください</option><option v-for="c in clients" :key="c.id" :value="c.id">{{c.clientName}}</option></select></div>
    <div class="form-group"><label>施設コード</label><input v-model="form.facilityCode" maxlength="20" placeholder="後日設定可能" /></div>
    <div class="form-group"><label>施設名 <span class="required">*</span></label><input v-model="form.facilityName" required maxlength="100" /></div>
    <div class="form-group"><label>プレフィックス <span class="required">*</span><span class="hint">（2文字固定）</span></label><input v-model="form.roomCodePrefix" required maxlength="2" minlength="2" class="input-small" @input="form.roomCodePrefix = form.roomCodePrefix.toUpperCase()" /><p class="form-hint">CSVの部屋コード先頭2桁と照合して施設を自動識別します</p></div>
    <div class="form-group"><label>所在地</label><input v-model="form.address" maxlength="200" /></div>
    <div class="form-group"><label>電話</label><input v-model="form.phone" type="tel" maxlength="15" /></div>
    <div class="form-group"><label>収容人数</label><input v-model.number="form.capacity" type="number" min="1" class="input-small" /></div>
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
    const selectedPrefix = computed(() => {
      const f = props.facilities.find(f => f.id === form.value.facilityId)
      return f?.roomCodePrefix || ''
    })
    onMounted(() => {
      if (props.room) form.value = { facilityId: props.room.facilityId||'', roomCode: props.room.roomCode||'', roomName: props.room.roomName||'', capacity: props.room.capacity||null, notes: props.room.notes||'', isActive: props.room.isActive !== false }
    })
    return { form, selectedPrefix, submit() {
      if (!form.value.facilityId) { alert('施設を選択してください'); return }
      if (!form.value.roomCode?.trim()) { alert('部屋コードは必須です'); return }
      if (!form.value.roomName?.trim()) { alert('部屋名は必須です'); return }
      form.value.roomCode = form.value.roomCode.toUpperCase()
      if (selectedPrefix.value && !form.value.roomCode.startsWith(selectedPrefix.value)) {
        alert(`部屋コードは「${selectedPrefix.value}」で始まる必要があります`)
        return
      }
      emit('save', { ...form.value })
    }}
  },
  template: `<form @submit.prevent="submit">
    <div class="form-group"><label>施設 <span class="required">*</span></label><select v-model="form.facilityId" required :disabled="!!room"><option value="">選択</option><option v-for="f in facilities" :key="f.id" :value="f.id">{{f.facilityName}}（{{f.roomCodePrefix}}）</option></select></div>
    <div class="form-group"><label>部屋コード <span class="required">*</span><span class="hint" v-if="selectedPrefix">（{{selectedPrefix}}で始めてください）</span></label><input v-model="form.roomCode" required maxlength="10" @input="form.roomCode = form.roomCode.toUpperCase()" /></div>
    <div class="form-group"><label>部屋名 <span class="required">*</span></label><input v-model="form.roomName" required maxlength="50" /></div>
    <div class="form-group"><label>定員</label><input v-model.number="form.capacity" type="number" min="1" class="input-small" /></div>
    <div class="form-group"><label>備考</label><textarea v-model="form.notes" rows="2" maxlength="500"></textarea></div>
    <div class="form-group"><label class="checkbox"><input type="checkbox" v-model="form.isActive" />有効</label></div>
    <div class="modal-actions"><button type="button" class="btn-secondary" @click="$emit('close')">キャンセル</button><button type="submit" class="btn-primary">保存</button></div>
  </form>`
}

export default {
  components: { FacilityFormInline, RoomFormInline }
}
</script>
