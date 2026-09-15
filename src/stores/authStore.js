import { defineStore } from 'pinia'
import { getInitials } from '../utils/formatters'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    currentUser: { id: null, name: 'João Silva', role: 'Colaborador' },
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.currentUser),
    initials: (state) => getInitials(state.currentUser?.name),
  },
})
