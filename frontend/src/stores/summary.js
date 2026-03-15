import { defineStore } from 'pinia'
import { ref } from 'vue'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const useSummaryStore = defineStore('summary', () => {
  const summaries = ref([])
  const exportLogs = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  async function init() {
    if (USE_MOCK) {
      const { mockSummaries, mockExportLogs } = await import('@/lib/mock-data')
      summaries.value = [...mockSummaries]
      exportLogs.value = [...mockExportLogs]
    }
  }

  async function loadSummaries(clientId, options = {}) {
    if (USE_MOCK) {
      let results = summaries.value.filter(s => s.clientId === clientId)
      if (options.facilityId) results = results.filter(s => s.facilityId === options.facilityId)
      if (options.yearMonth) results = results.filter(s => s.yearMonth === options.yearMonth)
      if (options.status) results = results.filter(s => s.status === options.status)
      return results
    }
    isLoading.value = true
    try {
      const { api } = await import('@/lib/api')
      const data = await api.get('/summaries', {
        clientId,
        facilityId: options.facilityId,
        yearMonth: options.yearMonth,
        status: options.status
      })
      summaries.value = data
      return data
    } finally { isLoading.value = false }
  }

  async function saveSummary(data) {
    if (USE_MOCK) {
      const existing = summaries.value.find(
        s => s.clientId === data.clientId && s.facilityId === data.facilityId &&
             s.yearMonth === data.yearMonth && s.periodType === data.periodType
      )
      if (existing) {
        if (existing.status !== 'draft') throw new Error('確定済みの集計は更新できません')
        Object.assign(existing, data, { updatedAt: new Date() })
        return existing.id
      }
      const newSummary = { id: 'sum-' + Date.now(), ...data, createdAt: new Date(), updatedAt: new Date() }
      summaries.value.push(newSummary)
      return newSummary.id
    }
    isLoading.value = true
    try {
      const { api } = await import('@/lib/api')
      const result = await api.post('/summaries/generate', data)
      // Refresh summaries list
      if (data.clientId) await loadSummaries(data.clientId)
      return result.id
    } finally { isLoading.value = false }
  }

  async function updateStatus(summaryId, newStatus, userId) {
    if (USE_MOCK) {
      const s = summaries.value.find(s => s.id === summaryId)
      if (!s) throw new Error('集計が見つかりません')
      s.status = newStatus
      s.updatedAt = new Date()
      if (newStatus === 'confirmed' && userId) {
        s.confirmedAt = new Date()
        s.confirmedBy = userId
      }
      return
    }
    isLoading.value = true
    try {
      const { api } = await import('@/lib/api')
      const updated = await api.put(`/summaries/${summaryId}/confirm`)
      const idx = summaries.value.findIndex(s => s.id === summaryId)
      if (idx !== -1) summaries.value[idx] = updated
    } finally { isLoading.value = false }
  }

  async function deleteSummary(summaryId) {
    if (USE_MOCK) {
      const s = summaries.value.find(s => s.id === summaryId)
      if (!s) throw new Error('集計が見つかりません')
      if (s.status !== 'draft') throw new Error('確定済みの集計は削除できません')
      summaries.value = summaries.value.filter(s => s.id !== summaryId)
      return
    }
    isLoading.value = true
    try {
      const { api } = await import('@/lib/api')
      await api.delete(`/summaries/${summaryId}`)
      summaries.value = summaries.value.filter(s => s.id !== summaryId)
    } finally { isLoading.value = false }
  }

  async function exportSummary(clientId, yearMonth, format = 'csv') {
    if (USE_MOCK) {
      const log = { id: 'exp-' + Date.now(), clientId, fileName: `export_${yearMonth}.${format}`, createdAt: new Date(), downloadCount: 1 }
      exportLogs.value.unshift(log)
      return log
    }
    const { api } = await import('@/lib/api')
    const filename = `export_${yearMonth}.${format}`
    await api.download('/summaries/export', { clientId, yearMonth, format }, filename)
  }

  function addExportLog(data) {
    const log = { id: 'exp-' + Date.now(), ...data, createdAt: new Date(), downloadCount: 1 }
    exportLogs.value.unshift(log)
    return log
  }

  // Initialize
  init()

  return {
    summaries, exportLogs, isLoading, error,
    loadSummaries, saveSummary, updateStatus, deleteSummary,
    addExportLog, exportSummary
  }
})
