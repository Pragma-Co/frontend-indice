import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { DEV_USER_STORAGE_KEY, resolveDevelopmentUser, useAuthStore } from '@/stores/authStore.js'

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

describe('authStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should expose the current user with initials', () => {
    const auth = useAuthStore()

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.initials).toBe('BC')
  })
})
