export function resolveFacilityByRoomCode(roomCode, facilities) {
  if (!roomCode || roomCode.length < 1) {
    return { success: false, error: `部屋コードが無効です: "${roomCode}"` }
  }
  const upper = roomCode.toUpperCase()
  // 各施設のroomCodePrefixの長さに合わせて先頭を比較（長いプレフィックスを優先）
  const sorted = [...facilities].filter(f => f.roomCodePrefix).sort((a, b) => b.roomCodePrefix.length - a.roomCodePrefix.length)
  const matched = sorted.find(f => upper.startsWith(f.roomCodePrefix.toUpperCase()))
  if (!matched) {
    return { success: false, error: `部屋コード「${roomCode}」に対応する施設が見つかりません` }
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
