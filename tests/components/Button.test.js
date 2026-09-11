import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Button from '../../src/components/common/Button.vue'

describe('Button', () => {
  it('should be enabled and show its label by default', () => {
    // When
    const wrapper = mount(Button, { slots: { default: 'Publicar' } })
    // Then
    expect(wrapper.text()).toBe('Publicar')
    expect(wrapper.attributes('disabled')).toBeUndefined()
  })

  it('should be disabled when the disabled prop is set', () => {
    // When
    const wrapper = mount(Button, { props: { disabled: true } })
    // Then
    expect(wrapper.attributes('disabled')).toBeDefined()
  })

  it('should show a spinner, be disabled and announce busy while loading', () => {
    // When
    const wrapper = mount(Button, { props: { loading: true }, slots: { default: 'Publicando…' } })
    // Then
    expect(wrapper.find('.btn-spinner').exists()).toBe(true)
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(wrapper.classes()).toContain('btn-loading')
  })

  it('should emit click with the native event', async () => {
    // Given
    const wrapper = mount(Button)
    // When
    await wrapper.trigger('click')
    // Then
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
