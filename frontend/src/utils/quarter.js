/**
 * 四半期の構成月を計算する共通ユーティリティ。
 *
 * facility.quarterStartMonth (1-12) を起点に、各四半期の3ヶ月を返す。
 *
 * 規約: yearQuarter "YYYY-QN" の YYYY は、その四半期の最終月の年。
 *
 * 例:
 *   getQuarterMonths('2026-Q1', 12) → ['2025-12', '2026-01', '2026-02']  // 熊本市
 *   getQuarterMonths('2026-Q1',  1) → ['2026-01', '2026-02', '2026-03']  // 標準暦
 *   getQuarterMonths('2026-Q1',  4) → ['2026-04', '2026-05', '2026-06']  // 日本会計年度
 *   getQuarterMonths('2026-Q4',  4) → ['2027-01', '2027-02', '2027-03']
 */
export function getQuarterMonths(yearQuarter, quarterStartMonth = 12) {
  if (!yearQuarter) return []
  const [yStr, qStr] = yearQuarter.split('-Q')
  const q = parseInt(qStr)
  const labelYear = parseInt(yStr)
  if (!q || q < 1 || q > 4 || isNaN(labelYear)) return []

  // Q1の最終月（0-indexed）: startMonth + 2
  const q1LastMonth0 = (quarterStartMonth - 1 + 2) % 12
  // 対象Qの最終月の絶対年月（new Date は month オーバーフローを翌年に繰り越してくれる）
  const qLastDate = new Date(labelYear, q1LastMonth0 + (q - 1) * 3, 1)

  const result = []
  for (let i = 2; i >= 0; i--) {
    const d = new Date(qLastDate.getFullYear(), qLastDate.getMonth() - i, 1)
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return result
}

/**
 * ある年月が属する四半期文字列を返す（"YYYY-QN"）。
 */
export function monthToQuarter(year, month, quarterStartMonth = 12) {
  // 候補となる labelYear は当年 or 翌年（年またぎ Q4 のケース対応）
  for (const ly of [year, year + 1]) {
    for (let q = 1; q <= 4; q++) {
      const months = getQuarterMonths(`${ly}-Q${q}`, quarterStartMonth)
      if (months.includes(`${year}-${String(month).padStart(2, '0')}`)) {
        return `${ly}-Q${q}`
      }
    }
  }
  return null
}
