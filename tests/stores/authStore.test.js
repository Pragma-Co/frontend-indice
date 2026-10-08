import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  DEV_USER_STORAGE_KEY,
  PROFILE_STORAGE_KEY,
  PROFILES,
  resolveDevelopmentUser,
  resolveStoredProfile,
  useAuthStore,
} from '@/stores/authStore.js'

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
    expect(auth.currentUser).toMatchObject({ id: 8, name: 'Joana Prado', role: 'Gestor' })
    expect(auth.initials).toBe('JP')
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
    expect(reloaded.currentUser.name).toBe('Joana Prado')
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
