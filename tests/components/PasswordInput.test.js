import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PasswordInput from '../../src/components/common/PasswordInput.vue'

function mountInput(props = {}, attrs = {}) {
  return mount(PasswordInput, { props: { modelValue: '', ...props }, attrs })
}

describe('PasswordInput', () => {
  it('should mask the password by default', () => {
    const wrapper = mountInput()

    expect(wrapper.find('input').attributes('type')).toBe('password')
    expect(wrapper.find('button').attributes('aria-label')).toBe('Mostrar senha')
    expect(wrapper.find('button').attributes('aria-pressed')).toBe('false')
  })

  it('should toggle between the masked and the visible password', async () => {
    const wrapper = mountInput()
    const toggle = wrapper.find('button')

    await toggle.trigger('click')

    expect(wrapper.find('input').attributes('type')).toBe('text')
    expect(toggle.attributes('aria-label')).toBe('Ocultar senha')
    expect(toggle.attributes('aria-pressed')).toBe('true')

    await toggle.trigger('click')

    expect(wrapper.find('input').attributes('type')).toBe('password')
    expect(toggle.attributes('aria-label')).toBe('Mostrar senha')
  })

  it('should never submit the form when toggling', () => {
    const wrapper = mountInput()

    expect(wrapper.find('button').attributes('type')).toBe('button')
  })

  it('should forward the attributes to the input and point the toggle at it', () => {
    const wrapper = mountInput(
      {},
      { id: 'login-password', autocomplete: 'current-password', 'aria-invalid': 'true' },
    )
    const input = wrapper.find('input')

    expect(input.attributes('id')).toBe('login-password')
    expect(input.attributes('autocomplete')).toBe('current-password')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(wrapper.find('.password-input').attributes('id')).toBeUndefined()
    expect(wrapper.find('button').attributes('aria-controls')).toBe('login-password')
  })

  it('should emit the typed value', async () => {
    const wrapper = mountInput()

    await wrapper.find('input').setValue('senha-segura')

    expect(wrapper.emitted('update:modelValue')).toEqual([['senha-segura']])
  })

  it('should show the bound value', () => {
    const wrapper = mountInput({ modelValue: 'abc12345' })

    expect(wrapper.find('input').element.value).toBe('abc12345')
  })

  it('should disable the toggle together with the input', () => {
    const wrapper = mountInput({}, { disabled: true })

    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })
})
