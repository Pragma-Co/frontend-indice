import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LoginView from '../../src/views/login/LoginView.vue'
import { useAuthStore } from '../../src/stores/authStore'
import { MANAGER_ACCOUNT } from '../fixtures/accounts'

const push = vi.fn()
const route = { query: {} }
vi.mock('vue-router', () => ({ useRouter: () => ({ push }), useRoute: () => route }))
vi.mock('../../src/api/auth', () => ({
  fetchCsrfCookie: vi.fn(),
  startSession: vi.fn(),
  endSession: vi.fn(),
}))

function deferred() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function apiError(status) {
  return Object.assign(new Error('request failed'), { status })
}

function mountView() {
  const wrapper = mount(LoginView, { attachTo: document.body })
  const auth = useAuthStore()
  return {
    wrapper,
    auth,
    email: () => wrapper.find('#login-email'),
    password: () => wrapper.find('#login-password'),
    submitButton: () => wrapper.find('button[type="submit"]'),
    toggle: () => wrapper.find('.password-input__toggle'),
    errors: () => wrapper.findAll('.field__error').map((error) => error.text()),
    alert: () => wrapper.find('.login-alert'),
  }
}

async function fillAndSubmit(
  view,
  { email = 'thiago.serpa@akaer.local', password = 'senha-segura' },
) {
  await view.email().setValue(email)
  await view.password().setValue(password)
  await view.wrapper.find('form').trigger('submit')
}

describe('LoginView', () => {
  let view

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    route.query = {}
    view = mountView()
    vi.spyOn(view.auth, 'signIn').mockResolvedValue(MANAGER_ACCOUNT)
  })

  afterEach(() => {
    view.wrapper.unmount()
  })

  it('should render the e-mail and password fields and the submit button', () => {
    expect(view.wrapper.find('h1').text()).toBe('Entrar')
    expect(view.email().attributes('type')).toBe('email')
    expect(view.email().attributes('autocomplete')).toBe('username')
    expect(view.password().attributes('type')).toBe('password')
    expect(view.password().attributes('autocomplete')).toBe('current-password')
    expect(view.wrapper.find('label[for="login-email"]').text()).toContain('E-mail')
    expect(view.wrapper.find('label[for="login-password"]').text()).toContain('Senha')
    expect(view.submitButton().text()).toBe('Entrar')
  })

  it('should not show any error before the user interacts with the form', () => {
    expect(view.errors()).toEqual([])
    expect(view.alert().exists()).toBe(false)
  })

  it('should ask for both fields when the empty form is submitted', async () => {
    await view.wrapper.find('form').trigger('submit')

    expect(view.errors()).toEqual(['Informe o e-mail.', 'Informe a senha.'])
    expect(view.email().attributes('aria-invalid')).toBe('true')
    expect(view.email().attributes('aria-describedby')).toBe('login-email-error')
    expect(view.wrapper.find('#login-email-error').text()).toBe('Informe o e-mail.')
    expect(view.password().attributes('aria-describedby')).toBe('login-password-error')
    expect(view.auth.signIn).not.toHaveBeenCalled()
  })

  it('should flag an invalid e-mail when the field loses focus', async () => {
    await view.email().setValue('thiago@akaer')
    await view.email().trigger('blur')

    expect(view.errors()).toEqual(['Informe um e-mail válido, como nome@empresa.com.'])
  })

  it('should flag a password shorter than 8 characters', async () => {
    await fillAndSubmit(view, { password: '1234567' })

    expect(view.errors()).toEqual(['A senha deve ter pelo menos 8 caracteres.'])
    expect(view.auth.signIn).not.toHaveBeenCalled()
  })

  it('should show and hide the password with the toggle', async () => {
    expect(view.toggle().attributes('aria-label')).toBe('Mostrar senha')

    await view.toggle().trigger('click')

    expect(view.password().attributes('type')).toBe('text')
    expect(view.toggle().attributes('aria-label')).toBe('Ocultar senha')

    await view.toggle().trigger('click')

    expect(view.password().attributes('type')).toBe('password')
    expect(view.auth.signIn).not.toHaveBeenCalled()
  })

  it('should sign in with the trimmed e-mail and the untouched password', async () => {
    await fillAndSubmit(view, { email: '  thiago.serpa@akaer.local  ', password: ' senha-segura ' })
    await flushPromises()

    expect(view.auth.signIn).toHaveBeenCalledWith({
      email: 'thiago.serpa@akaer.local',
      password: ' senha-segura ',
    })
  })

  it('should open the home route after signing in', async () => {
    await fillAndSubmit(view, {})
    await flushPromises()

    expect(push).toHaveBeenCalledWith({ name: 'home' })
  })

  it('should return to a safe redirect path after signing in', async () => {
    route.query = { redirect: '/documents/23?tab=history' }

    await fillAndSubmit(view, {})
    await flushPromises()

    expect(push).toHaveBeenCalledWith('/documents/23?tab=history')
  })

  it.each(['//evil.com', 'https://evil.com', '/\\evil.com', ['/home']])(
    'should ignore the unsafe redirect %s',
    async (redirect) => {
      route.query = { redirect }

      await fillAndSubmit(view, {})
      await flushPromises()

      expect(push).toHaveBeenCalledWith({ name: 'home' })
    },
  )

  it('should show the wrong credentials message and clear the password', async () => {
    view.auth.signIn.mockRejectedValue(apiError(401))

    await fillAndSubmit(view, {})
    await flushPromises()

    expect(view.alert().text()).toBe('E-mail ou senha incorretos.')
    expect(view.alert().attributes('role')).toBe('alert')
    expect(view.password().element.value).toBe('')
    expect(view.email().element.value).toBe('thiago.serpa@akaer.local')
    expect(view.errors()).toEqual([])
    expect(push).not.toHaveBeenCalled()
  })

  it('should show the connection message when the server cannot be reached', async () => {
    view.auth.signIn.mockRejectedValue(apiError(0))

    await fillAndSubmit(view, {})
    await flushPromises()

    expect(view.alert().text()).toBe('Não foi possível conectar ao servidor. Tente novamente.')
    expect(view.password().element.value).toBe('senha-segura')
  })

  it('should ask to review the data when the server rejects the request', async () => {
    view.auth.signIn.mockRejectedValue(apiError(400))

    await fillAndSubmit(view, {})
    await flushPromises()

    expect(view.alert().text()).toBe('Verifique os dados informados.')
  })

  it('should show a generic message for any other failure', async () => {
    view.auth.signIn.mockRejectedValue(apiError(500))

    await fillAndSubmit(view, {})
    await flushPromises()

    expect(view.alert().text()).toBe('Não foi possível entrar agora. Tente novamente em instantes.')
  })

  it('should clear the server message as soon as the user edits a field', async () => {
    view.auth.signIn.mockRejectedValue(apiError(401))
    await fillAndSubmit(view, {})
    await flushPromises()

    await view.password().setValue('outra-senha')

    expect(view.alert().exists()).toBe(false)
  })

  it('should keep the button loading and the fields locked while signing in', async () => {
    const pending = deferred()
    view.auth.signIn.mockReturnValue(pending.promise)

    await fillAndSubmit(view, {})

    expect(view.submitButton().attributes('aria-busy')).toBe('true')
    expect(view.submitButton().attributes('disabled')).toBeDefined()
    expect(view.email().attributes('disabled')).toBeDefined()
    expect(view.password().attributes('disabled')).toBeDefined()
    expect(view.toggle().attributes('disabled')).toBeDefined()
    expect(push).not.toHaveBeenCalled()

    pending.resolve(MANAGER_ACCOUNT)
    await flushPromises()

    expect(view.submitButton().attributes('aria-busy')).toBeUndefined()
    expect(push).toHaveBeenCalledWith({ name: 'home' })
  })

  it('should not sign in twice while a request is pending', async () => {
    view.auth.signIn.mockReturnValue(deferred().promise)

    await fillAndSubmit(view, {})
    await view.wrapper.find('form').trigger('submit')

    expect(view.auth.signIn).toHaveBeenCalledTimes(1)
  })
})
