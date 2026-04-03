/**
 * 月計表PDF生成
 * A4縦1枚に横3列で最大3ヶ月分の課税対象宿泊数を表示
 */
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

/**
 * 西暦年を和暦に変換
 */
function toWareki(year, month) {
  // 令和: 2019年5月〜
  if (year > 2019 || (year === 2019 && month >= 5)) {
    return `令和${year - 2018}年${month}月分`
  }
  // 平成: 1989年1月〜2019年4月
  if (year > 1989 || (year === 1989 && month >= 1)) {
    return `平成${year - 1988}年${month}月分`
  }
  return `${year}年${month}月分`
}

/**
 * 宿泊レコードを日別の課税対象宿泊数に展開
 * @param {Array} records - lodgingRecords
 * @param {number} year - 対象年
 * @param {number} month - 対象月 (1-12)
 * @returns {Object} { dayTotals: {1: N, 2: N, ...}, total: N }
 */
function expandRecordsToDailyTotals(records, year, month) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const dayTotals = {}
  for (let d = 1; d <= daysInMonth; d++) dayTotals[d] = 0

  for (const rec of records) {
    const ci = new Date(rec.checkInDate)
    const co = new Date(rec.checkOutDate)
    const taxablePersons = (Number(rec.adults) || 0) + (Number(rec.children) || 0)

    // チェックイン日からチェックアウト前日まで1泊ずつカウント
    const current = new Date(ci)
    while (current < co) {
      const cy = current.getFullYear()
      const cm = current.getMonth() + 1
      const cd = current.getDate()

      if (cy === year && cm === month && dayTotals[cd] !== undefined) {
        dayTotals[cd] += taxablePersons
      }

      current.setDate(current.getDate() + 1)
    }
  }

  const total = Object.values(dayTotals).reduce((s, v) => s + v, 0)
  return { dayTotals, total, daysInMonth }
}

/**
 * 月計表PDFを生成してダウンロード
 * @param {Object} params
 * @param {string} params.facilityName - 施設名
 * @param {Array<{year: number, month: number, records: Array}>} params.months - 月データ（1〜3ヶ月分）
 */
export async function generateMonthlyReportPDF({ facilityName, months }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // フォント設定（組み込みフォントを使用）
  doc.setFont('helvetica')

  const pageWidth = 210
  const pageHeight = 297
  const marginLeft = 10
  const marginRight = 10
  const marginTop = 15
  const contentWidth = pageWidth - marginLeft - marginRight

  // タイトル
  doc.setFontSize(16)
  doc.text('Lodging Tax Monthly Report', pageWidth / 2, marginTop, { align: 'center' })

  // 施設名
  doc.setFontSize(10)
  doc.text(facilityName, pageWidth / 2, marginTop + 8, { align: 'center' })

  // 3列分のデータを準備
  const columnData = []
  for (let i = 0; i < 3; i++) {
    if (i < months.length) {
      const m = months[i]
      const { dayTotals, total, daysInMonth } = expandRecordsToDailyTotals(m.records, m.year, m.month)
      columnData.push({
        header: toWareki(m.year, m.month),
        dayTotals,
        total,
        daysInMonth,
      })
    } else {
      // 空列
      columnData.push({
        header: '',
        dayTotals: {},
        total: null,
        daysInMonth: 31,
      })
    }
  }

  // テーブルヘッダー構築
  const head = [
    columnData.map(c => ({ content: c.header || '', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } })).flat(),
  ]

  // サブヘッダー
  const subHead = []
  for (let i = 0; i < 3; i++) {
    subHead.push('Day', 'Stays')
  }

  // テーブルボディ構築（31行）
  const body = []
  for (let day = 1; day <= 31; day++) {
    const row = []
    for (let col = 0; col < 3; col++) {
      const cd = columnData[col]
      if (day <= cd.daysInMonth) {
        row.push(String(day))
        row.push(cd.dayTotals[day] !== undefined ? (cd.dayTotals[day] || '') : '')
      } else {
        row.push('')
        row.push('')
      }
    }
    body.push(row)
  }

  // 合計行
  const totalRow = []
  for (let col = 0; col < 3; col++) {
    const cd = columnData[col]
    totalRow.push('Total')
    totalRow.push(cd.total !== null ? String(cd.total) : '')
  }
  body.push(totalRow)

  // テーブル描画
  const colWidth = contentWidth / 6

  doc.autoTable({
    startY: marginTop + 14,
    margin: { left: marginLeft, right: marginRight },
    head: [subHead],
    body,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 1.5,
      halign: 'center',
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [220, 220, 220],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: colWidth, halign: 'center' },
      1: { cellWidth: colWidth, halign: 'right' },
      2: { cellWidth: colWidth, halign: 'center' },
      3: { cellWidth: colWidth, halign: 'right' },
      4: { cellWidth: colWidth, halign: 'center' },
      5: { cellWidth: colWidth, halign: 'right' },
    },
    didParseCell(data) {
      // 合計行のスタイル
      if (data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [240, 240, 240]
      }
    },
    // ヘッダーの上にカラムヘッダー（月名）を追加描画
    didDrawPage(data) {
      const tableStartY = data.settings.startY
      const headerHeight = 7

      doc.setFillColor(180, 180, 180)
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.2)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')

      for (let i = 0; i < 3; i++) {
        const x = marginLeft + i * colWidth * 2
        const w = colWidth * 2
        const y = tableStartY - headerHeight

        doc.rect(x, y, w, headerHeight, 'FD')
        doc.setTextColor(0, 0, 0)
        doc.text(columnData[i].header || '', x + w / 2, y + headerHeight / 2 + 1, { align: 'center' })
      }

      // テーブル開始位置を調整
      data.settings.startY = tableStartY
    },
  })

  // ファイル名
  const firstMonth = months[0]
  const filename = months.length > 1
    ? `monthly_report_${firstMonth.year}_Q.pdf`
    : `monthly_report_${firstMonth.year}_${String(firstMonth.month).padStart(2, '0')}.pdf`

  doc.save(filename)
}
