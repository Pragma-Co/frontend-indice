import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { endSession, fetchCsrfCookie, startSession } from '@/api/auth.js'
import { fetchCurrentUser } from '@/api/users.js'
import {
  PROFILE_STORAGE_KEY,
  PROFILES,
  USER_STORAGE_KEY,
  profileForRole,
  resolveStoredProfile,
  resolveStoredUser,
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

describe('resolveStoredProfile', () => {
  function profileStorage(value) {
    return { getItem: (key) => (key === PROFILE_STORAGE_KEY ? value : null) }
  }

  it('should restore a known profile', () => {
    expect(resolveStoredProfile(profileStorage('manager'))).toBe(PROFILES.MANAGER)
    expect(resolveStoredProfile(profileStorage('collaborator'))).toBe(PROFILES.COLLABORATOR)
  })

  it('should ignore a missing or unknown profile', () => {
    expect(resolveStoredProfile(profileStorage(null))).toBeNull()
    expect(resolveStoredProfile(profileStorage('admin'))).toBeNull()
    expect(resolveStoredProfile(profileStorage('toString'))).toBeNull()
  })

  it('should ignore a storage that cannot be read', () => {
    const brokenStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
    }

    expect(resolveStoredProfile(brokenStorage)).toBeNull()
  })
})

describe('resolveStoredUser', () => {
  function userStorage(value) {
    return { getItem: (key) => (key === USER_STORAGE_KEY ? value : null) }
  }

  it('should restore a stored user', () => {
    expect(resolveStoredUser(userStorage('{"id":10,"name":"Thiago Serpa"}'))).toEqual({
      id: 10,
      name: 'Thiago Serpa',
    })
  })

  it('should ignore a stored value that is not a valid user', () => {
    expect(resolveStoredUser(userStorage('{"id":"abc","name":"X"}'))).toBeNull()
    expect(resolveStoredUser(userStorage('{"id":1,"name":"  "}'))).toBeNull()
    expect(resolveStoredUser(userStorage('not json'))).toBeNull()
    expect(resolveStoredUser(userStorage(null))).toBeNull()
  })
})

describe('authStore session', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('should start without a user', () => {
    const auth = useAuthStore()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.isManager).toBe(false)
    expect(auth.currentUser).toBeNull()
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

  it('should keep the session after the page is reloaded', () => {
    useAuthStore().setSession(MANAGER_ACCOUNT)

    setActivePinia(createPinia())
    const reloaded = useAuthStore()

    expect(reloaded.isManager).toBe(true)
    expect(reloaded.currentUser.name).toBe('Thiago Serpa')
    expect(reloaded.currentUser.area).toBe('Qualidade e Inspeção')
  })

  it('should not restore a session whose stored user is missing', () => {
    localStorage.setItem(PROFILE_STORAGE_KEY, PROFILES.MANAGER)

    const auth = useAuthStore()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.profile).toBeNull()
  })

  it('should switch the user when another account signs in', () => {
    const auth = useAuthStore()
    auth.setSession(MANAGER_ACCOUNT)

    auth.setSession(COLLABORATOR_ACCOUNT)

    expect(auth.isManager).toBe(false)
    expect(auth.currentUser.name).toBe('Beatriz Canuto')
    expect(localStorage.getItem(PROFILE_STORAGE_KEY)).toBe(PROFILES.COLLABORATOR)
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

  it('should open the session of the returned account', async () => {
    const auth = useAuthStore()

    const user = await auth.signIn(CREDENTIALS)

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.isManager).toBe(true)
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
    expect(localStorage.getItem(USER_STORAGE_KEY)).toBeNull()
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
    expect(JSON.parse(localStorage.getItem(USER_STORAGE_KEY)).name).toBe('Tiago Serpa')
  })

  it('should ignore account data of another user', () => {
    const auth = useAuthStore()
    auth.setSession(MANAGER_ACCOUNT)

    auth.applyAccount({ id: 12, name: 'Outra Pessoa', email: 'outra@akaer.local' })

    expect(auth.currentUser.name).toBe('Thiago Serpa')
  })

  it('should refresh the signed in user from the backend account', async () => {
    fetchCurrentUser.mockResolvedValue({
      id: 12,
      name: 'Beatriz C. Canuto',
      email: 'b@akaer.local',
    })
    const auth = useAuthStore()
    auth.setSession(COLLABORATOR_ACCOUNT)

    await auth.refreshAccount()

    expect(auth.currentUser.name).toBe('Beatriz C. Canuto')
  })

  it('should keep the user as it is when the account cannot be loaded', async () => {
    fetchCurrentUser.mockRejectedValue(Object.assign(new Error('no session'), { status: 401 }))
    const auth = useAuthStore()
    auth.setSession(COLLABORATOR_ACCOUNT)

    await auth.refreshAccount()

    expect(auth.currentUser.name).toBe('Beatriz Canuto')
  })

  it('should not ask the backend for the account when nobody is signed in', async () => {
    await useAuthStore().refreshAccount()

    expect(fetchCurrentUser).not.toHaveBeenCalled()
  })

  it('should clear every stored authentication data on logout', () => {
    const auth = useAuthStore()
    auth.setSession(MANAGER_ACCOUNT)
    localStorage.setItem('indice.unrelated', 'kept')
    document.cookie = 'csrftoken=abc; path=/'

    auth.logout()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.profile).toBeNull()
    expect(localStorage.getItem(PROFILE_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(USER_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem('indice.unrelated')).toBe('kept')
    expect(document.cookie).not.toContain('csrftoken')
  })

  it('should keep the user signed out after a reload once logged out', () => {
    useAuthStore().setSession(MANAGER_ACCOUNT)
    useAuthStore().logout()

    setActivePinia(createPinia())

    expect(useAuthStore().isAuthenticated).toBe(false)
  })

  it('should end the backend session and clear the local data on sign out', async () => {
    endSession.mockResolvedValue(null)
    const auth = useAuthStore()
    auth.setSession(MANAGER_ACCOUNT)

    await auth.signOut()

    expect(endSession).toHaveBeenCalledTimes(1)
    expect(auth.isAuthenticated).toBe(false)
    expect(localStorage.getItem(PROFILE_STORAGE_KEY)).toBeNull()
  })

  it('should still clear the local data when the backend cannot end the session', async () => {
    endSession.mockRejectedValue(new Error('offline'))
    const auth = useAuthStore()
    auth.setSession(MANAGER_ACCOUNT)

    await auth.signOut()

    expect(auth.isAuthenticated).toBe(false)
    expect(localStorage.getItem(PROFILE_STORAGE_KEY)).toBeNull()
  })
})
