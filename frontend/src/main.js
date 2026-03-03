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

// Initialize auth before mounting to prevent flash of wrong UI
import { useAuthStore } from './stores/auth.js'
const authStore = useAuthStore()
authStore.initAuth().then(() => {
  app.use(router)
  app.mount('#app')
})
