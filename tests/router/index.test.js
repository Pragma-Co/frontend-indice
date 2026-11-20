import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
vi.mock('../../src/api/users', () => ({ fetchCurrentUser: vi.fn() }))

import router, { loginLocation } from '../../src/router'
import { fetchCurrentUser } from '../../src/api/users'
import { PROFILES, useAuthStore } from '../../src/stores/authStore'
import { ACCOUNTS_BY_PROFILE, COLLABORATOR_ACCOUNT, MANAGER_ACCOUNT } from '../fixtures/accounts'

const NO_SESSION = Object.assign(new Error('unauthorized'), { status: 401 })

function startWithoutSession() {
  setActivePinia(createPinia())
  fetchCurrentUser.mockRejectedValue(NO_SESSION)
}

describe('loginLocation', () => {
  it('should keep the requested path to return to it after login', () => {
    expect(loginLocation('/documents?q=asa')).toEqual({
      name: 'login',
      query: { redirect: '/documents?q=asa' },
    })
  })

  it.each(['/', '/home', '', undefined])('should not keep a redirect to %s', (path) => {
    expect(loginLocation(path)).toEqual({ name: 'login' })
  })
})

describe('router', () => {
  beforeEach(async () => {
    localStorage.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
    useAuthStore().setSession(COLLABORATOR_ACCOUNT)
    await router.push('/home')
  })

  it('should resolve the home route to the home view', async () => {
    await router.push('/results')
    await router.push('/home')
    expect(router.currentRoute.value.name).toBe('home')
    expect(document.title).toBe('Colaborador - Início')
  })

  it('should send the root path to the home route', async () => {
    await router.push('/documents')
    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/home')
  })

  it('should resolve the documents route to the list view', async () => {
    await router.push('/documents')
    expect(router.currentRoute.value.name).toBe('document-list')
  })

  it('should resolve the new revision route of a document', async () => {
    await router.push('/documents/23/new-revision')

    expect(router.currentRoute.value.name).toBe('document-new-revision')
    expect(router.currentRoute.value.params.documentId).toBe('23')
    expect(document.title).toBe('Colaborador - Nova revisão')
  })

  it('should keep every document route under /documents so the navbar marks the Documentos tab', () => {
    const names = ['document-list', 'document-upload', 'document-metadata', 'document-confirmation']

    const paths = names.map((name) => router.resolve({ name }).path)

    expect(paths).toEqual([
      '/documents',
      '/documents/upload',
      '/documents/metadata',
      '/documents/confirmation',
    ])
  })

  it('should send a visitor without a session to the login screen keeping the requested page', async () => {
    startWithoutSession()

    await router.push('/documents?q=asa')

    expect(fetchCurrentUser).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query).toEqual({ redirect: '/documents?q=asa' })
    expect(document.title).toBe('Índice - Entrar')
  })

  it('should send a visitor without a session to the login screen without a redirect to home', async () => {
    await router.push('/documents')
    startWithoutSession()

    await router.push('/home')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query).toEqual({})
  })

  it('should wait for the backend session before opening a protected page', async () => {
    setActivePinia(createPinia())
    fetchCurrentUser.mockResolvedValue(MANAGER_ACCOUNT)

    await router.push('/revisions')

    expect(fetchCurrentUser).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.name).toBe('revisions')
    expect(useAuthStore().isManager).toBe(true)
  })

  it('should check the backend session only once across navigations', async () => {
    setActivePinia(createPinia())
    fetchCurrentUser.mockResolvedValue(COLLABORATOR_ACCOUNT)

    await router.push('/documents')
    await router.push('/profile')

    expect(fetchCurrentUser).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.name).toBe('profile')
  })

  it('should send a signed in user away from the login screen to the home route', async () => {
    await router.push('/documents')

    await router.push('/login')

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('should open the login screen for a visitor without a session', async () => {
    startWithoutSession()

    await router.push('/login')

    expect(router.currentRoute.value.name).toBe('login')
  })

  it('should send the user to the login screen after logout without asking the backend again', async () => {
    await router.push('/documents')
    useAuthStore().logout()

    await router.push('/profile')

    expect(fetchCurrentUser).not.toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query).toEqual({ redirect: '/profile' })
  })

  it.each(['/revisions', '/collaborators'])(
    'should send a collaborator back to the home route when opening %s',
    async (path) => {
      await router.push('/documents')
      await router.push(path)

      expect(router.currentRoute.value.name).toBe('home')
    },
  )

  it('should send a manager back to the home route when opening the documents list', async () => {
    useAuthStore().setSession(MANAGER_ACCOUNT)
    await router.push('/revisions')

    await router.push('/documents')

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('should open the documents list for a collaborator', async () => {
    await router.push('/documents')

    expect(router.currentRoute.value.name).toBe('document-list')
  })

  it('should open the manager routes for a manager', async () => {
    useAuthStore().setSession(MANAGER_ACCOUNT)

    await router.push('/revisions')
    const revisionsRoute = router.currentRoute.value.name
    await router.push('/collaborators')

    expect(revisionsRoute).toBe('revisions')
    expect(router.currentRoute.value.name).toBe('collaborators')
    expect(document.title).toBe('Gestor - Colaboradores')
  })

  it('should open the review panel on the revisions route', async () => {
    useAuthStore().setSession(MANAGER_ACCOUNT)

    await router.push('/revisions')

    expect(router.currentRoute.value.name).toBe('revisions')
    expect(document.title).toBe('Gestor - Painel de gestão')
  })

  it.each([PROFILES.COLLABORATOR, PROFILES.MANAGER])(
    'should open the profile route for the %s',
    async (profile) => {
      useAuthStore().setSession(ACCOUNTS_BY_PROFILE[profile])

      await router.push('/profile')

      expect(router.currentRoute.value.name).toBe('profile')
      expect(document.title).toBe('Índice - Gestão do Titular')
    },
  )
})
