import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import Dropdown from '../../src/components/common/Dropdown.vue'

const mounted = []

const TestWrapper = defineComponent({
  components: { Dropdown },
  template: `
    <Dropdown label="Abrir dropdown" ref="dropdownRef">
      <template #trigger="{ open, toggle }">
        <button @click="toggle" :aria-expanded="open" class="test-trigger">Trigger</button>
      </template>
      <template #default="{ close }">
        <button @click="close" class="test-close">Fechar</button>
        <p>Conteúdo</p>
      </template>
    </Dropdown>
  `,
})

function mountDropdown() {
  const wrapper = mount(TestWrapper, {
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

describe('Dropdown', () => {
  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  it('should start closed', () => {
    const wrapper = mountDropdown()

    expect(wrapper.find('.dropdown-panel').exists()).toBe(false)
  })

  it('should open when trigger is clicked', async () => {
    const wrapper = mountDropdown()

    await wrapper.find('.test-trigger').trigger('click')

    expect(wrapper.find('.dropdown-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('Conteúdo')
  })

  it('should close when clicking outside', async () => {
    const wrapper = mountDropdown()

    await wrapper.find('.test-trigger').trigger('click')
    expect(wrapper.find('.dropdown-panel').exists()).toBe(true)

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.dropdown-panel').exists()).toBe(false)
  })

  it('should close when pressing Escape', async () => {
    const wrapper = mountDropdown()

    await wrapper.find('.test-trigger').trigger('click')
    expect(wrapper.find('.dropdown-panel').exists()).toBe(true)

    await wrapper.find('.dropdown-panel').trigger('keydown', { key: 'Escape' })

    expect(wrapper.find('.dropdown-panel').exists()).toBe(false)
  })

  it('should emit open event when opening', async () => {
    const wrapper = mountDropdown()

    await wrapper.find('.test-trigger').trigger('click')

    expect(wrapper.findComponent(Dropdown).emitted('open')).toHaveLength(1)
  })

  it('should emit close event when closing', async () => {
    const wrapper = mountDropdown()

    await wrapper.find('.test-trigger').trigger('click')
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(Dropdown).emitted('close')).toHaveLength(1)
  })

  it('should respect the width prop', () => {
    const wrapper = mountDropdown()

    expect(wrapper.findComponent(Dropdown).props('width')).toBe('22rem')
  })

  it('should pass the correct label to the aria', () => {
    const wrapper = mountDropdown()

    expect(wrapper.findComponent(Dropdown).props('label')).toBe('Abrir dropdown')
  })

  it('should expose close method via ref', async () => {
    const wrapper = mountDropdown()

    await wrapper.find('.test-trigger').trigger('click')
    expect(wrapper.find('.dropdown-panel').exists()).toBe(true)

    await wrapper.vm.$nextTick()
    // Aciona o método close através do button dentro do painel
    const dropdownComponent = wrapper.findComponent(Dropdown)
    if (dropdownComponent.vm.close) {
      dropdownComponent.vm.close()
    }
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.dropdown-panel').exists()).toBe(false)
  })

  it('should not close when clicking inside the panel', async () => {
    const wrapper = mountDropdown()

    await wrapper.find('.test-trigger').trigger('click')
    const panel = wrapper.find('.dropdown-panel')

    // Simular clique dentro do painel
    const event = new MouseEvent('mousedown', { bubbles: true })
    panel.element.dispatchEvent(event)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.dropdown-panel').exists()).toBe(true)
  })

  it('should toggle on trigger click', async () => {
    const wrapper = mountDropdown()
    const trigger = wrapper.find('.test-trigger')

    await trigger.trigger('click')
    expect(wrapper.find('.dropdown-panel').exists()).toBe(true)

    await trigger.trigger('click')
    expect(wrapper.find('.dropdown-panel').exists()).toBe(false)
  })
})
