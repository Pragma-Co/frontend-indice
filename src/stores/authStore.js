import { defineStore } from 'pinia'
import { getInitials } from '../utils/formatters'

export const DEV_USER_STORAGE_KEY = 'indice.devUser'

const SEED_USER = {
  id: 12,
  name: 'Beatriz Canuto',
  role: 'Colaborador',
  department: 'Departamento de Engenharia',
  area: 'Certificação e Aeronavegabilidade',
}

export function resolveDevelopmentUser(storage = globalThis.localStorage) {
  if (!import.meta.env.DEV) return SEED_USER
  try {
    const stored = JSON.parse(storage?.getItem(DEV_USER_STORAGE_KEY) ?? 'null')
    if (Number.isInteger(stored?.id) && typeof stored?.name === 'string' && stored.name.trim()) {
      return { ...SEED_USER, ...stored }
    }
  } catch {
    return SEED_USER
  }
  return SEED_USER
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    currentUser: resolveDevelopmentUser(),
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.currentUser),
    initials: (state) => getInitials(state.currentUser?.name),
  },
})
