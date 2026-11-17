import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/api/client.js'
import { MANAGER_ACCOUNT } from '../../fixtures/accounts'

vi.mock('@/api/manager.js', () => ({
  fetchAccessGroups: vi.fn(),
  fetchAreaCollaborators: vi.fn(),
  fetchAccessGroupMembers: vi.fn(),
  addAccessGroupMember: vi.fn(),
  removeAccessGroupMember: vi.fn(),
}))

import {
  addAccessGroupMember,
  fetchAccessGroupMembers,
  fetchAccessGroups,
  fetchAreaCollaborators,
  removeAccessGroupMember,
} from '@/api/manager.js'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore.js'
import CollaboratorsView from '@/views/manager/CollaboratorsView.vue'

const STRUCTURES = {
  id: 1,
  name: 'Estruturas',
  description: 'Documentação técnica',
  secrecy_level: 'PUBLIC',
  active: true,
}
const LOADS = {
  id: 2,
  name: 'Análise de Cargas',
  description: 'Memoriais',
  secrecy_level: 'SECRET',
  active: true,
}
const MARINA = { user_id: 7, name: 'Marina Duarte', email: 'marina.duarte@empresa.com' }
const RAFAEL = { user_id: 8, name: 'Rafael Nunes', email: 'rafael.nunes@empresa.com' }
const JULIA = { id: 9, name: 'Júlia Prado', email: 'julia.prado@empresa.com' }

function asAreaUser({ user_id, name, email }) {
  return { id: user_id, name, email }
}

let wrapper

async function mountView() {
  wrapper = mount(CollaboratorsView, {
    global: { stubs: { teleport: true } },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

function rows() {
  return wrapper.findAll('tbody tr')
}

function rowOf(name) {
  return rows().find((row) => row.text().includes(name))
}

function chipsOf(name) {
  return rowOf(name)
    .findAll('.group-chip')
    .map((chip) => chip.text())
}

function buttonNamed(label) {
  return wrapper.findAll('button').find((button) => button.text() === label)
}

function checkboxOf(groupName) {
  return wrapper
    .findAll('.group-option')
    .find((option) => option.text().includes(groupName))
    .find('input')
}

async function openEditorOf(name) {
  await wrapper.find(`button[aria-label="Gerenciar grupos de ${name}"]`).trigger('click')
}

describe('CollaboratorsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    useAuthStore().setSession(MANAGER_ACCOUNT)
    fetchAccessGroups.mockResolvedValue({ results: [STRUCTURES, LOADS] })
    fetchAreaCollaborators.mockResolvedValue({ results: [MARINA, RAFAEL].map(asAreaUser) })
    fetchAccessGroupMembers.mockImplementation(async (groupId) => ({
      results: groupId === 1 ? [MARINA, RAFAEL] : [MARINA],
    }))
  })

  afterEach(() => {
    wrapper.unmount()
  })

  it('should show the skeleton until the data arrives', async () => {
    fetchAccessGroups.mockReturnValue(new Promise(() => {}))

    await mountView()

    expect(wrapper.find('[aria-label="Carregando colaboradores"]').exists()).toBe(true)
  })

  it('should present the area and its collaborators', async () => {
    await mountView()

    expect(wrapper.find('h1').text()).toBe('Colaboradores')
    expect(wrapper.find('.page-subtitle').text()).toBe(
      'Gestão de permissões da área Qualidade e Inspeção.',
    )
    expect(wrapper.find('.collaborators-count').text()).toBe('2 colaboradores')
    expect(chipsOf('Marina Duarte')).toEqual(['Análise de Cargas', 'Estruturas'])
    expect(chipsOf('Rafael Nunes')).toEqual(['Estruturas'])
  })

  it('should narrow the table while searching and explain an empty result', async () => {
    await mountView()
    const search = wrapper.find('input[type="search"]')

    await search.setValue('rafael')
    expect(rows()).toHaveLength(1)
    expect(wrapper.find('.collaborators-count').text()).toBe('1 colaborador')

    await search.setValue('inexistente')
    expect(rows()).toHaveLength(0)
    expect(wrapper.text()).toContain('Nenhum colaborador encontrado')
  })

  it('should explain when the area has no active collaborator', async () => {
    fetchAccessGroups.mockResolvedValue({ results: [] })
    fetchAreaCollaborators.mockResolvedValue({ results: [] })

    await mountView()

    expect(wrapper.text()).toContain('Nenhum colaborador na área')
  })

  it('should list a collaborator without groups and let the manager add one', async () => {
    fetchAreaCollaborators.mockResolvedValue({
      results: [MARINA, RAFAEL].map(asAreaUser).concat(JULIA),
    })
    addAccessGroupMember.mockResolvedValue({ user_id: 9, name: JULIA.name, email: JULIA.email })
    await mountView()
    expect(wrapper.find('.collaborators-count').text()).toBe('3 colaboradores')
    expect(rowOf('Júlia Prado').text()).toContain('Nenhum grupo')

    await openEditorOf('Júlia Prado')
    await checkboxOf('Estruturas').setValue(true)
    await buttonNamed('Salvar Alterações').trigger('click')
    await flushPromises()

    expect(addAccessGroupMember).toHaveBeenCalledWith(1, 9)
    expect(chipsOf('Júlia Prado')).toEqual(['Estruturas'])
  })

  it('should offer a retry when loading fails', async () => {
    fetchAccessGroups.mockRejectedValueOnce(new ApiError('falha', { status: 500 }))
    await mountView()
    expect(wrapper.find('[role="alert"]').text()).toContain(
      'Não foi possível carregar os colaboradores da área.',
    )

    await buttonNamed('Tentar novamente').trigger('click')
    await flushPromises()

    expect(rows()).toHaveLength(2)
  })

  it('should add and remove groups and refresh the row when the calls finish', async () => {
    addAccessGroupMember.mockResolvedValue(RAFAEL)
    removeAccessGroupMember.mockResolvedValue(null)
    await mountView()

    await openEditorOf('Rafael Nunes')
    expect(wrapper.find('[role="dialog"] h2').text()).toBe(
      'Gerenciar Grupos de Acesso - Rafael Nunes',
    )
    expect(checkboxOf('Estruturas').element.checked).toBe(true)

    await checkboxOf('Análise de Cargas').setValue(true)
    await checkboxOf('Estruturas').setValue(false)
    await buttonNamed('Salvar Alterações').trigger('click')
    await flushPromises()

    expect(addAccessGroupMember).toHaveBeenCalledWith(2, 8)
    expect(removeAccessGroupMember).toHaveBeenCalledWith(1, 8)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(chipsOf('Rafael Nunes')).toEqual(['Análise de Cargas'])
    expect(useNotificationStore().items[0].message).toBe(
      'Grupos de acesso de Rafael Nunes atualizados.',
    )
  })

  it('should show progress while saving and keep the row until the API answers', async () => {
    let finishAddition
    addAccessGroupMember.mockReturnValue(
      new Promise((resolve) => {
        finishAddition = resolve
      }),
    )
    await mountView()
    await openEditorOf('Rafael Nunes')
    await checkboxOf('Análise de Cargas').setValue(true)

    await buttonNamed('Salvar Alterações').trigger('click')
    await flushPromises()

    expect(buttonNamed('Salvar Alterações').attributes('aria-busy')).toBe('true')
    expect(chipsOf('Rafael Nunes')).toEqual(['Estruturas'])

    finishAddition(RAFAEL)
    await flushPromises()

    expect(chipsOf('Rafael Nunes')).toEqual(['Análise de Cargas', 'Estruturas'])
  })

  it('should keep the dialog open and allow a retry after a failure', async () => {
    addAccessGroupMember.mockRejectedValueOnce(new ApiError('falha', { status: 500 }))
    addAccessGroupMember.mockResolvedValueOnce(RAFAEL)
    await mountView()
    await openEditorOf('Rafael Nunes')
    await checkboxOf('Análise de Cargas').setValue(true)

    await buttonNamed('Salvar Alterações').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="dialog"] [role="alert"]').text()).toBe(
      'Não foi possível atualizar: Análise de Cargas.',
    )
    expect(chipsOf('Rafael Nunes')).toEqual(['Estruturas'])

    await buttonNamed('Salvar Alterações').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(chipsOf('Rafael Nunes')).toEqual(['Análise de Cargas', 'Estruturas'])
  })

  it('should discard the changes when cancelling', async () => {
    await mountView()
    await openEditorOf('Rafael Nunes')
    await checkboxOf('Análise de Cargas').setValue(true)

    await buttonNamed('Cancelar').trigger('click')

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(addAccessGroupMember).not.toHaveBeenCalled()
    expect(chipsOf('Rafael Nunes')).toEqual(['Estruturas'])
  })
})
