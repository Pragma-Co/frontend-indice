import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CreateAccessGroupDialog from '@/views/manager/components/CreateAccessGroupDialog.vue'

let wrapper

function mountDialog(props = {}) {
  wrapper = mount(CreateAccessGroupDialog, {
    props: { groups: [], areaName: 'Estruturas', ...props },
    global: { stubs: { teleport: true } },
    attachTo: document.body,
  })
  return wrapper
}

function levelOptions() {
  return wrapper.findAll('#access-group-level option')
}

function submitButton() {
  return wrapper.findAll('button').find((button) => button.text() === 'Criar Grupo')
}

describe('CreateAccessGroupDialog', () => {
  afterEach(() => {
    wrapper.unmount()
  })

  it('should require a name before submitting', async () => {
    mountDialog()

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('#access-group-name-error').text()).toBe('Informe o nome do grupo.')
  })

  it('should clear the name error while typing', async () => {
    mountDialog()
    await wrapper.find('form').trigger('submit')

    await wrapper.find('#access-group-name').setValue('Fadiga')

    expect(wrapper.find('#access-group-name-error').exists()).toBe(false)
    expect(wrapper.emitted('edit')).toHaveLength(1)
  })

  it('should submit the trimmed values', async () => {
    mountDialog()

    await wrapper.find('#access-group-name').setValue('  Fadiga  ')
    await wrapper.find('#access-group-description').setValue(' Estudos ')
    await wrapper.find('#access-group-level').setValue('SECRET')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toEqual([
      [{ name: 'Fadiga', description: 'Estudos', secrecyLevel: 'SECRET' }],
    ])
  })

  it('should disable the levels that already have a group and preselect a free one', () => {
    mountDialog({ groups: [{ id: 1, secrecyLevel: 'PUBLIC' }] })

    expect(levelOptions()[0].attributes('disabled')).toBeDefined()
    expect(levelOptions()[0].text()).toBe('Público (já possui grupo)')
    expect(wrapper.find('#access-group-level').element.value).toBe('CONFIDENTIAL')
  })

  it('should explain and block creation when every level has a group', async () => {
    mountDialog({
      groups: [
        { id: 1, secrecyLevel: 'PUBLIC' },
        { id: 2, secrecyLevel: 'CONFIDENTIAL' },
        { id: 3, secrecyLevel: 'SECRET' },
      ],
    })

    expect(wrapper.text()).toContain('Todos os níveis de sigilo já possuem um grupo nesta área.')
    expect(submitButton().attributes('disabled')).toBeDefined()

    await wrapper.find('#access-group-name').setValue('Fadiga')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('should show the errors returned by the server', () => {
    mountDialog({
      serverErrors: { name: 'Já existe um grupo.', general: 'Falha inesperada.' },
    })

    expect(wrapper.find('#access-group-name-error').text()).toBe('Já existe um grupo.')
    expect(wrapper.find('#access-group-name').attributes('aria-invalid')).toBe('true')
    expect(wrapper.find('.group-form-error').text()).toBe('Falha inesperada.')
  })

  it('should tie the submit button to the form and block fields while submitting', () => {
    mountDialog({ submitting: true })

    expect(submitButton().attributes('form')).toBe(wrapper.find('form').attributes('id'))
    expect(submitButton().attributes('aria-busy')).toBe('true')
    expect(wrapper.find('#access-group-name').attributes('disabled')).toBeDefined()
  })
})
