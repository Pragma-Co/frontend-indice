import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { endSession, startDevelopmentSession } from '@/api/auth.js'
import { fetchCurrentUser } from '@/api/users.js'
import {
  DEV_USER_STORAGE_KEY,
  PROFILE_STORAGE_KEY,
  PROFILES,
  resolveDevelopmentUser,
  resolveStoredProfile,
  useAuthStore,
} from '@/stores/authStore.js'

vi.mock('@/api/auth.js', () => ({ startDevelopmentSession: vi.fn(), endSession: vi.fn() }))
vi.mock('@/api/users.js', () => ({ fetchCurrentUser: vi.fn() }))

function storageWith(value) {
  return {
    getItem: (key) => (key === DEV_USER_STORAGE_KEY ? value : null),
    setItem: () => {},
    removeItem: () => {},
  }
}

const EMPTY_STORAGE = storageWith(null)

describe('resolveDevelopmentUser', () => {
  beforeEach(() => {
    vi.stubEnv('DEV', true)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should use the seed user when nothing is stored', () => {
    expect(resolveDevelopmentUser(EMPTY_STORAGE)).toEqual({
      id: 12,
      name: 'Beatriz Canuto',
      email: 'beatriz.canuto@akaer.local',
      role: 'Colaborador',
      department: 'Departamento de Engenharia',
      area: 'Certificação e Aeronavegabilidade',
    })
  })

  it('should let a developer impersonate another seeded user through local storage', () => {
    const user = resolveDevelopmentUser(storageWith('{"id":3,"name":"Caio Bertoni"}'))

    expect(user).toEqual({
      id: 3,
      name: 'Caio Bertoni',
      email: 'beatriz.canuto@akaer.local',
      role: 'Colaborador',
      department: 'Departamento de Engenharia',
      area: 'Certificação e Aeronavegabilidade',
    })
  })

  it('should ignore a stored value that is not a valid user', () => {
    expect(resolveDevelopmentUser(storageWith('{"id":"abc"}'))).toMatchObject({ id: 12 })
    expect(resolveDevelopmentUser(storageWith('not json'))).toMatchObject({ id: 12 })
    expect(resolveDevelopmentUser(storageWith('null'))).toMatchObject({ id: 12 })
  })

  it('should never read the override outside development mode', () => {
    vi.stubEnv('DEV', false)

    expect(resolveDevelopmentUser(storageWith('{"id":3,"name":"Caio"}'))).toMatchObject({ id: 12 })
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

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('should start without a user until a profile is chosen', () => {
    const auth = useAuthStore()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.isManager).toBe(false)
    expect(auth.currentUser).toBeNull()
  })

  it('should sign in as a collaborator', () => {
    const auth = useAuthStore()

    const signedIn = auth.login(PROFILES.COLLABORATOR)

    expect(signedIn).toBe(true)
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.isManager).toBe(false)
    expect(auth.currentUser).toMatchObject({ id: 12, name: 'Beatriz Canuto', role: 'Colaborador' })
    expect(auth.initials).toBe('BC')
  })

  it('should sign in as a manager', () => {
    const auth = useAuthStore()

    auth.login(PROFILES.MANAGER)

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.isManager).toBe(true)
    expect(auth.currentUser).toMatchObject({ id: 10, name: 'Thiago Serpa', role: 'Gestor' })
    expect(auth.initials).toBe('TS')
  })

  it('should refuse an unknown profile', () => {
    const auth = useAuthStore()

    const signedIn = auth.login('admin')

    expect(signedIn).toBe(false)
    expect(auth.isAuthenticated).toBe(false)
    expect(localStorage.getItem(PROFILE_STORAGE_KEY)).toBeNull()
  })

  it('should keep the chosen profile after the page is reloaded', () => {
    useAuthStore().login(PROFILES.MANAGER)

    setActivePinia(createPinia())
    const reloaded = useAuthStore()

    expect(reloaded.isManager).toBe(true)
    expect(reloaded.currentUser.name).toBe('Thiago Serpa')
  })

  it('should switch the user when another profile signs in', () => {
    const auth = useAuthStore()
    auth.login(PROFILES.MANAGER)

    auth.login(PROFILES.COLLABORATOR)

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
    vi.stubEnv('DEV', true)
    startDevelopmentSession.mockResolvedValue({ id: 10 })
    fetchCurrentUser.mockResolvedValue({
      id: 10,
      name: 'Thiago Serpa',
      email: 'thiago.serpa@akaer.local',
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should open a backend session for the manager user', async () => {
    const auth = useAuthStore()

    const signedIn = await auth.signIn(PROFILES.MANAGER)

    expect(signedIn).toBe(true)
    expect(auth.isManager).toBe(true)
    expect(startDevelopmentSession).toHaveBeenCalledWith(10)
  })

  it('should load the account data of the backend session after signing in', async () => {
    fetchCurrentUser.mockResolvedValue({ id: 10, name: 'Thiago S. Serpa', email: 't@akaer.local' })
    const auth = useAuthStore()

    await auth.signIn(PROFILES.MANAGER)

    expect(fetchCurrentUser).toHaveBeenCalledTimes(1)
    expect(auth.currentUser.name).toBe('Thiago S. Serpa')
  })

  it('should open a backend session for the collaborator user', async () => {
    const auth = useAuthStore()

    await auth.signIn(PROFILES.COLLABORATOR)

    expect(auth.isManager).toBe(false)
    expect(startDevelopmentSession).toHaveBeenCalledWith(12)
  })

  it('should still sign in on the frontend when the backend session fails', async () => {
    startDevelopmentSession.mockRejectedValue(new Error('offline'))
    const auth = useAuthStore()

    const signedIn = await auth.signIn(PROFILES.MANAGER)

    expect(signedIn).toBe(true)
    expect(auth.isAuthenticated).toBe(true)
  })

  it('should not ask for a backend session for an unknown profile', async () => {
    const auth = useAuthStore()

    const signedIn = await auth.signIn('admin')

    expect(signedIn).toBe(false)
    expect(startDevelopmentSession).not.toHaveBeenCalled()
  })

  it('should not ask for a backend session outside development mode', async () => {
    vi.stubEnv('DEV', false)
    const auth = useAuthStore()

    const signedIn = await auth.signIn(PROFILES.MANAGER)

    expect(signedIn).toBe(true)
    expect(startDevelopmentSession).not.toHaveBeenCalled()
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
    auth.login(PROFILES.MANAGER)

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
    auth.login(PROFILES.MANAGER)

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
    auth.login(PROFILES.COLLABORATOR)

    await auth.refreshAccount()

    expect(auth.currentUser.name).toBe('Beatriz C. Canuto')
  })

  it('should keep the user as it is when the account cannot be loaded', async () => {
    fetchCurrentUser.mockRejectedValue(Object.assign(new Error('no session'), { status: 401 }))
    const auth = useAuthStore()
    auth.login(PROFILES.COLLABORATOR)

    await auth.refreshAccount()

    expect(auth.currentUser.name).toBe('Beatriz Canuto')
  })

  it('should not ask the backend for the account when nobody is signed in', async () => {
    await useAuthStore().refreshAccount()

    expect(fetchCurrentUser).not.toHaveBeenCalled()
  })

  it('should clear every stored authentication data on logout', () => {
    const auth = useAuthStore()
    auth.login(PROFILES.MANAGER)
    localStorage.setItem(DEV_USER_STORAGE_KEY, '{"id":3,"name":"Caio Bertoni"}')
    localStorage.setItem('indice.unrelated', 'kept')
    document.cookie = 'csrftoken=abc; path=/'

    auth.logout()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.profile).toBeNull()
    expect(localStorage.getItem(PROFILE_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(DEV_USER_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem('indice.unrelated')).toBe('kept')
    expect(document.cookie).not.toContain('csrftoken')
  })

  it('should keep the user signed out after a reload once logged out', () => {
    useAuthStore().login(PROFILES.MANAGER)
    useAuthStore().logout()

    setActivePinia(createPinia())

    expect(useAuthStore().isAuthenticated).toBe(false)
  })

  it('should end the backend session and clear the local data on sign out', async () => {
    endSession.mockResolvedValue(null)
    const auth = useAuthStore()
    auth.login(PROFILES.MANAGER)

    await auth.signOut()

    expect(endSession).toHaveBeenCalledTimes(1)
    expect(auth.isAuthenticated).toBe(false)
    expect(localStorage.getItem(PROFILE_STORAGE_KEY)).toBeNull()
  })

  it('should still clear the local data when the backend cannot end the session', async () => {
    endSession.mockRejectedValue(new Error('offline'))
    const auth = useAuthStore()
    auth.login(PROFILES.MANAGER)

    await auth.signOut()

    expect(auth.isAuthenticated).toBe(false)
    expect(localStorage.getItem(PROFILE_STORAGE_KEY)).toBeNull()
  })
})
