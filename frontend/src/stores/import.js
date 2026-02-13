import { defineStore } from 'pinia'
import { ref } from 'vue'
import { mockLodgingRecords, mockImportLogs } from '@/lib/mock-data'

export const useImportStore = defineStore('import', () => {
  const lodgingRecords = ref([...mockLodgingRecords])
  const importLogs = ref([...mockImportLogs])
  const isLoading = ref(false)

  // パース済みデータ（インポートフロー中の一時保持）
  const parsedHeaders = ref([])
  const parsedRows = ref([])
  const columnMapping = ref({})
  const mappedRecords = ref([])
  const fileName = ref('')

  function setParsedData(headers, rows, name) {
    parsedHeaders.value = headers
    parsedRows.value = rows
    fileName.value = name
  }

  function setColumnMapping(mapping) {
    columnMapping.value = mapping
  }

  function setMappedRecords(records) {
    mappedRecords.value = records
  }

  function confirmImport(clientId, records) {
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
        clientId,
        facilityId: rec.facilityId || '',
        roomCode: rec.roomCode || '',
        checkInDate: rec.checkInDate,
        checkOutDate: rec.checkOutDate,
        nights: rec.nights || 0,
        adults: rec.adults || 0,
        children: rec.children || 0,
        infants: rec.infants || 0,
        taxablePersons,
        taxAmount,
        yearMonth,
        importLogId: logId,
        createdAt: now
      })
    }

    dates.sort()
    importLogs.value.unshift({
      id: logId,
      clientId,
      facilityIds: [...new Set(records.map(r => r.facilityId).filter(Boolean))],
      fileName: fileName.value,
      fileSize: 0,
      totalRows: records.length,
      successRows: records.filter(r => r.isValid !== false).length,
      errorRows: records.filter(r => r.isValid === false).length,
      periodStart: dates[0] || '',
      periodEnd: dates[dates.length - 1] || '',
      status: 'completed',
      createdAt: now,
      createdBy: 'user-1'
    })

    clearImportState()
    return logId
  }

  function clearImportState() {
    parsedHeaders.value = []
    parsedRows.value = []
    columnMapping.value = {}
    mappedRecords.value = []
    fileName.value = ''
  }

  function getRecordsByFilter(clientId, facilityId, yearMonth) {
    return lodgingRecords.value.filter(r => {
      if (clientId && r.clientId !== clientId) return false
      if (facilityId && r.facilityId !== facilityId) return false
      if (yearMonth && r.yearMonth !== yearMonth) return false
      return true
    })
  }

  return {
    lodgingRecords, importLogs, isLoading,
    parsedHeaders, parsedRows, columnMapping, mappedRecords, fileName,
    setParsedData, setColumnMapping, setMappedRecords,
    confirmImport, clearImportState, getRecordsByFilter
  }
})
