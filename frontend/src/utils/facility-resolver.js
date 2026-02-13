export function resolveFacilityByRoomCode(roomCode, facilities) {
  if (!roomCode || roomCode.length < 2) {
    return { success: false, error: `部屋コードが無効です（2文字以上必要）: "${roomCode}"` }
  }
  const prefix = roomCode.substring(0, 2).toUpperCase()
  const matched = facilities.find(f => f.roomCodePrefix && f.roomCodePrefix.toUpperCase() === prefix)
  if (!matched) {
    return { success: false, error: `部屋コード「${roomCode}」に対応する施設が見つかりません（プレフィックス: ${prefix}）` }
  }
  return { success: true, facility: matched }
}

export function previewFacilityResolution(records, facilities) {
  const processedRecords = []
  const errors = []
  const facilityBreakdown = {}

  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    const result = resolveFacilityByRoomCode(record.roomCode, facilities)
    if (result.success) {
      processedRecords.push({ ...record, rowNumber: i + 2, facilityId: result.facility.id, facilityName: result.facility.facilityName, isValid: true })
      if (!facilityBreakdown[result.facility.id]) {
        facilityBreakdown[result.facility.id] = { facilityId: result.facility.id, facilityName: result.facility.facilityName, count: 0 }
      }
      facilityBreakdown[result.facility.id].count++
    } else {
      processedRecords.push({ ...record, rowNumber: i + 2, facilityId: null, facilityName: null, isValid: false, error: result.error })
      errors.push({ row: i + 2, column: 'roomCode', message: result.error, value: record.roomCode, severity: 'error' })
    }
  }
  return { records: processedRecords, facilityBreakdown: Object.values(facilityBreakdown), errors }
}
