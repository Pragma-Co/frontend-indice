import { defineStore } from 'pinia'
import { endSession, fetchCsrfCookie, startSession } from '../api/auth'
import { fetchCurrentUser } from '../api/users'
import { clearCookie } from '../utils/cookies'
import { getInitials } from '../utils/formatters'

export const PROFILE_STORAGE_KEY = 'indice.profile'
export const USER_STORAGE_KEY = 'indice.user'
export const CSRF_COOKIE_NAME = 'csrftoken'

const AUTH_STORAGE_KEYS = [PROFILE_STORAGE_KEY, USER_STORAGE_KEY]

export const PROFILES = {
  COLLABORATOR: 'collaborator',
  MANAGER: 'manager',
}

const MANAGER_ROLES = ['AUDITOR', 'ADMIN']

const PROFILE_LABELS = {
  [PROFILES.COLLABORATOR]: 'Colaborador',
  [PROFILES.MANAGER]: 'Gestor',
}

function isKnownProfile(profile) {
  return typeof profile === 'string' && Object.hasOwn(PROFILE_LABELS, profile)
}

function isValidUser(user) {
  return Number.isInteger(user?.id) && typeof user?.name === 'string' && Boolean(user.name.trim())
}

export function profileForRole(role) {
  return MANAGER_ROLES.includes(role) ? PROFILES.MANAGER : PROFILES.COLLABORATOR
}

export function toCurrentUser(account) {
  const profile = profileForRole(account?.role)
  return {
    id: account.id,
    name: account.name,
    email: account.email ?? '',
    role: PROFILE_LABELS[profile],
    area: account.area?.name ?? '',
  }
}

export function resolveStoredProfile(storage = globalThis.localStorage) {
  try {
    const stored = storage?.getItem(PROFILE_STORAGE_KEY)
    return isKnownProfile(stored) ? stored : null
  } catch {
    return null
  }
}

export function resolveStoredUser(storage = globalThis.localStorage) {
  try {
    const stored = JSON.parse(storage?.getItem(USER_STORAGE_KEY) ?? 'null')
    return isValidUser(stored) ? stored : null
  } catch {
    return null
  }
}

function restoreSession(storage = globalThis.localStorage) {
  const profile = resolveStoredProfile(storage)
  const currentUser = profile ? resolveStoredUser(storage) : null
  return currentUser ? { profile, currentUser } : { profile: null, currentUser: null }
}

function persistSession(storage, profile, currentUser) {
  try {
    storage?.setItem(PROFILE_STORAGE_KEY, profile)
    storage?.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser))
  } catch {
    return
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => restoreSession(),
  getters: {
    isAuthenticated: (state) => Boolean(state.currentUser),
    isManager: (state) => state.profile === PROFILES.MANAGER,
    initials: (state) => getInitials(state.currentUser?.name),
  },
  actions: {
    setSession(account, storage = globalThis.localStorage) {
      this.profile = profileForRole(account.role)
      this.currentUser = toCurrentUser(account)
      persistSession(storage, this.profile, this.currentUser)
    },
    async signIn(credentials, storage = globalThis.localStorage) {
      await fetchCsrfCookie()
      const account = await startSession(credentials)
      this.setSession(account, storage)
      return this.currentUser
    },
    applyAccount(account, storage = globalThis.localStorage) {
      if (!this.currentUser || account?.id !== this.currentUser.id) return
      this.currentUser = {
        ...this.currentUser,
        name: account.name ?? this.currentUser.name,
        email: account.email ?? this.currentUser.email,
      }
      persistSession(storage, this.profile, this.currentUser)
    },
    async refreshAccount() {
      if (!this.isAuthenticated) return
      try {
        this.applyAccount(await fetchCurrentUser())
      } catch {
        return
      }
    },
    async signOut(storage = globalThis.localStorage) {
      try {
        await endSession()
      } catch {
        this.logout(storage)
        return
      }
      this.logout(storage)
    },
    logout(storage = globalThis.localStorage) {
      this.profile = null
      this.currentUser = null
      for (const key of AUTH_STORAGE_KEYS) {
        try {
          storage?.removeItem(key)
        } catch {
          continue
        }
      }
      clearCookie(CSRF_COOKIE_NAME)
    },
  },
})
