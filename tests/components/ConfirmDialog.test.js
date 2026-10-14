import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmDialog from '../../src/components/common/ConfirmDialog.vue'

function mountDialog(props = {}, options = {}) {
  return mount(ConfirmDialog, {
    props: { title: 'Excluir?', message: 'Não pode ser desfeito.', ...props },
    attachTo: document.body,
    ...options,
  })
}

describe('ConfirmDialog', () => {
  it('should render the title, the message and the default labels', () => {
    const wrapper = mountDialog()

    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Excluir?')
    expect(wrapper.text()).toContain('Não pode ser desfeito.')
    expect(wrapper.findAll('button').map((b) => b.text())).toEqual(['Cancelar', 'Confirmar'])
    wrapper.unmount()
  })

  it('should use custom labels and the requested variant', () => {
    const wrapper = mountDialog({
      confirmLabel: 'Apagar',
      cancelLabel: 'Voltar',
      variant: 'danger',
    })

    const buttons = wrapper.findAll('button')
    expect(buttons.map((b) => b.text())).toEqual(['Voltar', 'Apagar'])
    expect(buttons[1].classes()).toContain('btn-danger')
    wrapper.unmount()
  })

  it('should emit confirm and cancel from the buttons', async () => {
    const wrapper = mountDialog()
    const [cancel, confirm] = wrapper.findAll('button')

    await confirm.trigger('click')
    await cancel.trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    wrapper.unmount()
  })

  it('should cancel on Escape and on overlay click', async () => {
    const wrapper = mountDialog()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.find('.overlay').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(2)
    wrapper.unmount()
  })

  it('should not cancel from inside the dialog box', async () => {
    const wrapper = mountDialog()

    await wrapper.find('.dialog').trigger('click')

    expect(wrapper.emitted('cancel')).toBeUndefined()
    wrapper.unmount()
  })

  it('should block dismissing and disable cancel while loading', async () => {
    const wrapper = mountDialog({ loading: true })

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.find('.overlay').trigger('click')

    expect(wrapper.emitted('cancel')).toBeUndefined()
    expect(wrapper.findAll('button')[0].attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('button')[1].attributes('aria-busy')).toBe('true')
    wrapper.unmount()
  })

  it('should stop listening to Escape after unmount', () => {
    const wrapper = mountDialog()
    wrapper.unmount()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(wrapper.emitted('cancel')).toBeUndefined()
  })

  it('should render slot content', () => {
    const wrapper = mountDialog({}, { slots: { default: '<p class="extra">Extra</p>' } })

    expect(wrapper.find('.extra').exists()).toBe(true)
    wrapper.unmount()
  })
})
