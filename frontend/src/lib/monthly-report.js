/**
 * 月計表PDF生成
 * A4縦1枚に横3列で最大3ヶ月分の宿泊数（課税対象/対象外/外国大使等）を表示
 */
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
// フォントはdynamic importでPDF生成時のみ読み込む（バンドルサイズ削減）

/**
 * 西暦年を和暦に変換
 */
function toWareki(year, month) {
  if (year > 2019 || (year === 2019 && month >= 5)) {
    return `令和${year - 2018}年${month}月分`
  }
  if (year > 1989 || (year === 1989 && month >= 1)) {
    return `平成${year - 1988}年${month}月分`
  }
  return `${year}年${month}月分`
}

/**
 * 宿泊レコードを日別の課税対象/対象外宿泊数に展開
 */
function expandRecordsToDailyTotals(records, year, month) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const taxable = {}
  const nonTaxable = {}
  for (let d = 1; d <= daysInMonth; d++) {
    taxable[d] = 0
    nonTaxable[d] = 0
  }

  for (const rec of records) {
    const co = new Date(rec.checkOutDate)
    const nights = Number(rec.nights) || 1
    const taxablePersons = (Number(rec.adults) || 0) + (Number(rec.children) || 0)
    const nonTaxablePersons = Number(rec.infants) || 0

    // CO月一括計上: CO前日（最終泊）に全泊数をまとめて計上
    const lastNight = new Date(co)
    lastNight.setDate(lastNight.getDate() - 1)

    const cy = lastNight.getFullYear()
    const cm = lastNight.getMonth() + 1
    const cd = lastNight.getDate()

    if (cy === year && cm === month && taxable[cd] !== undefined) {
      taxable[cd] += taxablePersons * nights
      nonTaxable[cd] += nonTaxablePersons * nights
    }
  }

  const totalTaxable = Object.values(taxable).reduce((s, v) => s + v, 0)
  const totalNonTaxable = Object.values(nonTaxable).reduce((s, v) => s + v, 0)
  return { taxable, nonTaxable, totalTaxable, totalNonTaxable, daysInMonth }
}

/**
 * jsPDFに日本語フォントを登録
 */
async function registerJapaneseFont(doc) {
  const { NotoSansJPBase64 } = await import('@/assets/fonts/NotoSansJP.js')
  doc.addFileToVFS('NotoSansJP-Regular.ttf', NotoSansJPBase64)
  doc.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal')
  doc.setFont('NotoSansJP')
}

/**
 * 月計表PDFを生成してダウンロード
 */
export async function generateMonthlyReportPDF({ facilityName, facilityCode, clientCode, clientName, months }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  await registerJapaneseFont(doc)

  const pageWidth = 210
  const marginLeft = 8
  const marginRight = 8
  const marginTop = 15
  const contentWidth = pageWidth - marginLeft - marginRight

  // 1ヶ月あたり4列（日付, 課税対象, 課税対象外, うち外国大使等）× 3ヶ月 = 12列
  const colsPerMonth = 4
  const totalCols = colsPerMonth * 3
  const monthWidth = contentWidth / 3
  const dayColWidth = 10
  const dataColWidth = (monthWidth - dayColWidth) / 3

  // タイトル
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text('宿 泊 税 計 表', pageWidth / 2, marginTop, { align: 'center' })

  // 施設情報テーブル（公式月計表形式）
  const infoTableY = marginTop + 4
  autoTable(doc, {
    startY: infoTableY,
    margin: { left: marginLeft, right: marginRight },
    head: [['宿泊施設名称', '施設番号 - 施設連番', '義務者番号', '特別徴収義務書']],
    body: [[facilityName || '', facilityCode || '', clientCode || '', clientName || '']],
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      halign: 'center',
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      minCellHeight: 5,
    },
    bodyStyles: {
      minCellHeight: 6,
    },
    willDrawCell() {
      doc.setFont('NotoSansJP', 'normal')
    },
  })

  const infoTableEndY = doc.lastAutoTable.finalY

  // 3列分のデータを準備
  const columnData = []
  for (let i = 0; i < 3; i++) {
    if (i < months.length) {
      const m = months[i]
      const { taxable, nonTaxable, totalTaxable, totalNonTaxable, daysInMonth } =
        expandRecordsToDailyTotals(m.records, m.year, m.month)
      columnData.push({
        header: toWareki(m.year, m.month),
        taxable,
        nonTaxable,
        totalTaxable,
        totalNonTaxable,
        daysInMonth,
      })
    } else {
      columnData.push({
        header: '',
        taxable: {},
        nonTaxable: {},
        totalTaxable: null,
        totalNonTaxable: null,
        daysInMonth: 31,
      })
    }
  }

  // サブヘッダー2段: 「宿泊数（泊）」と個別列名
  const subHead1 = []
  const subHead2 = []
  for (let i = 0; i < 3; i++) {
    subHead1.push('日付', '宿 泊 数（泊）', '', '')
    subHead2.push('', '課税対象（A）', '課税対象外（B）', { content: 'うち外国\n大使等\n課税免除', styles: { fontSize: 5.5 } })
  }

  // テーブルボディ構築（31行）
  const body = []
  for (let day = 1; day <= 31; day++) {
    const row = []
    for (let col = 0; col < 3; col++) {
      const cd = columnData[col]
      if (day <= cd.daysInMonth) {
        row.push(String(day))
        row.push(cd.taxable[day] || '')
        row.push(cd.nonTaxable[day] || '0')
        row.push('0')  // 外国大使等課税免除（データなし）
      } else {
        row.push('', '', '', '')
      }
    }
    body.push(row)
  }

  // 合計行
  const totalRow = []
  for (let col = 0; col < 3; col++) {
    const cd = columnData[col]
    totalRow.push('合 計')
    totalRow.push(cd.totalTaxable !== null ? String(cd.totalTaxable) : '')
    totalRow.push(cd.totalNonTaxable !== null ? String(cd.totalNonTaxable) : '')
    totalRow.push('')  // 外国大使等
  }
  body.push(totalRow)

  // 総宿泊数行
  const grandTotalRow = []
  for (let col = 0; col < 3; col++) {
    const cd = columnData[col]
    grandTotalRow.push('総宿泊数')
    if (cd.totalTaxable !== null) {
      const grand = cd.totalTaxable + cd.totalNonTaxable
      grandTotalRow.push({ content: String(grand), colSpan: 3, styles: { halign: 'center' } })
    } else {
      grandTotalRow.push({ content: '', colSpan: 3 })
    }
  }
  body.push(grandTotalRow)

  // テーブル描画
  const tableStartY = infoTableEndY + 10

  // columnStyles: 各月の日付列=center, データ列=right
  const columnStyles = {}
  for (let i = 0; i < 3; i++) {
    const base = i * colsPerMonth
    columnStyles[base] = { cellWidth: dayColWidth, halign: 'center' }
    columnStyles[base + 1] = { cellWidth: dataColWidth, halign: 'right' }
    columnStyles[base + 2] = { cellWidth: dataColWidth, halign: 'right' }
    columnStyles[base + 3] = { cellWidth: dataColWidth, halign: 'right' }
  }

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: marginLeft, right: marginRight },
    head: [subHead1, subHead2],
    body,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.2,
      halign: 'center',
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [220, 220, 220],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      minCellHeight: 6,
    },
    willDrawCell() {
      doc.setFont('NotoSansJP', 'normal')
    },
    columnStyles,
    didParseCell(data) {
      // subHead1: 「宿泊数（泊）」セルを3列結合
      if (data.section === 'head' && data.row.index === 0) {
        const colIdx = data.column.index % colsPerMonth
        if (colIdx === 1) {
          data.cell.colSpan = 3
        } else if (colIdx === 0) {
          data.cell.rowSpan = 2
        }
      }

      const totalRowIdx = body.length - 2
      const grandTotalRowIdx = body.length - 1

      // 合計行スタイル
      if (data.section === 'body' && data.row.index === totalRowIdx) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [240, 240, 240]
      }
      // 総宿泊数行スタイル
      if (data.section === 'body' && data.row.index === grandTotalRowIdx) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [230, 230, 230]
      }
    },
    didDrawPage(data) {
      const startY = data.settings.startY
      const headerHeight = 7

      // 月ヘッダーバー描画
      doc.setFillColor(180, 180, 180)
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.2)
      doc.setFontSize(8)
      doc.setFont('NotoSansJP', 'normal')

      for (let i = 0; i < 3; i++) {
        const x = marginLeft + i * monthWidth
        const w = monthWidth
        const y = startY - headerHeight

        doc.rect(x, y, w, headerHeight, 'FD')
        doc.setTextColor(0, 0, 0)
        doc.text(columnData[i].header || '', x + w / 2, y + headerHeight / 2 + 1, { align: 'center' })
      }

      data.settings.startY = startY
    },
  })

  // ファイル名（日本語）
  const firstMonth = months[0]
  const filename = months.length > 1
    ? `月計表_${firstMonth.year}_Q.pdf`
    : `月計表_${firstMonth.year}${String(firstMonth.month).padStart(2, '0')}.pdf`

  doc.save(filename)
}
