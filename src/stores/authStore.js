import { defineStore } from 'pinia'
import { endSession, fetchCsrfCookie, startSession } from '../api/auth'
import { fetchCurrentUser } from '../api/users'
import { clearCookie } from '../utils/cookies'
import { getInitials } from '../utils/formatters'

export const CSRF_COOKIE_NAME = 'csrftoken'
export const LEGACY_STORAGE_KEYS = ['indice.profile', 'indice.user']

export const PROFILES = {
  COLLABORATOR: 'collaborator',
  MANAGER: 'manager',
}

const MANAGER_ROLES = ['AUDITOR', 'ADMIN']

const PROFILE_LABELS = {
  [PROFILES.COLLABORATOR]: 'Colaborador',
  [PROFILES.MANAGER]: 'Gestor',
}

const pendingSessionChecks = new WeakMap()

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

async function fetchAccountOrNull() {
  try {
    return await fetchCurrentUser()
  } catch {
    return null
  }
}

function removeLegacySession(storage) {
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      storage?.removeItem(key)
    } catch {
      continue
    }
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    profile: null,
    currentUser: null,
    sessionChecked: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.currentUser),
    isManager: (state) => state.profile === PROFILES.MANAGER,
    initials: (state) => getInitials(state.currentUser?.name),
  },
  actions: {
    setSession(account) {
      this.profile = profileForRole(account.role)
      this.currentUser = toCurrentUser(account)
      this.sessionChecked = true
    },
    clearSession() {
      this.profile = null
      this.currentUser = null
      this.sessionChecked = true
    },
    async restoreSession() {
      const account = await fetchAccountOrNull()
      if (this.sessionChecked) return
      if (account) this.setSession(account)
      else this.clearSession()
    },
    ensureSession() {
      if (this.sessionChecked) return Promise.resolve()
      if (!pendingSessionChecks.has(this)) {
        const check = this.restoreSession().finally(() => pendingSessionChecks.delete(this))
        pendingSessionChecks.set(this, check)
      }
      return pendingSessionChecks.get(this)
    },
    async signIn(credentials) {
      await fetchCsrfCookie()
      const account = await startSession(credentials)
      this.setSession(account)
      return this.currentUser
    },
    applyAccount(account) {
      if (!this.currentUser || account?.id !== this.currentUser.id) return
      this.currentUser = {
        ...this.currentUser,
        name: account.name ?? this.currentUser.name,
        email: account.email ?? this.currentUser.email,
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
      this.clearSession()
      removeLegacySession(storage)
      clearCookie(CSRF_COOKIE_NAME)
    },
  },
})
