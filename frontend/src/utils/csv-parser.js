import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import Encoding from 'encoding-japanese'

export async function parseCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const uint8Array = new Uint8Array(e.target.result)
        const detectedEncoding = Encoding.detect(uint8Array)
        let text
        if (detectedEncoding === 'UTF8' || detectedEncoding === 'ASCII') {
          text = new TextDecoder('utf-8').decode(uint8Array)
        } else {
          const unicodeArray = Encoding.convert(uint8Array, { to: 'UNICODE', from: detectedEncoding })
          text = Encoding.codeToString(unicodeArray)
        }
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
        const result = Papa.parse(text, { header: false, skipEmptyLines: true, dynamicTyping: false })
        const data = result.data.filter(row => row.some(cell => cell && cell.trim() !== ''))
        if (data.length === 0) { reject(new Error('CSVファイルにデータがありません')); return }
        resolve({ headers: data[0] || [], rows: data.slice(1) })
      } catch (err) { reject(new Error('CSVの読み込みに失敗: ' + err.message)) }
    }
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'))
    reader.readAsArrayBuffer(file)
  })
}

export async function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'array', cellDates: true })
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) { reject(new Error('シートがありません')); return }
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', blankrows: false, raw: false, dateNF: 'yyyy-mm-dd' })
        if (jsonData.length === 0) { reject(new Error('データがありません')); return }
        const processed = jsonData.map(row => row.map(cell => {
          if (cell instanceof Date) return formatDate(cell)
          return cell
        }))
        resolve({ headers: processed[0] || [], rows: processed.slice(1) })
      } catch (err) { reject(new Error('Excelの読み込みに失敗: ' + err.message)) }
    }
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'))
    reader.readAsArrayBuffer(file)
  })
}

function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  if (ext === 'csv') return parseCSV(file)
  if (ext === 'xlsx' || ext === 'xls') return parseExcel(file)
  throw new Error(`サポートされていないファイル形式: .${ext}`)
}

export function applyColumnMapping(rows, mapping) {
  return rows.map((row, index) => {
    const record = { rowNumber: index + 2 }
    if (mapping.checkInDate != null) record.checkInDate = row[mapping.checkInDate] || ''
    if (mapping.checkOutDate != null) record.checkOutDate = row[mapping.checkOutDate] || ''
    if (mapping.nights != null) record.nights = parseInt(row[mapping.nights], 10) || 0
    if (mapping.adults != null) record.adults = parseInt(row[mapping.adults], 10) || 0
    if (mapping.children != null) record.children = parseInt(row[mapping.children], 10) || 0
    if (mapping.infants != null) record.infants = parseInt(row[mapping.infants], 10) || 0
    else record.infants = 0
    if (mapping.amount != null) record.amount = parseFloat(row[mapping.amount]) || null
    if (mapping.roomCode != null) record.roomCode = String(row[mapping.roomCode] || '').trim()
    else record.roomCode = ''
    return record
  })
}
