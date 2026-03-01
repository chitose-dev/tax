import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const useMasterStore = defineStore('master', () => {
  const clients = ref([])
  const facilities = ref([])
  const rooms = ref([])
  const isLoading = ref(false)

  async function init() {
    if (USE_MOCK) {
      const { mockClients, mockFacilities, mockRooms } = await import('@/lib/mock-data')
      clients.value = [...mockClients]
      facilities.value = [...mockFacilities]
      rooms.value = [...mockRooms]
    }
  }

  // --- Clients ---
  function getClientById(id) {
    return clients.value.find(c => c.id === id)
  }

  async function fetchClients() {
    if (USE_MOCK) return
    isLoading.value = true
    try {
      const { api } = await import('@/lib/api')
      clients.value = await api.get('/clients')
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
    } finally { isLoading.value = false }
  }

  // --- Facilities ---
  function getFacilitiesByClient(clientId) {
    return facilities.value.filter(f => f.clientId === clientId)
  }

  async function fetchFacilities(clientId) {
    if (USE_MOCK) return
    isLoading.value = true
    try {
      const { api } = await import('@/lib/api')
      const data = await api.get('/facilities', { clientId })
      // Merge: replace facilities for this client
      facilities.value = facilities.value.filter(f => f.clientId !== clientId).concat(data)
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
    } finally { isLoading.value = false }
  }

  // --- Rooms ---
  function getRoomsByFacility(facilityId) {
    return rooms.value.filter(r => r.facilityId === facilityId)
  }

  async function fetchRooms(facilityId) {
    if (USE_MOCK) return
    isLoading.value = true
    try {
      const { api } = await import('@/lib/api')
      const data = await api.get('/rooms', { facilityId })
      rooms.value = rooms.value.filter(r => r.facilityId !== facilityId).concat(data)
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
    } finally { isLoading.value = false }
  }

  // Initialize mock data if needed
  init()

  return {
    clients, facilities, rooms, isLoading,
    getClientById, addClient, updateClient, deleteClient, fetchClients,
    getFacilitiesByClient, addFacility, updateFacility, deleteFacility, fetchFacilities,
    getRoomsByFacility, addRoom, updateRoom, deleteRoom, fetchRooms
  }
})
