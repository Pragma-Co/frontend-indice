import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import Navbar from '../../src/components/layout/Navbar.vue'
import { PROFILES, useAuthStore } from '../../src/stores/authStore'

const Page = { template: '<div />' }

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', name: 'home', component: Page },
      { path: '/documents', name: 'document-list', component: Page },
      { path: '/documents/upload', name: 'document-upload', component: Page },
      { path: '/revisions', name: 'revisions', component: Page },
      { path: '/collaborators', name: 'collaborators', component: Page },
      { path: '/profile', name: 'profile', component: Page },
    ],
  })
}

async function mountNavbar(path = '/home', profile = PROFILES.COLLABORATOR) {
  useAuthStore().login(profile)
  const router = createTestRouter()
  router.push(path)
  await router.isReady()
  const wrapper = mount(Navbar, { global: { plugins: [router] } })
  return { wrapper, router }
}

describe('Navbar', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('should render the logo linking to the home route', async () => {
    const { wrapper } = await mountNavbar()
    const brand = wrapper.find('a.navbar-brand')
    expect(brand.attributes('href')).toBe('/home')
    expect(brand.find('img').attributes('alt')).toBe('Índice')
  })

  it('should render only the Início and Documentos links for a collaborator', async () => {
    const { wrapper } = await mountNavbar()
    const links = wrapper.findAll('a.navbar-link')
    expect(links.map((link) => link.text())).toEqual(['Início', 'Documentos'])
    expect(links.map((link) => link.attributes('href'))).toEqual(['/home', '/documents'])
  })

  it('should mark Início as active on the home route', async () => {
    const { wrapper } = await mountNavbar('/home')
    const [home, documents] = wrapper.findAll('a.navbar-link')
    expect(home.classes()).toContain('active')
    expect(documents.classes()).not.toContain('active')
  })

  it('should mark Documentos as active on any documents route', async () => {
    const { wrapper } = await mountNavbar('/documents/upload')
    const [home, documents] = wrapper.findAll('a.navbar-link')
    expect(documents.classes()).toContain('active')
    expect(home.classes()).not.toContain('active')
  })

  it('should navigate to the home route when the logo is clicked', async () => {
    const { wrapper, router } = await mountNavbar('/documents/upload')
    await wrapper.find('a.navbar-brand').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/home')
  })

  it('should navigate to the documents route when Documentos is clicked', async () => {
    const { wrapper, router } = await mountNavbar('/home')
    await wrapper.findAll('a.navbar-link')[1].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/documents')
  })

  it('should show the notifications bell on the right block', async () => {
    const { wrapper } = await mountNavbar()
    const bell = wrapper.find('.navbar-user button[aria-label="Notificações"]')
    expect(bell.exists()).toBe(true)
    expect(bell.find('img').exists()).toBe(true)
  })

  it('should show the initials and the name of the current user', async () => {
    const { wrapper } = await mountNavbar()
    expect(wrapper.find('.navbar-avatar').text()).toBe('BC')
    expect(wrapper.find('.navbar-user-name').text()).toBe('Beatriz Canuto')
  })

  it('should keep the bar sticky at the top of the page', async () => {
    const { wrapper } = await mountNavbar()
    expect(wrapper.find('header.navbar').exists()).toBe(true)
  })

  it('should render the Início, Revisões and Colaboradores links for a manager', async () => {
    const { wrapper } = await mountNavbar('/home', PROFILES.MANAGER)

    const links = wrapper.findAll('a.navbar-link')

    expect(links.map((link) => link.text())).toEqual(['Início', 'Revisões', 'Colaboradores'])
    expect(links.map((link) => link.attributes('href'))).toEqual([
      '/home',
      '/revisions',
      '/collaborators',
    ])
  })

  it('should hide the manager tabs from a collaborator', async () => {
    const { wrapper } = await mountNavbar()

    const labels = wrapper.findAll('a.navbar-link').map((link) => link.text())

    expect(labels).not.toContain('Revisões')
    expect(labels).not.toContain('Colaboradores')
  })

  it('should mark Revisões as active on the revisions route for a manager', async () => {
    const { wrapper } = await mountNavbar('/revisions', PROFILES.MANAGER)

    const [home, revisions, collaborators] = wrapper.findAll('a.navbar-link')

    expect(revisions.classes()).toContain('active')
    expect(home.classes()).not.toContain('active')
    expect(collaborators.classes()).not.toContain('active')
  })

  it('should navigate to the collaborators route when a manager clicks Colaboradores', async () => {
    const { wrapper, router } = await mountNavbar('/home', PROFILES.MANAGER)

    await wrapper.findAll('a.navbar-link')[2].trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/collaborators')
  })

  it('should show the initials and the name of the manager', async () => {
    const { wrapper } = await mountNavbar('/home', PROFILES.MANAGER)

    expect(wrapper.find('.navbar-avatar').text()).toBe('JP')
    expect(wrapper.find('.navbar-user-name').text()).toBe('Joana Prado')
  })

  it.each([PROFILES.COLLABORATOR, PROFILES.MANAGER])(
    'should navigate to the profile route when the %s clicks the user name',
    async (profile) => {
      const { wrapper, router } = await mountNavbar('/home', profile)

      await wrapper.find('a.navbar-profile').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/profile')
      expect(wrapper.find('a.navbar-profile').classes()).toContain('active')
    },
  )
})
