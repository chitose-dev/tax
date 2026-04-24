import { defineStore } from 'pinia'
import { api } from '@/lib/api'

export const useTenantStore = defineStore('tenant', {
  state: () => ({
    slug: null,
    clientId: null,
    clientName: null,
    isLoaded: false,
    isAdminMode: false,
    error: null
  }),
  actions: {
    setAdminMode() {
      this.slug = null
      this.clientId = null
      this.clientName = null
      this.isAdminMode = true
      this.isLoaded = true
      this.error = null
      document.title = '宿泊税管理システム（管理者）'
    },
    async loadBySlug(slug) {
      this.error = null
      this.isLoaded = false
      this.isAdminMode = false
      if (!slug) {
        this.error = 'missing'
        return false
      }
      try {
        const data = await api.get('/public/client-brand', { slug })
        this.slug = data.urlSlug
        this.clientId = data.clientId
        this.clientName = data.clientName
        document.title = `${data.clientName} 宿泊税管理システム`
        this.isLoaded = true
        return true
      } catch {
        this.error = 'not-found'
        return false
      }
    }
  }
})
