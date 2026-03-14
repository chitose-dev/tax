/**
 * localStorage キャッシュユーティリティ
 * Stale-While-Revalidate パターン:
 *   1. localStorageからキャッシュを即座に返す
 *   2. バックグラウンドでAPIから最新データを取得して更新
 */

const CACHE_PREFIX = 'tax_cache_'

export function getCached(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const { data, timestamp } = JSON.parse(raw)
    return { data, timestamp }
  } catch {
    return null
  }
}

export function setCache(key, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
      data,
      timestamp: Date.now()
    }))
  } catch {
    // localStorage full or unavailable - ignore
  }
}

export function clearCache(key) {
  try {
    if (key) {
      localStorage.removeItem(CACHE_PREFIX + key)
    } else {
      // 全キャッシュクリア
      Object.keys(localStorage)
        .filter(k => k.startsWith(CACHE_PREFIX))
        .forEach(k => localStorage.removeItem(k))
    }
  } catch {
    // ignore
  }
}
