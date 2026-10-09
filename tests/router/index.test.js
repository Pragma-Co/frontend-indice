import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import router from '../../src/router'
import { PROFILES, useAuthStore } from '../../src/stores/authStore'

describe('router', () => {
  beforeEach(async () => {
    localStorage.clear()
    setActivePinia(createPinia())
    useAuthStore().login(PROFILES.COLLABORATOR)
    await router.push('/login')
  })

  it('should resolve the home route to the home view', async () => {
    await router.push('/home')
    expect(router.currentRoute.value.name).toBe('home')
    expect(document.title).toBe('Colaborador - Início')
  })

  it('should send the root path to the home route', async () => {
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

  it('should send a visitor without a profile to the login screen', async () => {
    localStorage.clear()
    setActivePinia(createPinia())

    await router.push('/documents')

    expect(router.currentRoute.value.name).toBe('login')
    expect(document.title).toBe('Índice - Entrar')
  })

  it('should keep the login screen reachable to switch profiles', async () => {
    await router.push('/home')

    await router.push('/login')

    expect(router.currentRoute.value.name).toBe('login')
  })

  it.each(['/revisions', '/collaborators'])(
    'should send a collaborator back to the home route when opening %s',
    async (path) => {
      await router.push(path)

      expect(router.currentRoute.value.name).toBe('home')
    },
  )

  it('should open the manager routes for a manager', async () => {
    useAuthStore().login(PROFILES.MANAGER)

    await router.push('/revisions')
    const revisionsRoute = router.currentRoute.value.name
    await router.push('/collaborators')

    expect(revisionsRoute).toBe('revisions')
    expect(router.currentRoute.value.name).toBe('collaborators')
    expect(document.title).toBe('Gestor - Colaboradores')
  })

  it.each([PROFILES.COLLABORATOR, PROFILES.MANAGER])(
    'should open the profile route for the %s',
    async (profile) => {
      useAuthStore().login(profile)

      await router.push('/profile')

      expect(router.currentRoute.value.name).toBe('profile')
      expect(document.title).toBe('Índice - Gestão do Titular')
    },
  )
})
