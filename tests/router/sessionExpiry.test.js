import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { SESSION_EXPIRED_MESSAGE, createSessionExpiryHandler } from '../../src/router/sessionExpiry'
import { useAuthStore } from '../../src/stores/authStore'
import { useNotificationStore } from '../../src/stores/notificationStore'
import { MANAGER_ACCOUNT } from '../fixtures/accounts'

const Page = { template: '<div />' }

async function createTestRouter(path) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: Page, meta: { public: true } },
      { path: '/home', name: 'home', component: Page },
      { path: '/documents', name: 'document-list', component: Page },
    ],
  })
  await router.push(path)
  return router
}

function errorMessages() {
  return useNotificationStore()
    .items.filter((item) => item.type === 'error')
    .map((item) => item.message)
}

describe('createSessionExpiryHandler', () => {
  beforeEach(() => {
    vi.useRealTimers()
    setActivePinia(createPinia())
  })

  it('should log out, warn the user and go to the login keeping the current page', async () => {
    const router = await createTestRouter('/documents?q=asa')
    useAuthStore().setSession(MANAGER_ACCOUNT)

    createSessionExpiryHandler(router)()
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'))

    expect(useAuthStore().isAuthenticated).toBe(false)
    expect(errorMessages()).toEqual([SESSION_EXPIRED_MESSAGE])
    expect(router.currentRoute.value.query).toEqual({ redirect: '/documents?q=asa' })
  })

  it('should not keep a redirect when the session expires on the home page', async () => {
    const router = await createTestRouter('/home')
    useAuthStore().setSession(MANAGER_ACCOUNT)

    createSessionExpiryHandler(router)()
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'))

    expect(router.currentRoute.value.query).toEqual({})
  })

  it('should warn only once when several requests expire together', async () => {
    const router = await createTestRouter('/documents')
    useAuthStore().setSession(MANAGER_ACCOUNT)
    const push = vi.spyOn(router, 'push')
    const handleSessionExpiry = createSessionExpiryHandler(router)

    handleSessionExpiry()
    handleSessionExpiry()
    handleSessionExpiry()

    expect(errorMessages()).toEqual([SESSION_EXPIRED_MESSAGE])
    expect(push).toHaveBeenCalledTimes(1)
  })

  it('should ignore an unauthorized answer while nobody is signed in', async () => {
    const router = await createTestRouter('/login')
    const push = vi.spyOn(router, 'push')

    createSessionExpiryHandler(router)()

    expect(errorMessages()).toEqual([])
    expect(push).not.toHaveBeenCalled()
  })

  it('should stay on the login screen when the session expires there', async () => {
    const router = await createTestRouter('/login')
    useAuthStore().setSession(MANAGER_ACCOUNT)
    const push = vi.spyOn(router, 'push')

    createSessionExpiryHandler(router)()

    expect(useAuthStore().isAuthenticated).toBe(false)
    expect(errorMessages()).toEqual([SESSION_EXPIRED_MESSAGE])
    expect(push).not.toHaveBeenCalled()
  })
})
