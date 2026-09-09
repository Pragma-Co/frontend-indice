import { defineStore } from 'pinia'

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
    initials: (state) => {
      const name = state.currentUser?.name ?? ''
      return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('')
    },
  },
})
