import { defineStore } from 'pinia'
import { getInitials } from '../utils/formatters'

export const DEV_USER_STORAGE_KEY = 'indice.devUser'
export const PROFILE_STORAGE_KEY = 'indice.profile'

export const PROFILES = {
  COLLABORATOR: 'collaborator',
  MANAGER: 'manager',
}

const SEED_USER = {
  id: 12,
  name: 'Beatriz Canuto',
  role: 'Colaborador',
  department: 'Departamento de Engenharia',
  area: 'Certificação e Aeronavegabilidade',
}

const SEED_MANAGER = {
  id: 8,
  name: 'Joana Prado',
  role: 'Gestor',
  department: 'Departamento de Engenharia',
  area: 'Manufatura e Montagem',
}

const PROFILE_USERS = {
  [PROFILES.COLLABORATOR]: SEED_USER,
  [PROFILES.MANAGER]: SEED_MANAGER,
}

function isKnownProfile(profile) {
  return typeof profile === 'string' && Object.hasOwn(PROFILE_USERS, profile)
}

export function resolveDevelopmentUser(storage = globalThis.localStorage, baseUser = SEED_USER) {
  if (!import.meta.env.DEV) return baseUser
  try {
    const stored = JSON.parse(storage?.getItem(DEV_USER_STORAGE_KEY) ?? 'null')
    if (Number.isInteger(stored?.id) && typeof stored?.name === 'string' && stored.name.trim()) {
      return { ...baseUser, ...stored }
    }
  } catch {
    return baseUser
  }
  return baseUser
}

export function resolveStoredProfile(storage = globalThis.localStorage) {
  try {
    const stored = storage?.getItem(PROFILE_STORAGE_KEY)
    return isKnownProfile(stored) ? stored : null
  } catch {
    return null
  }
}

function resolveProfileUser(profile, storage) {
  return profile ? resolveDevelopmentUser(storage, PROFILE_USERS[profile]) : null
}

export const useAuthStore = defineStore('auth', {
  state: () => {
    const profile = resolveStoredProfile()
    return {
      profile,
      currentUser: resolveProfileUser(profile),
    }
  },
  getters: {
    isAuthenticated: (state) => Boolean(state.currentUser),
    isManager: (state) => state.profile === PROFILES.MANAGER,
    initials: (state) => getInitials(state.currentUser?.name),
  },
  actions: {
    login(profile, storage = globalThis.localStorage) {
      if (!isKnownProfile(profile)) return false
      this.profile = profile
      this.currentUser = resolveProfileUser(profile, storage)
      try {
        storage?.setItem(PROFILE_STORAGE_KEY, profile)
      } catch {
        return true
      }
      return true
    },
  },
})
