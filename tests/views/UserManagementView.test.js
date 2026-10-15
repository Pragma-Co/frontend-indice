import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import UserManagementView from '../../src/views/user-management/UserManagementView.vue'
import { ApiError } from '../../src/api/client'
import {
  fetchCurrentUser,
  fetchLegalAcceptances,
  requestAccountDeletion,
  updateCurrentUser,
} from '../../src/api/users'
import { PROFILES, useAuthStore } from '../../src/stores/authStore'
import { useNotificationStore } from '../../src/stores/notificationStore'

const replace = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ replace }) }))
vi.mock('../../src/api/users', () => ({
  fetchCurrentUser: vi.fn(),
  updateCurrentUser: vi.fn(),
  requestAccountDeletion: vi.fn(),
  fetchLegalAcceptances: vi.fn(),
}))

const USER = {
  id: 10,
  name: 'Thiago Serpa',
  email: 'thiago.serpa@akaer.local',
  role: 'AUDITOR',
  area: { id: 5, acronym: 'QUA', name: 'Qualidade e Inspeção' },
}

async function mountView() {
  const wrapper = mount(UserManagementView, { attachTo: document.body })
  await flushPromises()
  return wrapper
}

function buttonByText(wrapper, text) {
  return wrapper.findAll('button').find((button) => button.text().includes(text))
}

describe('UserManagementView', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    useAuthStore().login(PROFILES.MANAGER)
    fetchCurrentUser.mockResolvedValue(USER)
    fetchLegalAcceptances.mockResolvedValue({ count: 0, results: [] })
  })

  it('should show the terms history loaded from the API instead of fixed records', async () => {
    fetchLegalAcceptances.mockResolvedValue({
      count: 1,
      results: [
        {
          id: 4,
          accepted_at: '2026-10-05T14:32:00',
          revoked_at: null,
          document: { slug: 'termo-tratamento-dados', title: 'Termo de Adesão' },
          version: { id: 1, version: 1 },
          consents: [{ clause_id: 1, is_required: true, accepted: true }],
        },
      ],
    })

    const wrapper = await mountView()

    const history = wrapper.find('.terms-history')
    expect(fetchLegalAcceptances).toHaveBeenCalledTimes(1)
    expect(history.find('h2').text()).toBe('Histórico de Termos e Consentimentos')
    expect(history.findAll('tbody tr')).toHaveLength(1)
    expect(history.text()).toContain('Termo de Adesão')
    expect(history.text()).not.toContain('Termos de Uso e Política de Privacidade')
  })

  it('should fill the form with the user returned by the API', async () => {
    const wrapper = await mountView()

    expect(wrapper.find('#first-name').element.value).toBe('Thiago')
    expect(wrapper.find('#last-name').element.value).toBe('Serpa')
    expect(wrapper.find('#email').element.value).toBe('thiago.serpa@akaer.local')
    expect(wrapper.find('#role').element.value).toBe('AUDITOR')
    expect(wrapper.find('#department').element.value).toBe('Qualidade e Inspeção')
    wrapper.unmount()
  })

  it('should show an error when the user cannot be loaded', async () => {
    fetchCurrentUser.mockRejectedValue(new ApiError('Sem permissão.', { status: 401 }))

    const wrapper = await mountView()

    expect(wrapper.text()).toContain('Sem permissão.')
    expect(wrapper.find('form').exists()).toBe(false)
    wrapper.unmount()
  })

  it('should only enable save and cancel after a change, and restore on cancel', async () => {
    const wrapper = await mountView()
    const save = buttonByText(wrapper, 'Salvar Alterações')
    expect(save.attributes('disabled')).toBeDefined()

    await wrapper.find('#first-name').setValue('Tiago')
    expect(save.attributes('disabled')).toBeUndefined()

    await buttonByText(wrapper, 'Cancelar').trigger('click')
    expect(wrapper.find('#first-name').element.value).toBe('Thiago')
    expect(save.attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('should save the joined name, update the navbar user and show a success toast', async () => {
    updateCurrentUser.mockResolvedValue({ ...USER, name: 'Tiago Serpa' })
    const wrapper = await mountView()

    await wrapper.find('#first-name').setValue('Tiago')
    await buttonByText(wrapper, 'Salvar Alterações').trigger('click')
    await flushPromises()

    expect(updateCurrentUser).toHaveBeenCalledWith({
      name: 'Tiago Serpa',
      email: 'thiago.serpa@akaer.local',
    })
    expect(useAuthStore().currentUser.name).toBe('Tiago Serpa')
    expect(useAuthStore().initials).toBe('TS')
    expect(useNotificationStore().items.map((i) => i.message)).toContain(
      'Dados atualizados com sucesso.',
    )
    expect(wrapper.text()).toContain('Última atualização')
    wrapper.unmount()
  })

  it('should show validation errors from the API on the fields', async () => {
    updateCurrentUser.mockRejectedValue(
      new ApiError('Dados inválidos.', {
        status: 400,
        details: { errors: { email: 'Enter a valid email address.' } },
      }),
    )
    const wrapper = await mountView()

    await wrapper.find('#email').setValue('invalido')
    await buttonByText(wrapper, 'Salvar Alterações').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Enter a valid email address.')
    expect(useNotificationStore().items).toHaveLength(0)
    wrapper.unmount()
  })

  it('should show an error toast when saving fails without field errors', async () => {
    updateCurrentUser.mockRejectedValue(new ApiError('Erro interno do servidor.', { status: 500 }))
    const wrapper = await mountView()

    await wrapper.find('#first-name').setValue('Tiago')
    await buttonByText(wrapper, 'Salvar Alterações').trigger('click')
    await flushPromises()

    const [toast] = useNotificationStore().items
    expect(toast).toMatchObject({ type: 'error', message: 'Erro interno do servidor.' })
    wrapper.unmount()
  })

  it('should ask for confirmation before deleting and do nothing on cancel', async () => {
    const wrapper = await mountView()
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)

    await buttonByText(wrapper, 'Solicitar Exclusão da Conta').trigger('click')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(true)

    await wrapper.find('[role="alertdialog"]').findAll('button')[0].trigger('click')

    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(requestAccountDeletion).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('should delete the account, sign out, go to login and show a success toast', async () => {
    requestAccountDeletion.mockResolvedValue({})
    const wrapper = await mountView()

    await buttonByText(wrapper, 'Solicitar Exclusão da Conta').trigger('click')
    await wrapper.find('[role="alertdialog"]').findAll('button')[1].trigger('click')
    await flushPromises()

    expect(requestAccountDeletion).toHaveBeenCalledOnce()
    expect(useAuthStore().isAuthenticated).toBe(false)
    expect(replace).toHaveBeenCalledWith({ name: 'login' })
    expect(useNotificationStore().items.map((i) => i.message)).toContain(
      'Solicitação de exclusão da conta enviada com sucesso.',
    )
    wrapper.unmount()
  })

  it('should clear every stored authentication data after the deletion', async () => {
    requestAccountDeletion.mockResolvedValue({})
    localStorage.setItem('indice.devUser', '{"id":10,"name":"Thiago Serpa"}')
    document.cookie = 'csrftoken=token-before-deletion; path=/'
    const wrapper = await mountView()

    await buttonByText(wrapper, 'Solicitar Exclusão da Conta').trigger('click')
    await wrapper.find('[role="alertdialog"]').findAll('button')[1].trigger('click')
    await flushPromises()

    expect(localStorage.getItem('indice.profile')).toBeNull()
    expect(localStorage.getItem('indice.devUser')).toBeNull()
    expect(document.cookie).not.toContain('csrftoken')
    expect(useAuthStore().currentUser).toBeNull()
    wrapper.unmount()
  })

  it('should keep the session and show an error toast when deletion fails', async () => {
    requestAccountDeletion.mockRejectedValue(new ApiError('Erro interno.', { status: 500 }))
    const wrapper = await mountView()

    await buttonByText(wrapper, 'Solicitar Exclusão da Conta').trigger('click')
    await wrapper.find('[role="alertdialog"]').findAll('button')[1].trigger('click')
    await flushPromises()

    expect(useAuthStore().isAuthenticated).toBe(true)
    expect(replace).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(useNotificationStore().items[0]).toMatchObject({ type: 'error' })
    wrapper.unmount()
  })
})
