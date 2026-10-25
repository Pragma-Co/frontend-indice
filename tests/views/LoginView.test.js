import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LoginView from '../../src/views/login/LoginView.vue'
import { useAuthStore } from '../../src/stores/authStore'
import { startDevelopmentSession } from '../../src/api/auth'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('../../src/api/auth', () => ({ startDevelopmentSession: vi.fn() }))

function deferred() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('LoginView', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    startDevelopmentSession.mockResolvedValue({})
  })

  it('should offer the collaborator and the manager profiles', () => {
    const wrapper = mount(LoginView)

    const labels = wrapper.findAll('button').map((button) => button.text())

    expect(labels).toEqual(['Entrar como Colaborador', 'Entrar como Gestor'])
  })

  it('should sign in as a collaborator and open the home route', async () => {
    const wrapper = mount(LoginView)

    await wrapper.find('button[data-profile="collaborator"]').trigger('click')
    await flushPromises()

    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.isManager).toBe(false)
    expect(push).toHaveBeenCalledWith({ name: 'home' })
  })

  it('should sign in as a manager and open the home route', async () => {
    const wrapper = mount(LoginView)

    await wrapper.find('button[data-profile="manager"]').trigger('click')
    await flushPromises()

    const auth = useAuthStore()
    expect(auth.isManager).toBe(true)
    expect(push).toHaveBeenCalledWith({ name: 'home' })
  })

  it('should open the backend session of the manager before leaving the login screen', async () => {
    const session = deferred()
    startDevelopmentSession.mockReturnValue(session.promise)
    const wrapper = mount(LoginView)

    await wrapper.find('button[data-profile="manager"]').trigger('click')
    const navigatedBeforeSession = push.mock.calls.length
    session.resolve({})
    await flushPromises()

    expect(startDevelopmentSession).toHaveBeenCalledWith(10)
    expect(navigatedBeforeSession).toBe(0)
    expect(push).toHaveBeenCalledWith({ name: 'home' })
  })

  it('should block the buttons while the sign in is in progress', async () => {
    startDevelopmentSession.mockReturnValue(deferred().promise)
    const wrapper = mount(LoginView)

    await wrapper.find('button[data-profile="manager"]').trigger('click')

    const disabled = wrapper.findAll('button').map((button) => button.attributes('disabled'))
    expect(disabled).toEqual(['', ''])
    expect(wrapper.find('button[data-profile="manager"]').attributes('aria-busy')).toBe('true')
  })

  it('should still enter when the backend session cannot be opened', async () => {
    startDevelopmentSession.mockRejectedValue(new Error('offline'))
    const wrapper = mount(LoginView)

    await wrapper.find('button[data-profile="manager"]').trigger('click')
    await flushPromises()

    expect(push).toHaveBeenCalledWith({ name: 'home' })
  })
})
