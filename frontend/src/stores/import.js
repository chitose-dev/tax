import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getCached, setCache } from '@/lib/cache'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const useImportStore = defineStore('import', () => {
  const lodgingRecords = ref([])
  const importLogs = ref([])
  const isLoading = ref(false)

  // パース済みデータ（インポートフロー中の一時保持）
  const parsedHeaders = ref([])
  const parsedRows = ref([])
  const columnMapping = ref({})
  const mappedRecords = ref([])
  const fileName = ref('')
  const rawFile = ref(null) // 元のCSVファイル参照

  async function init() {
    if (USE_MOCK) {
      const { mockLodgingRecords, mockImportLogs } = await import('@/lib/mock-data')
      lodgingRecords.value = [...mockLodgingRecords]
      importLogs.value = [...mockImportLogs]
    }
  }

  function setParsedData(headers, rows, name, file) {
    parsedHeaders.value = headers
    parsedRows.value = rows
    fileName.value = name
    rawFile.value = file || null
  }

  function setColumnMapping(mapping) {
    columnMapping.value = mapping
  }

  function setMappedRecords(records) {
    mappedRecords.value = records
  }

  async function confirmImport(clientId, records) {
    if (USE_MOCK) {
      const { mockLodgingRecords } = await import('@/lib/mock-data')
      const logId = 'log-' + Date.now()
      const now = new Date()
      const dates = []

      for (const rec of records) {
        if (rec.checkInDate) dates.push(rec.checkInDate)
        const taxablePersons = (rec.adults || 0) + (rec.children || 0)
        const taxAmount = taxablePersons * (rec.nights || 0) * 200
        const yearMonth = rec.checkInDate ? rec.checkInDate.substring(0, 7) : ''

        lodgingRecords.value.push({
          id: 'rec-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          clientId, facilityId: rec.facilityId || '', roomCode: rec.roomCode || '',
          checkInDate: rec.checkInDate, checkOutDate: rec.checkOutDate,
          nights: rec.nights || 0, adults: rec.adults || 0,
          children: rec.children || 0, infants: rec.infants || 0,
          taxablePersons, taxAmount, yearMonth,
          importLogId: logId, createdAt: now
        })
      }

      dates.sort()
      importLogs.value.unshift({
        id: logId, clientId,
        facilityIds: [...new Set(records.map(r => r.facilityId).filter(Boolean))],
        fileName: fileName.value, fileSize: 0,
        totalRows: records.length,
        successRows: records.filter(r => r.isValid !== false).length,
        errorRows: records.filter(r => r.isValid === false).length,
        periodStart: dates[0] || '', periodEnd: dates[dates.length - 1] || '',
        status: 'completed', createdAt: now, createdBy: 'user-1'
      })

      clearImportState()
      return logId
    }

    // API mode: send original CSV file
    isLoading.value = true
    try {
      const { api } = await import('@/lib/api')
      const formData = new FormData()
      formData.append('file', rawFile.value)

      const result = await api.upload(`/lodging-records/import?clientId=${encodeURIComponent(clientId)}`, formData)
      clearImportState()
      await fetchImportLogs(clientId)
      return result.importLogId || result.id
    } finally { isLoading.value = false }
  }

  function clearImportState() {
    parsedHeaders.value = []
    parsedRows.value = []
    columnMapping.value = {}
    mappedRecords.value = []
    fileName.value = ''
    rawFile.value = null
  }

  async function fetchLodgingRecords(clientId) {
    if (USE_MOCK) return

    // localStorageから即座に復元
    const cacheKey = `lodging_${clientId}`
    const cached = getCached(cacheKey)
    if (cached?.data?.length && !lodgingRecords.value.length) {
      lodgingRecords.value = cached.data
    }

    // APIから最新を取得（バックグラウンド更新）
    isLoading.value = true
    try {
      const { api } = await import('@/lib/api')
      const data = await api.get('/lodging-records', { clientId })
      lodgingRecords.value = data
      setCache(cacheKey, data)
    } finally { isLoading.value = false }
  }

  async function getRecordsByFilter(clientId, facilityId, yearMonth) {
    if (USE_MOCK) {
      return lodgingRecords.value.filter(r => {
        if (clientId && r.clientId !== clientId) return false
        if (facilityId && r.facilityId !== facilityId) return false
        if (yearMonth && r.yearMonth !== yearMonth) return false
        return true
      })
    }
    isLoading.value = true
    try {
      const { api } = await import('@/lib/api')
      const data = await api.get('/lodging-records', { clientId, facilityId, yearMonth })
      lodgingRecords.value = data
      return data
    } finally { isLoading.value = false }
  }

  async function fetchImportLogs(clientId) {
    if (USE_MOCK) return
    isLoading.value = true
    try {
      const { api } = await import('@/lib/api')
      importLogs.value = await api.get('/import-logs', { clientId })
    } finally { isLoading.value = false }
  }

  async function rollbackImport(logId) {
    if (USE_MOCK) {
      lodgingRecords.value = lodgingRecords.value.filter(r => r.importLogId !== logId)
      importLogs.value = importLogs.value.filter(l => l.id !== logId)
      return
    }
    isLoading.value = true
    try {
      const { api } = await import('@/lib/api')
      await api.delete(`/import-logs/${logId}`)
      importLogs.value = importLogs.value.filter(l => l.id !== logId)
    } finally { isLoading.value = false }
  }

  // Initialize
  init()

  return {
    lodgingRecords, importLogs, isLoading,
    parsedHeaders, parsedRows, columnMapping, mappedRecords, fileName, rawFile,
    setParsedData, setColumnMapping, setMappedRecords,
    confirmImport, clearImportState, fetchLodgingRecords, getRecordsByFilter,
    fetchImportLogs, rollbackImport
  }
})
