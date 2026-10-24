import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
vi.mock('../src/api/users', () => ({ fetchCurrentUser: vi.fn() }))

import App from '../src/App.vue'
import { fetchCurrentUser } from '../src/api/users'
import { PROFILES, useAuthStore } from '../src/stores/authStore'

const Page = { template: '<div />' }

async function mountApp(path) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: Page, meta: { public: true } },
      { path: '/home', name: 'home', component: Page },
      { path: '/profile', name: 'profile', component: Page },
    ],
  })
  router.push(path)
  await router.isReady()
  return mount(App, { global: { plugins: [router] } })
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    fetchCurrentUser.mockResolvedValue({ id: 12, name: 'Beatriz Canuto' })
  })

  it('should hide the navbar on the login screen', async () => {
    useAuthStore().login(PROFILES.MANAGER)

    const wrapper = await mountApp('/login')

    expect(wrapper.find('header.navbar').exists()).toBe(false)
  })

  it('should hide the navbar while nobody is signed in', async () => {
    const wrapper = await mountApp('/home')

    expect(wrapper.find('header.navbar').exists()).toBe(false)
  })

  it('should show the navbar to a signed in user', async () => {
    useAuthStore().login(PROFILES.COLLABORATOR)

    const wrapper = await mountApp('/home')

    expect(wrapper.find('header.navbar').exists()).toBe(true)
  })

  it('should refresh the signed in user from the backend when the app opens', async () => {
    useAuthStore().login(PROFILES.COLLABORATOR)
    fetchCurrentUser.mockResolvedValue({ id: 12, name: 'Beatriz C. Canuto' })

    const wrapper = await mountApp('/home')
    await flushPromises()

    expect(fetchCurrentUser).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.navbar-user-name').text()).toBe('Beatriz C. Canuto')
  })

  it('should not ask the backend for the account when nobody is signed in', async () => {
    await mountApp('/login')
    await flushPromises()

    expect(fetchCurrentUser).not.toHaveBeenCalled()
  })
})
