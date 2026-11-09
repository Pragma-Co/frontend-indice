import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AccessGroupDialogShell from '@/views/manager/components/AccessGroupDialogShell.vue'

let wrapper

function mountShell(props = {}) {
  wrapper = mount(AccessGroupDialogShell, {
    props: { title: 'Criar Grupo', subtitle: 'Área: Estruturas', ...props },
    slots: {
      default: '<input id="first-field" />',
      footer: '<button id="last-button" type="button">Salvar</button>',
    },
    global: { stubs: { teleport: true } },
    attachTo: document.body,
  })
  return wrapper
}

describe('AccessGroupDialogShell', () => {
  afterEach(() => {
    wrapper?.unmount()
  })

  it('should expose an accessible modal labelled by its title', () => {
    const dialog = mountShell().find('[role="dialog"]')

    expect(dialog.attributes('aria-modal')).toBe('true')
    const title = wrapper.find('h2')
    expect(title.text()).toBe('Criar Grupo')
    expect(dialog.attributes('aria-labelledby')).toBe(title.attributes('id'))
  })

  it('should close with Escape, the close button and a press on the backdrop', async () => {
    mountShell()

    await wrapper.find('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    await wrapper.find('button[aria-label="Fechar"]').trigger('click')
    await wrapper.find('.group-dialog-overlay').trigger('mousedown')

    expect(wrapper.emitted('close')).toHaveLength(3)
  })

  it('should not close while busy', async () => {
    mountShell({ busy: true })

    await wrapper.find('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    await wrapper.find('.group-dialog-overlay').trigger('mousedown')

    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('should lock the page scroll while open and restore it afterwards', () => {
    mountShell()
    expect(document.body.style.overflow).toBe('hidden')

    wrapper.unmount()
    wrapper = null

    expect(document.body.style.overflow).toBe('')
  })

  it('should give the focus back to the element that opened it', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    mountShell()
    expect(document.activeElement).toBe(wrapper.find('[role="dialog"]').element)

    wrapper.unmount()
    wrapper = null

    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  it('should keep the keyboard focus inside the dialog', async () => {
    mountShell()
    const dialog = wrapper.find('[role="dialog"]')
    const last = wrapper.find('#last-button').element
    const first = wrapper.find('button[aria-label="Fechar"]').element

    last.focus()
    await dialog.trigger('keydown', { key: 'Tab' })
    expect(document.activeElement).toBe(first)

    await dialog.trigger('keydown', { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })
})
