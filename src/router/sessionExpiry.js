import { useAuthStore } from '../stores/authStore'
import { useNotificationStore } from '../stores/notificationStore'
import { loginLocation } from './index'

export const SESSION_EXPIRED_MESSAGE = 'Sua sessão expirou. Entre novamente.'

export function createSessionExpiryHandler(router) {
  return function handleSessionExpiry() {
    const auth = useAuthStore()
    if (!auth.isAuthenticated) return
    auth.logout()
    useNotificationStore().error(SESSION_EXPIRED_MESSAGE)
    const current = router.currentRoute.value
    if (current.name === 'login') return
    router.push(loginLocation(current.fullPath)).catch(() => null)
  }
}
