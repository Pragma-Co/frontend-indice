import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { setUnauthorizedHandler } from './api/client'
import router from './router'
import { createSessionExpiryHandler } from './router/sessionExpiry'
import './styles/globals.css'

const app = createApp(App).use(createPinia()).use(router)
setUnauthorizedHandler(createSessionExpiryHandler(router))
app.mount('#app')
