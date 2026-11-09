import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ManageAccessGroupsDialog from '@/views/manager/components/ManageAccessGroupsDialog.vue'

const GROUPS = [
  {
    id: 1,
    name: 'Estruturas',
    description: 'Documentação técnica',
    secrecyLevel: 'PUBLIC',
    active: true,
  },
  { id: 2, name: 'Análise', description: '', secrecyLevel: 'SECRET', active: true },
  { id: 3, name: 'Legado', description: 'Antigo', secrecyLevel: 'CONFIDENTIAL', active: false },
]

let wrapper

function mountDialog(props = {}) {
  wrapper = mount(ManageAccessGroupsDialog, {
    props: {
      collaborator: { id: 7, name: 'Marina Duarte', groupIds: [1] },
      groups: GROUPS,
      areaName: 'Engenharia Mecânica',
      ...props,
    },
    global: { stubs: { teleport: true } },
    attachTo: document.body,
  })
  return wrapper
}

function checkboxes() {
  return wrapper.findAll('input[type="checkbox"]')
}

function saveButton() {
  return wrapper.findAll('button').find((button) => button.text() === 'Salvar Alterações')
}

describe('ManageAccessGroupsDialog', () => {
  afterEach(() => {
    wrapper.unmount()
  })

  it('should present the collaborator, the area and the current selection', () => {
    mountDialog()

    expect(wrapper.find('h2').text()).toBe('Gerenciar Grupos de Acesso - Marina Duarte')
    expect(wrapper.text()).toContain('Área: Engenharia Mecânica')
    expect(checkboxes().map((box) => box.element.checked)).toEqual([true, false, false])
    expect(wrapper.find('.groups-counter').text()).toBe('1 selecionado')
  })

  it('should describe a group without description by its secrecy level', () => {
    mountDialog()

    const details = wrapper.findAll('.group-option-detail').map((item) => item.text())

    expect(details).toEqual(['Documentação técnica', 'Nível de sigilo: Sigiloso', 'Antigo'])
  })

  it('should enable saving only when the selection changes', async () => {
    mountDialog()
    expect(saveButton().attributes('disabled')).toBeDefined()

    await checkboxes()[1].setValue(true)
    expect(saveButton().attributes('disabled')).toBeUndefined()
    expect(wrapper.find('.groups-counter').text()).toBe('2 selecionados')

    await checkboxes()[1].setValue(false)
    expect(saveButton().attributes('disabled')).toBeDefined()
  })

  it('should emit the complete selection when saving', async () => {
    mountDialog()

    await checkboxes()[0].setValue(false)
    await checkboxes()[1].setValue(true)
    await saveButton().trigger('click')

    expect(wrapper.emitted('save')).toEqual([[[2]]])
  })

  it('should block adding to an inactive group', () => {
    mountDialog()

    expect(checkboxes()[2].attributes('disabled')).toBeDefined()
    expect(wrapper.find('.group-option-inactive').text()).toBe('Inativo')
  })

  it('should still allow removing from an inactive group', () => {
    mountDialog({ collaborator: { id: 7, name: 'Marina Duarte', groupIds: [3] } })

    expect(checkboxes()[2].attributes('disabled')).toBeUndefined()
  })

  it('should block the controls while saving', () => {
    mountDialog({ saving: true })

    expect(checkboxes().every((box) => box.attributes('disabled') !== undefined)).toBe(true)
    expect(saveButton().attributes('aria-busy')).toBe('true')
  })

  it('should show the save error', () => {
    mountDialog({ error: 'Não foi possível atualizar: Análise.' })

    expect(wrapper.find('[role="alert"]').text()).toBe('Não foi possível atualizar: Análise.')
  })

  it('should explain when the area has no groups', () => {
    mountDialog({ groups: [], collaborator: { id: 7, name: 'Marina Duarte', groupIds: [] } })

    expect(wrapper.text()).toContain('Nenhum grupo de acesso criado nesta área.')
  })
})
