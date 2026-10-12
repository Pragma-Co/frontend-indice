import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import OverflowPill from '../../src/views/manager/components/OverflowPill.vue'

function mountPill(scrollWidth, clientWidth, { scrollHeight = 20, clientHeight = 20 } = {}) {
  const wrapper = mount(OverflowPill, { props: { text: 'Pesos e Balanceamento' } })
  Object.defineProperty(wrapper.element, 'scrollWidth', { value: scrollWidth })
  Object.defineProperty(wrapper.element, 'clientWidth', { value: clientWidth })
  Object.defineProperty(wrapper.element, 'scrollHeight', { value: scrollHeight })
  Object.defineProperty(wrapper.element, 'clientHeight', { value: clientHeight })
  return wrapper
}

describe('OverflowPill', () => {
  it('should show its text without a tooltip before the pointer reaches it', () => {
    const wrapper = mountPill(180, 110)

    expect(wrapper.text()).toBe('Pesos e Balanceamento')
    expect(wrapper.attributes('title')).toBeUndefined()
  })

  it('should offer the full text as a tooltip when it does not fit the column', async () => {
    const wrapper = mountPill(180, 110)

    await wrapper.trigger('mouseenter')

    expect(wrapper.attributes('title')).toBe('Pesos e Balanceamento')
  })

  it('should not offer a tooltip when the text fits', async () => {
    const wrapper = mountPill(110, 110)

    await wrapper.trigger('mouseenter')

    expect(wrapper.attributes('title')).toBeUndefined()
  })

  it('should offer the tooltip when the text needs more than the two lines shown', async () => {
    const wrapper = mountPill(110, 110, { scrollHeight: 60, clientHeight: 40 })

    await wrapper.trigger('mouseenter')

    expect(wrapper.attributes('title')).toBe('Pesos e Balanceamento')
  })
})
