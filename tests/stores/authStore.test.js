import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { endSession, fetchCsrfCookie, startSession } from '@/api/auth.js'
import { fetchCurrentUser } from '@/api/users.js'
import {
  LEGACY_STORAGE_KEYS,
  PROFILES,
  profileForRole,
  toCurrentUser,
  useAuthStore,
} from '@/stores/authStore.js'
import { COLLABORATOR_ACCOUNT, MANAGER_ACCOUNT } from '../fixtures/accounts'

vi.mock('@/api/auth.js', () => ({
  fetchCsrfCookie: vi.fn(),
  startSession: vi.fn(),
  endSession: vi.fn(),
}))
vi.mock('@/api/users.js', () => ({ fetchCurrentUser: vi.fn() }))

const CREDENTIALS = { email: 'thiago.serpa@akaer.local', password: 'senha-segura' }

function deferred() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('profileForRole', () => {
  it('should map auditors and admins to the manager profile', () => {
    expect(profileForRole('AUDITOR')).toBe(PROFILES.MANAGER)
    expect(profileForRole('ADMIN')).toBe(PROFILES.MANAGER)
  })

  it('should map authors, viewers and unknown roles to the collaborator profile', () => {
    expect(profileForRole('AUTHOR')).toBe(PROFILES.COLLABORATOR)
    expect(profileForRole('VIEWER')).toBe(PROFILES.COLLABORATOR)
    expect(profileForRole(undefined)).toBe(PROFILES.COLLABORATOR)
  })
})

describe('toCurrentUser', () => {
  it('should keep the account data the interface shows', () => {
    expect(toCurrentUser(MANAGER_ACCOUNT)).toEqual({
      id: 10,
      name: 'Thiago Serpa',
      email: 'thiago.serpa@akaer.local',
      role: 'Gestor',
      area: 'Qualidade e Inspeção',
    })
    expect(toCurrentUser(COLLABORATOR_ACCOUNT)).toMatchObject({ role: 'Colaborador' })
  })

  it('should accept an account without an area', () => {
    expect(toCurrentUser({ ...COLLABORATOR_ACCOUNT, area: null }).area).toBe('')
  })
})

describe('authStore session', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('should start without a user and without a checked session', () => {
    const auth = useAuthStore()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.isManager).toBe(false)
    expect(auth.currentUser).toBeNull()
    expect(auth.sessionChecked).toBe(false)
  })

  it('should open a collaborator session from an author account', () => {
    const auth = useAuthStore()

    auth.setSession(COLLABORATOR_ACCOUNT)

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.isManager).toBe(false)
    expect(auth.currentUser).toMatchObject({ id: 12, name: 'Beatriz Canuto', role: 'Colaborador' })
    expect(auth.initials).toBe('BC')
  })

  it('should open a manager session from an auditor account', () => {
    const auth = useAuthStore()

    auth.setSession(MANAGER_ACCOUNT)

    expect(auth.isManager).toBe(true)
    expect(auth.currentUser).toMatchObject({ id: 10, name: 'Thiago Serpa', role: 'Gestor' })
  })

  it('should mark the session as checked when it is opened', () => {
    const auth = useAuthStore()

    auth.setSession(COLLABORATOR_ACCOUNT)

    expect(auth.sessionChecked).toBe(true)
  })

  it('should keep the signed in user only in memory', () => {
    useAuthStore().setSession(MANAGER_ACCOUNT)

    expect(localStorage.length).toBe(0)
  })

  it('should start a reloaded page signed out until the backend confirms the session', () => {
    useAuthStore().setSession(MANAGER_ACCOUNT)

    setActivePinia(createPinia())
    const reloaded = useAuthStore()

    expect(reloaded.isAuthenticated).toBe(false)
    expect(reloaded.sessionChecked).toBe(false)
  })

  it('should switch the user when another account signs in', () => {
    const auth = useAuthStore()
    auth.setSession(MANAGER_ACCOUNT)

    auth.setSession(COLLABORATOR_ACCOUNT)

    expect(auth.isManager).toBe(false)
    expect(auth.currentUser.name).toBe('Beatriz Canuto')
  })
})

describe('authStore ensureSession', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should open the session of the account the backend recognizes', async () => {
    fetchCurrentUser.mockResolvedValue(MANAGER_ACCOUNT)
    const auth = useAuthStore()

    await auth.ensureSession()

    expect(fetchCurrentUser).toHaveBeenCalledTimes(1)
    expect(auth.isManager).toBe(true)
    expect(auth.currentUser).toMatchObject({ id: 10, name: 'Thiago Serpa' })
    expect(auth.sessionChecked).toBe(true)
  })

  it('should stay signed out when the backend has no session', async () => {
    fetchCurrentUser.mockRejectedValue(Object.assign(new Error('unauthorized'), { status: 401 }))
    const auth = useAuthStore()

    await expect(auth.ensureSession()).resolves.toBeUndefined()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.profile).toBeNull()
    expect(auth.sessionChecked).toBe(true)
  })

  it('should stay signed out without failing when the server is unreachable', async () => {
    fetchCurrentUser.mockRejectedValue(Object.assign(new Error('offline'), { status: 0 }))
    const auth = useAuthStore()

    await expect(auth.ensureSession()).resolves.toBeUndefined()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.sessionChecked).toBe(true)
  })

  it('should ask the backend only once for simultaneous checks', async () => {
    const account = deferred()
    fetchCurrentUser.mockReturnValue(account.promise)
    const auth = useAuthStore()

    const checks = [auth.ensureSession(), auth.ensureSession(), auth.ensureSession()]
    account.resolve(COLLABORATOR_ACCOUNT)
    await Promise.all(checks)

    expect(fetchCurrentUser).toHaveBeenCalledTimes(1)
    expect(auth.currentUser.name).toBe('Beatriz Canuto')
  })

  it('should not ask the backend again once the session was checked', async () => {
    fetchCurrentUser.mockResolvedValue(MANAGER_ACCOUNT)
    const auth = useAuthStore()

    await auth.ensureSession()
    await auth.ensureSession()

    expect(fetchCurrentUser).toHaveBeenCalledTimes(1)
  })

  it('should not ask the backend when the user has just signed in', async () => {
    const auth = useAuthStore()
    auth.setSession(COLLABORATOR_ACCOUNT)

    await auth.ensureSession()

    expect(fetchCurrentUser).not.toHaveBeenCalled()
  })

  it('should not restore the session when the user logged out during the check', async () => {
    const account = deferred()
    fetchCurrentUser.mockReturnValue(account.promise)
    const auth = useAuthStore()

    const check = auth.ensureSession()
    auth.logout()
    account.resolve(MANAGER_ACCOUNT)
    await check

    expect(auth.isAuthenticated).toBe(false)
  })
})

describe('authStore signIn', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    fetchCsrfCookie.mockResolvedValue(null)
    startSession.mockResolvedValue(MANAGER_ACCOUNT)
  })

  it('should fetch the CSRF cookie before sending the credentials', async () => {
    const calls = []
    fetchCsrfCookie.mockImplementation(async () => calls.push('csrf'))
    startSession.mockImplementation(async () => {
      calls.push('login')
      return MANAGER_ACCOUNT
    })

    await useAuthStore().signIn(CREDENTIALS)

    expect(calls).toEqual(['csrf', 'login'])
    expect(startSession).toHaveBeenCalledWith(CREDENTIALS)
  })

  it('should open and mark as checked the session of the returned account', async () => {
    const auth = useAuthStore()

    const user = await auth.signIn(CREDENTIALS)

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.isManager).toBe(true)
    expect(auth.sessionChecked).toBe(true)
    expect(user).toMatchObject({ id: 10, name: 'Thiago Serpa', role: 'Gestor' })
  })

  it('should map an author account to the collaborator profile', async () => {
    startSession.mockResolvedValue(COLLABORATOR_ACCOUNT)
    const auth = useAuthStore()

    await auth.signIn(CREDENTIALS)

    expect(auth.isManager).toBe(false)
    expect(auth.profile).toBe(PROFILES.COLLABORATOR)
  })

  it('should let wrong credentials reach the caller without signing in', async () => {
    const failure = Object.assign(new Error('unauthorized'), { status: 401 })
    startSession.mockRejectedValue(failure)
    const auth = useAuthStore()

    await expect(auth.signIn(CREDENTIALS)).rejects.toBe(failure)

    expect(auth.isAuthenticated).toBe(false)
  })

  it('should not send the credentials when the CSRF cookie cannot be fetched', async () => {
    fetchCsrfCookie.mockRejectedValue(Object.assign(new Error('offline'), { status: 0 }))
    const auth = useAuthStore()

    await expect(auth.signIn(CREDENTIALS)).rejects.toMatchObject({ status: 0 })

    expect(startSession).not.toHaveBeenCalled()
    expect(auth.isAuthenticated).toBe(false)
  })
})

describe('authStore account data', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should update the signed in user with the saved account data', () => {
    const auth = useAuthStore()
    auth.setSession(MANAGER_ACCOUNT)

    auth.applyAccount({ id: 10, name: 'Tiago Serpa', email: 'tiago@akaer.local' })

    expect(auth.currentUser).toMatchObject({
      id: 10,
      name: 'Tiago Serpa',
      email: 'tiago@akaer.local',
      role: 'Gestor',
    })
    expect(auth.initials).toBe('TS')
  })

  it('should ignore account data of another user', () => {
    const auth = useAuthStore()
    auth.setSession(MANAGER_ACCOUNT)

    auth.applyAccount({ id: 12, name: 'Outra Pessoa', email: 'outra@akaer.local' })

    expect(auth.currentUser.name).toBe('Thiago Serpa')
  })

  it('should clear the user, the legacy stored session and the CSRF cookie on logout', () => {
    const auth = useAuthStore()
    auth.setSession(MANAGER_ACCOUNT)
    for (const key of LEGACY_STORAGE_KEYS) localStorage.setItem(key, 'legacy')
    localStorage.setItem('indice.unrelated', 'kept')
    document.cookie = 'csrftoken=abc; path=/'

    auth.logout()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.profile).toBeNull()
    expect(localStorage.getItem('indice.profile')).toBeNull()
    expect(localStorage.getItem('indice.user')).toBeNull()
    expect(localStorage.getItem('indice.unrelated')).toBe('kept')
    expect(document.cookie).not.toContain('csrftoken')
  })

  it('should not ask the backend for the session again after logout', async () => {
    const auth = useAuthStore()
    auth.setSession(MANAGER_ACCOUNT)

    auth.logout()
    await auth.ensureSession()

    expect(auth.sessionChecked).toBe(true)
    expect(auth.isAuthenticated).toBe(false)
    expect(fetchCurrentUser).not.toHaveBeenCalled()
  })

  it('should still log out when the storage cannot be written', () => {
    const auth = useAuthStore()
    auth.setSession(MANAGER_ACCOUNT)
    const brokenStorage = {
      removeItem: () => {
        throw new Error('blocked')
      },
    }

    auth.logout(brokenStorage)

    expect(auth.isAuthenticated).toBe(false)
  })

  it('should end the backend session and clear the user on sign out', async () => {
    endSession.mockResolvedValue(null)
    const auth = useAuthStore()
    auth.setSession(MANAGER_ACCOUNT)

    await auth.signOut()

    expect(endSession).toHaveBeenCalledTimes(1)
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.sessionChecked).toBe(true)
  })

  it('should still clear the user when the backend cannot end the session', async () => {
    endSession.mockRejectedValue(new Error('offline'))
    const auth = useAuthStore()
    auth.setSession(MANAGER_ACCOUNT)

    await auth.signOut()

    expect(auth.isAuthenticated).toBe(false)
  })
})
