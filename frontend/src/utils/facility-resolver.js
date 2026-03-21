import { normalizeDateString } from './csv-parser'

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
    const rowNum = record.rowNumber || (i + 2)
    const rowErrors = []

    // CSV-17: 日付バリデーション
    if (record.checkInDate) {
      const ci = new Date(normalizeDateString(record.checkInDate))
      if (isNaN(ci.getTime())) {
        rowErrors.push({ row: rowNum, column: 'checkInDate', message: `開始日が不正です: "${record.checkInDate}"`, value: record.checkInDate, severity: 'error' })
      }
    }
    if (record.checkOutDate) {
      const co = new Date(normalizeDateString(record.checkOutDate))
      if (isNaN(co.getTime())) {
        rowErrors.push({ row: rowNum, column: 'checkOutDate', message: `終了日が不正です: "${record.checkOutDate}"`, value: record.checkOutDate, severity: 'error' })
      }
    }

    // EDGE-08/CSV-19: 日付逆転チェック (CO <= CI)
    if (record.checkInDate && record.checkOutDate) {
      const ci = new Date(normalizeDateString(record.checkInDate))
      const co = new Date(normalizeDateString(record.checkOutDate))
      if (!isNaN(ci.getTime()) && !isNaN(co.getTime()) && co <= ci) {
        rowErrors.push({ row: rowNum, column: 'checkOutDate', message: 'チェックアウト日はチェックイン日より後の日付にしてください', value: record.checkOutDate, severity: 'error' })
      }
    }

    // CSV-18: nights不正チェック
    if (record.nights !== undefined && record.nights !== null && record.nights < 0) {
      rowErrors.push({ row: rowNum, column: 'nights', message: `宿泊日数が不正です: ${record.nights}`, value: String(record.nights), severity: 'error' })
    }

    // EDGE-11: 小数nightsエラー (csv-parserから伝搬)
    if (record._nightsError) {
      rowErrors.push({ row: rowNum, column: 'nights', message: record._nightsError, value: String(record.nights), severity: 'error' })
    }

    const result = resolveFacilityByRoomCode(record.roomCode, facilities)
    if (result.success && rowErrors.length === 0) {
      processedRecords.push({ ...record, rowNumber: rowNum, facilityId: result.facility.id, facilityName: result.facility.facilityName, isValid: true })
      if (!facilityBreakdown[result.facility.id]) {
        facilityBreakdown[result.facility.id] = { facilityId: result.facility.id, facilityName: result.facility.facilityName, count: 0 }
      }
      facilityBreakdown[result.facility.id].count++
    } else if (rowErrors.length > 0) {
      // バリデーションエラー（日付不正等）→ invalid
      if (!result.success) {
        rowErrors.push({ row: rowNum, column: 'roomCode', message: result.error, value: record.roomCode, severity: 'warning' })
      }
      processedRecords.push({ ...record, rowNumber: rowNum, facilityId: result.success ? result.facility.id : null, facilityName: result.success ? result.facility.facilityName : null, isValid: false, error: rowErrors.map(e => e.message).join('; ') })
      errors.push(...rowErrors)
    } else if (!result.success) {
      // EDGE-07: 施設マッチ失敗のみ → 警告付きでisValid=true（そのまま保存可能）
      errors.push({ row: rowNum, column: 'roomCode', message: result.error, value: record.roomCode, severity: 'warning' })
      processedRecords.push({ ...record, rowNumber: rowNum, facilityId: null, facilityName: '（未マッチ）', isValid: true, warning: result.error })
    }
  }
  return { records: processedRecords, facilityBreakdown: Object.values(facilityBreakdown), errors }
}
