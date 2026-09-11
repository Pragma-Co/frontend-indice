import { defineStore } from 'pinia'
import { getInitials } from '../utils/formatters'

/**
 * Logged-in user. Authentication (RF4) is not implemented yet, so the store
 * exposes a development user; replace `currentUser` with the session user
 * once the auth endpoints exist. The metadata form reads `currentUser.name`
 * to pre-fill "Responsável/Autor".
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    currentUser: { id: null, name: 'João Silva', role: 'Colaborador' },
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.currentUser),
    initials: (state) => getInitials(state.currentUser?.name),
  },
})
