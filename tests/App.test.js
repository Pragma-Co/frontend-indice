import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import App from '../src/App.vue'
import { useAuthStore } from '../src/stores/authStore'
import { COLLABORATOR_ACCOUNT, MANAGER_ACCOUNT } from './fixtures/accounts'

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
  })

  it('should hide the navbar on the login screen', async () => {
    useAuthStore().setSession(MANAGER_ACCOUNT)

    const wrapper = await mountApp('/login')

    expect(wrapper.find('header.navbar').exists()).toBe(false)
  })

  it('should hide the navbar while nobody is signed in', async () => {
    const wrapper = await mountApp('/home')

    expect(wrapper.find('header.navbar').exists()).toBe(false)
  })

  it('should show the navbar to a signed in user', async () => {
    useAuthStore().setSession(COLLABORATOR_ACCOUNT)

    const wrapper = await mountApp('/home')

    expect(wrapper.find('header.navbar').exists()).toBe(true)
  })
})
