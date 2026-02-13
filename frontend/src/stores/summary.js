import { defineStore } from 'pinia'
import { ref } from 'vue'
import { mockSummaries, mockExportLogs } from '@/lib/mock-data'

export const useSummaryStore = defineStore('summary', () => {
  const summaries = ref([...mockSummaries])
  const exportLogs = ref([...mockExportLogs])
  const isLoading = ref(false)
  const error = ref(null)

  function loadSummaries(clientId, options = {}) {
    let results = summaries.value.filter(s => s.clientId === clientId)
    if (options.facilityId) results = results.filter(s => s.facilityId === options.facilityId)
    if (options.yearMonth) results = results.filter(s => s.yearMonth === options.yearMonth)
    if (options.status) results = results.filter(s => s.status === options.status)
    return results
  }

  function saveSummary(data) {
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

  function updateStatus(summaryId, newStatus, userId) {
    const s = summaries.value.find(s => s.id === summaryId)
    if (!s) throw new Error('集計が見つかりません')
    s.status = newStatus
    s.updatedAt = new Date()
    if (newStatus === 'confirmed' && userId) {
      s.confirmedAt = new Date()
      s.confirmedBy = userId
    }
  }

  function deleteSummary(summaryId) {
    const s = summaries.value.find(s => s.id === summaryId)
    if (!s) throw new Error('集計が見つかりません')
    if (s.status !== 'draft') throw new Error('確定済みの集計は削除できません')
    summaries.value = summaries.value.filter(s => s.id !== summaryId)
  }

  function addExportLog(data) {
    const log = { id: 'exp-' + Date.now(), ...data, createdAt: new Date(), downloadCount: 1 }
    exportLogs.value.unshift(log)
    return log
  }

  return {
    summaries, exportLogs, isLoading, error,
    loadSummaries, saveSummary, updateStatus, deleteSummary, addExportLog
  }
})
