import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import Navbar from '../../src/components/layout/Navbar.vue'

const Page = { template: '<div />' }

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', name: 'home', component: Page },
      { path: '/documentos', name: 'document-list', component: Page },
      { path: '/documentos/upload', name: 'document-upload', component: Page },
    ],
  })
}

async function mountNavbar(path = '/home') {
  const router = createTestRouter()
  router.push(path)
  await router.isReady()
  const wrapper = mount(Navbar, { global: { plugins: [router] } })
  return { wrapper, router }
}

describe('Navbar', () => {
  it('should render the logo linking to the home route', async () => {
    // When
    const { wrapper } = await mountNavbar()
    // Then
    const brand = wrapper.find('a.navbar-brand')
    expect(brand.attributes('href')).toBe('/home')
    expect(brand.find('img').attributes('alt')).toBe('Índice')
  })

  it('should render the Início and Documentos links pointing to their routes', async () => {
    // When
    const { wrapper } = await mountNavbar()
    // Then
    const links = wrapper.findAll('a.navbar-link')
    expect(links.map((link) => link.text())).toEqual(['Início', 'Documentos'])
    expect(links.map((link) => link.attributes('href'))).toEqual(['/home', '/documentos'])
  })

  it('should mark Início as active on the home route', async () => {
    // When
    const { wrapper } = await mountNavbar('/home')
    // Then
    const [home, documents] = wrapper.findAll('a.navbar-link')
    expect(home.classes()).toContain('active')
    expect(documents.classes()).not.toContain('active')
  })

  it('should mark Documentos as active on any documents route', async () => {
    // When
    const { wrapper } = await mountNavbar('/documentos/upload')
    // Then
    const [home, documents] = wrapper.findAll('a.navbar-link')
    expect(documents.classes()).toContain('active')
    expect(home.classes()).not.toContain('active')
  })

  it('should navigate to the home route when the logo is clicked', async () => {
    // Given
    const { wrapper, router } = await mountNavbar('/documentos/upload')
    // When
    await wrapper.find('a.navbar-brand').trigger('click')
    await flushPromises()
    // Then
    expect(router.currentRoute.value.path).toBe('/home')
  })

  it('should navigate to the documents route when Documentos is clicked', async () => {
    // Given
    const { wrapper, router } = await mountNavbar('/home')
    // When
    await wrapper.findAll('a.navbar-link')[1].trigger('click')
    await flushPromises()
    // Then
    expect(router.currentRoute.value.path).toBe('/documentos')
  })

  it('should show the notifications bell on the right block', async () => {
    // When
    const { wrapper } = await mountNavbar()
    // Then
    const bell = wrapper.find('.navbar-user button[aria-label="Notificações"]')
    expect(bell.exists()).toBe(true)
    expect(bell.find('img').exists()).toBe(true)
  })

  it('should show the initials and the name of the current user', async () => {
    // When
    const { wrapper } = await mountNavbar()
    // Then
    expect(wrapper.find('.navbar-avatar').text()).toBe('JS')
    expect(wrapper.find('.navbar-user-name').text()).toBe('João Silva')
  })

  it('should keep the bar sticky at the top of the page', async () => {
    // When
    const { wrapper } = await mountNavbar()
    // Then
    expect(wrapper.find('header.navbar').exists()).toBe(true)
  })
})
