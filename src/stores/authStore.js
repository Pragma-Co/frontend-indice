import { defineStore } from 'pinia'
import { getInitials } from '../utils/formatters'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    // User 12 of the backend seed. Replaced by the session user once authentication exists.
    currentUser: { id: 12, name: 'Beatriz Canuto', role: 'Colaborador' },
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.currentUser),
    initials: (state) => getInitials(state.currentUser?.name),
  },
})
