import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LoginView from '../../src/views/login/LoginView.vue'
import { useAuthStore } from '../../src/stores/authStore'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

describe('LoginView', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should offer the collaborator and the manager profiles', () => {
    const wrapper = mount(LoginView)

    const labels = wrapper.findAll('button').map((button) => button.text())

    expect(labels).toEqual(['Entrar como Colaborador', 'Entrar como Gestor'])
  })

  it('should sign in as a collaborator and open the home route', async () => {
    const wrapper = mount(LoginView)

    await wrapper.find('button[data-profile="collaborator"]').trigger('click')

    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.isManager).toBe(false)
    expect(push).toHaveBeenCalledWith({ name: 'home' })
  })

  it('should sign in as a manager and open the home route', async () => {
    const wrapper = mount(LoginView)

    await wrapper.find('button[data-profile="manager"]').trigger('click')

    const auth = useAuthStore()
    expect(auth.isManager).toBe(true)
    expect(push).toHaveBeenCalledWith({ name: 'home' })
  })
})
