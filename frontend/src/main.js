import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router/index.js'
import App from './App.vue'
import './styles/variables.css'
import './styles/reset.css'
import './styles/components.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

import { useAuthStore } from './stores/auth.js'
const authStore = useAuthStore()

// Initialize auth with timeout to prevent infinite loading
const authReady = authStore.initAuth()
const timeout = new Promise(resolve => setTimeout(resolve, 5000))

Promise.race([authReady, timeout]).then(() => {
  if (authStore.isLoading) {
    // Timeout hit - force loading to false
    authStore.isLoading = false
  }
  app.use(router)
  app.mount('#app')
})
