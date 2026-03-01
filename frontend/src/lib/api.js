import { auth } from './firebase'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://tax-backend-420040876380.asia-northeast1.run.app'

class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.status = status
    this.data = data
  }
}

async function getAuthHeaders() {
  const user = auth.currentUser
  if (!user) return {}
  const token = await user.getIdToken()
  return { Authorization: `Bearer ${token}` }
}

async function request(method, path, { body, params, isFormData } = {}) {
  const url = new URL(path, BASE_URL)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    })
  }

  const headers = await getAuthHeaders()
  const options = { method, headers }

  if (body) {
    if (isFormData) {
      options.body = body // FormData sets its own Content-Type
    } else {
      headers['Content-Type'] = 'application/json'
      options.body = JSON.stringify(body)
    }
  }

  const res = await fetch(url.toString(), options)

  if (res.status === 401) {
    const { signOut } = await import('firebase/auth')
    await signOut(auth)
    throw new ApiError('認証が無効です。再ログインしてください。', 401)
  }

  if (!res.ok) {
    let data
    try { data = await res.json() } catch { data = null }
    throw new ApiError(data?.message || `APIエラー (${res.status})`, res.status, data)
  }

  // Handle empty responses (204 etc.)
  const contentType = res.headers.get('content-type')
  if (res.status === 204 || !contentType) return null
  if (contentType.includes('application/json')) return res.json()
  return res
}

export const api = {
  get: (path, params) => request('GET', path, { params }),
  post: (path, body) => request('POST', path, { body }),
  put: (path, body) => request('PUT', path, { body }),
  delete: (path) => request('DELETE', path),
  upload: (path, formData) => request('POST', path, { body: formData, isFormData: true }),
  
  // For file downloads
  async download(path, params, filename) {
    const url = new URL(path, BASE_URL)
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
      })
    }
    const headers = await getAuthHeaders()
    const res = await fetch(url.toString(), { headers })
    if (!res.ok) throw new ApiError(`ダウンロードエラー (${res.status})`, res.status)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename || 'download'
    a.click()
    URL.revokeObjectURL(a.href)
  }
}

export { ApiError }
