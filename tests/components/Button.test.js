import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Button from '../../src/components/common/Button.vue'

describe('Button', () => {
  it('should be enabled and show its label by default', () => {
    const wrapper = mount(Button, { slots: { default: 'Publicar' } })
    expect(wrapper.text()).toBe('Publicar')
    expect(wrapper.attributes('disabled')).toBeUndefined()
  })

  it('should be disabled when the disabled prop is set', () => {
    const wrapper = mount(Button, { props: { disabled: true } })
    expect(wrapper.attributes('disabled')).toBeDefined()
  })

  it('should show a spinner, be disabled and announce busy while loading', () => {
    const wrapper = mount(Button, { props: { loading: true }, slots: { default: 'Publicando…' } })
    expect(wrapper.find('.btn-spinner').exists()).toBe(true)
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(wrapper.classes()).toContain('btn-loading')
  })

  it('should emit click with the native event', async () => {
    const wrapper = mount(Button)

    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
