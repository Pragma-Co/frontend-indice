import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { setLegalRequiredHandler, setUnauthorizedHandler } from './api/client'
import router from './router'
import { createSessionExpiryHandler } from './router/sessionExpiry'
import { useLegalConsentStore } from './stores/legalConsentStore'
import './styles/globals.css'

const app = createApp(App).use(createPinia()).use(router)
setUnauthorizedHandler(createSessionExpiryHandler(router))
setLegalRequiredHandler(() => useLegalConsentStore().refresh())
app.mount('#app')
