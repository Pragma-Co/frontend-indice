import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ActionMenu from '../../src/components/common/ActionMenu.vue'

const ITEMS = [
  { id: 'read', label: 'Ler termo' },
  { id: 'change', label: 'Alterar aceite', danger: true },
]

const mounted = []

function mountMenu(props = {}) {
  const wrapper = mount(ActionMenu, {
    props: { items: ITEMS, label: 'Ações para Termo', ...props },
    attachTo: document.body,
    global: { stubs: { teleport: true } },
  })
  mounted.push(wrapper)
  return wrapper
}

describe('ActionMenu', () => {
  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  it('should start closed with an accessible trigger', () => {
    const wrapper = mountMenu()

    const trigger = wrapper.find('.action-menu-trigger')
    expect(trigger.attributes('aria-haspopup')).toBe('menu')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(trigger.attributes('aria-label')).toBe('Ações para Termo')
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })

  it('should open the options and focus the first one', async () => {
    const wrapper = mountMenu()

    await wrapper.find('.action-menu-trigger').trigger('click')

    const items = wrapper.findAll('[role="menuitem"]')
    expect(wrapper.find('.action-menu-trigger').attributes('aria-expanded')).toBe('true')
    expect(items.map((item) => item.text())).toEqual(['Ler termo', 'Alterar aceite'])
    expect(items[1].classes()).toContain('danger')
    expect(document.activeElement).toBe(items[0].element)
  })

  it('should emit the chosen option and close', async () => {
    const wrapper = mountMenu()
    await wrapper.find('.action-menu-trigger').trigger('click')

    await wrapper.findAll('[role="menuitem"]')[1].trigger('click')

    expect(wrapper.emitted('select')).toEqual([['change']])
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })

  it('should move between the options with the arrow keys', async () => {
    const wrapper = mountMenu()
    await wrapper.find('.action-menu-trigger').trigger('click')
    const menu = wrapper.find('[role="menu"]')
    const items = wrapper.findAll('[role="menuitem"]')

    await menu.trigger('keydown', { key: 'ArrowDown' })
    const afterDown = document.activeElement
    await menu.trigger('keydown', { key: 'ArrowDown' })

    expect(afterDown).toBe(items[1].element)
    expect(document.activeElement).toBe(items[0].element)
  })

  it('should close on Escape and give the focus back to the trigger', async () => {
    const wrapper = mountMenu()
    await wrapper.find('.action-menu-trigger').trigger('click')

    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'Escape' })

    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.find('.action-menu-trigger').element)
  })

  it('should close when clicking outside', async () => {
    const wrapper = mountMenu()
    await wrapper.find('.action-menu-trigger').trigger('click')

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })

  it('should not open while disabled', async () => {
    const wrapper = mountMenu({ disabled: true })

    await wrapper.find('.action-menu-trigger').trigger('click')

    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })
})
