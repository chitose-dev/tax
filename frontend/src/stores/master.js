import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getCached, setCache, clearCache } from '@/lib/cache'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const CACHE_TTL = 5 * 60 * 1000 // 5分（APIリフェッチ間隔）

export const useMasterStore = defineStore('master', () => {
  const clients = ref([])
  const facilities = ref([])
  const rooms = ref([])
  const isLoading = ref(false)

  const _cacheTime = { clients: 0, facilities: 0, rooms: 0 }

  function _isCacheValid(key) {
    return Date.now() - _cacheTime[key] < CACHE_TTL
  }

  // localStorageから即座に復元
  function _restoreFromCache() {
    const cached = {
      clients: getCached('clients'),
      facilities: getCached('facilities'),
      rooms: getCached('rooms')
    }
    if (cached.clients?.data?.length) {
      clients.value = cached.clients.data
      _cacheTime.clients = cached.clients.timestamp
    }
    if (cached.facilities?.data?.length) {
      facilities.value = cached.facilities.data
      _cacheTime.facilities = cached.facilities.timestamp
    }
    if (cached.rooms?.data?.length) {
      rooms.value = cached.rooms.data
      _cacheTime.rooms = cached.rooms.timestamp
    }
  }

  // localStorageに保存
  function _persistCache(key, data) {
    setCache(key, data)
    _cacheTime[key] = Date.now()
  }

  async function init() {
    if (USE_MOCK) {
      const { mockClients, mockFacilities, mockRooms } = await import('@/lib/mock-data')
      clients.value = [...mockClients]
      facilities.value = [...mockFacilities]
      rooms.value = [...mockRooms]
      return
    }

    // Step 1: localStorageから即座に復元（UIがすぐ表示される）
    _restoreFromCache()

    // Step 2: バックグラウンドでAPIから最新データを取得
    _refreshInBackground()
  }

  // バックグラウンドリフレッシュ（awaitしない）
  async function _refreshInBackground() {
    // /clients は管理者限定のため、一般ユーザーでは呼ばない（無駄な403を防ぐ）
    const { useAuthStore } = await import('@/stores/auth')
    const isAdmin = useAuthStore().isAdmin
    const tasks = [
      _fetchAndCache('facilities', '/facilities'),
      _fetchAndCache('rooms', '/rooms'),
    ]
    if (isAdmin) tasks.unshift(_fetchAndCache('clients', '/clients'))
    Promise.all(tasks).catch(e => console.error('Background refresh failed:', e))
  }

  async function _fetchAndCache(key, endpoint) {
    try {
      const { api } = await import('@/lib/api')
      const data = await api.get(endpoint)
      if (key === 'clients') clients.value = data
      else if (key === 'facilities') facilities.value = data
      else if (key === 'rooms') rooms.value = data
      _persistCache(key, data)
    } catch (e) {
      // 認証/権限エラーは正常系（未ログイン or 一般ユーザーの一覧取得など）。ログを出さない
      if (e?.status === 401 || e?.status === 403) return
      console.error(`Failed to fetch ${key}:`, e)
    }
  }

  // --- Clients ---
  function getClientById(id) {
    return clients.value.find(c => c.id === id)
  }

  async function fetchClients(force = false) {
    if (USE_MOCK) return
    if (!force && _isCacheValid('clients') && clients.value.length) return
    isLoading.value = true
    try {
      const { api } = await import('@/lib/api')
      clients.value = await api.get('/clients')
      _persistCache('clients', clients.value)
    } catch (e) {
      // 一般ユーザーは /clients 一覧アクセス不可（403）。空配列のまま継続
      if (e?.status !== 403) throw e
    } finally { isLoading.value = false }
  }

  async function addClient(data) {
    if (USE_MOCK) {
      const newClient = { id: 'client-' + Date.now(), ...data, createdAt: new Date(), updatedAt: new Date() }
      clients.value.push(newClient)
      return newClient
    }
    isLoading.value = true
    try {
      const { api } = await import('@/lib/api')
      const newClient = await api.post('/clients', data)
      clients.value.push(newClient)
      _persistCache('clients', clients.value)
      return newClient
    } finally { isLoading.value = false }
  }

  async function updateClient(id, data) {
    if (USE_MOCK) {
      const idx = clients.value.findIndex(c => c.id === id)
      if (idx !== -1) clients.value[idx] = { ...clients.value[idx], ...data, updatedAt: new Date() }
      return
    }
    isLoading.value = true
    try {
      const { api } = await import('@/lib/api')
      const updated = await api.put(`/clients/${id}`, data)
      const idx = clients.value.findIndex(c => c.id === id)
      if (idx !== -1) clients.value[idx] = updated
      _persistCache('clients', clients.value)
    } finally { isLoading.value = false }
  }

  async function deleteClient(id) {
    if (USE_MOCK) {
      clients.value = clients.value.filter(c => c.id !== id)
      return
    }
    isLoading.value = true
    try {
      const { api } = await import('@/lib/api')
      await api.delete(`/clients/${id}`)
      clients.value = clients.value.filter(c => c.id !== id)
      _persistCache('clients', clients.value)
    } finally { isLoading.value = false }
  }

  // --- Facilities ---
  function getFacilitiesByClient(clientId) {
    return facilities.value.filter(f => f.clientId === clientId)
  }

  async function fetchFacilities(clientId, force = false) {
    if (USE_MOCK) return
    // clientId未指定（全件取得）時のみキャッシュ有効。clientId指定時は常にAPI取得（混在防止）
    if (!force && !clientId && _isCacheValid('facilities') && facilities.value.length) return
    isLoading.value = true
    try {
      const { api } = await import('@/lib/api')
      const params = clientId ? { clientId } : {}
      const data = await api.get('/facilities', params)
      if (clientId) {
        facilities.value = facilities.value.filter(f => f.clientId !== clientId).concat(data)
      } else {
        facilities.value = data
      }
      _persistCache('facilities', facilities.value)
    } finally { isLoading.value = false }
  }

  async function addFacility(data) {
    if (USE_MOCK) {
      const newFacility = { id: 'facility-' + Date.now(), ...data, createdAt: new Date(), updatedAt: new Date() }
      facilities.value.push(newFacility)
      return newFacility
    }
    isLoading.value = true
    try {
      const { api } = await import('@/lib/api')
      const newFacility = await api.post('/facilities', data)
      facilities.value.push(newFacility)
      _persistCache('facilities', facilities.value)
      return newFacility
    } finally { isLoading.value = false }
  }

  async function updateFacility(id, data) {
    if (USE_MOCK) {
      const idx = facilities.value.findIndex(f => f.id === id)
      if (idx !== -1) facilities.value[idx] = { ...facilities.value[idx], ...data, updatedAt: new Date() }
      return
    }
    isLoading.value = true
    try {
      const { api } = await import('@/lib/api')
      const updated = await api.put(`/facilities/${id}`, data)
      const idx = facilities.value.findIndex(f => f.id === id)
      if (idx !== -1) facilities.value[idx] = updated
      _persistCache('facilities', facilities.value)
    } finally { isLoading.value = false }
  }

  async function deleteFacility(id) {
    if (USE_MOCK) {
      facilities.value = facilities.value.filter(f => f.id !== id)
      return
    }
    isLoading.value = true
    try {
      const { api } = await import('@/lib/api')
      await api.delete(`/facilities/${id}`)
      facilities.value = facilities.value.filter(f => f.id !== id)
      _persistCache('facilities', facilities.value)
    } finally { isLoading.value = false }
  }

  // --- Rooms ---
  function getRoomsByFacility(facilityId) {
    return rooms.value.filter(r => r.facilityId === facilityId)
  }

  async function fetchRooms(facilityId, force = false) {
    if (USE_MOCK) return
    if (!force && !facilityId && _isCacheValid('rooms') && rooms.value.length) return
    isLoading.value = true
    try {
      const { api } = await import('@/lib/api')
      const params = facilityId ? { facilityId } : {}
      const data = await api.get('/rooms', params)
      if (facilityId) {
        rooms.value = rooms.value.filter(r => r.facilityId !== facilityId).concat(data)
      } else {
        rooms.value = data
      }
      _persistCache('rooms', rooms.value)
    } finally { isLoading.value = false }
  }

  async function addRoom(data) {
    if (USE_MOCK) {
      const newRoom = { id: 'room-' + Date.now(), ...data, createdAt: new Date(), updatedAt: new Date() }
      rooms.value.push(newRoom)
      return newRoom
    }
    isLoading.value = true
    try {
      const { api } = await import('@/lib/api')
      const newRoom = await api.post('/rooms', data)
      rooms.value.push(newRoom)
      _persistCache('rooms', rooms.value)
      return newRoom
    } finally { isLoading.value = false }
  }

  async function updateRoom(id, data) {
    if (USE_MOCK) {
      const idx = rooms.value.findIndex(r => r.id === id)
      if (idx !== -1) rooms.value[idx] = { ...rooms.value[idx], ...data, updatedAt: new Date() }
      return
    }
    isLoading.value = true
    try {
      const { api } = await import('@/lib/api')
      const updated = await api.put(`/rooms/${id}`, data)
      const idx = rooms.value.findIndex(r => r.id === id)
      if (idx !== -1) rooms.value[idx] = updated
      _persistCache('rooms', rooms.value)
    } finally { isLoading.value = false }
  }

  async function deleteRoom(id) {
    if (USE_MOCK) {
      rooms.value = rooms.value.filter(r => r.id !== id)
      return
    }
    isLoading.value = true
    try {
      const { api } = await import('@/lib/api')
      await api.delete(`/rooms/${id}`)
      rooms.value = rooms.value.filter(r => r.id !== id)
      _persistCache('rooms', rooms.value)
    } finally { isLoading.value = false }
  }

  // Initialize mock data if needed
  init()

  return {
    clients, facilities, rooms, isLoading,
    getClientById, addClient, updateClient, deleteClient, fetchClients,
    getFacilitiesByClient, addFacility, updateFacility, deleteFacility, fetchFacilities,
    getRoomsByFacility, addRoom, updateRoom, deleteRoom, fetchRooms,
    init
  }
})
