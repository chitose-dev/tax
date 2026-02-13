import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mockClients, mockFacilities, mockRooms } from '@/lib/mock-data'

export const useMasterStore = defineStore('master', () => {
  const clients = ref([...mockClients])
  const facilities = ref([...mockFacilities])
  const rooms = ref([...mockRooms])
  const isLoading = ref(false)

  // --- Clients ---
  function getClientById(id) {
    return clients.value.find(c => c.id === id)
  }

  function addClient(data) {
    const newClient = { id: 'client-' + Date.now(), ...data, createdAt: new Date(), updatedAt: new Date() }
    clients.value.push(newClient)
    return newClient
  }

  function updateClient(id, data) {
    const idx = clients.value.findIndex(c => c.id === id)
    if (idx !== -1) {
      clients.value[idx] = { ...clients.value[idx], ...data, updatedAt: new Date() }
    }
  }

  function deleteClient(id) {
    clients.value = clients.value.filter(c => c.id !== id)
  }

  // --- Facilities ---
  function getFacilitiesByClient(clientId) {
    return facilities.value.filter(f => f.clientId === clientId)
  }

  function addFacility(data) {
    const newFacility = { id: 'facility-' + Date.now(), ...data, createdAt: new Date(), updatedAt: new Date() }
    facilities.value.push(newFacility)
    return newFacility
  }

  function updateFacility(id, data) {
    const idx = facilities.value.findIndex(f => f.id === id)
    if (idx !== -1) {
      facilities.value[idx] = { ...facilities.value[idx], ...data, updatedAt: new Date() }
    }
  }

  function deleteFacility(id) {
    facilities.value = facilities.value.filter(f => f.id !== id)
  }

  // --- Rooms ---
  function getRoomsByFacility(facilityId) {
    return rooms.value.filter(r => r.facilityId === facilityId)
  }

  function addRoom(data) {
    const newRoom = { id: 'room-' + Date.now(), ...data, createdAt: new Date(), updatedAt: new Date() }
    rooms.value.push(newRoom)
    return newRoom
  }

  function updateRoom(id, data) {
    const idx = rooms.value.findIndex(r => r.id === id)
    if (idx !== -1) {
      rooms.value[idx] = { ...rooms.value[idx], ...data, updatedAt: new Date() }
    }
  }

  function deleteRoom(id) {
    rooms.value = rooms.value.filter(r => r.id !== id)
  }

  return {
    clients, facilities, rooms, isLoading,
    getClientById, addClient, updateClient, deleteClient,
    getFacilitiesByClient, addFacility, updateFacility, deleteFacility,
    getRoomsByFacility, addRoom, updateRoom, deleteRoom
  }
})
