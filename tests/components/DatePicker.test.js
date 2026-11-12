import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DatePicker from '@/components/common/DatePicker.vue'

describe('DatePicker', () => {
  it('should show the ISO value as dd/mm/yyyy', () => {
    const wrapper = mount(DatePicker, { props: { modelValue: '2026-03-09' } })

    expect(wrapper.find('input[type="text"]').element.value).toBe('09/03/2026')
    expect(wrapper.find('input[type="date"]').element.value).toBe('2026-03-09')
  })

  it('should mask typed digits and emit the ISO date once complete', async () => {
    const wrapper = mount(DatePicker)
    const text = wrapper.find('input[type="text"]')

    await text.setValue('09032026')

    expect(text.element.value).toBe('09/03/2026')
    expect(wrapper.emitted('update:modelValue').at(-1)).toEqual(['2026-03-09'])
  })

  it('should emit an empty value for partial or impossible dates', async () => {
    const wrapper = mount(DatePicker)
    const text = wrapper.find('input[type="text"]')

    await text.setValue('0903')
    expect(wrapper.emitted('update:modelValue').at(-1)).toEqual([''])

    await text.setValue('31022026')
    expect(wrapper.emitted('update:modelValue').at(-1)).toEqual([''])
  })

  it('should keep the half-typed text when the parent echoes back an empty value', async () => {
    const wrapper = mount(DatePicker, { props: { modelValue: '' } })
    const text = wrapper.find('input[type="text"]')

    await text.setValue('0903')
    await wrapper.setProps({ modelValue: '' })

    expect(text.element.value).toBe('09/03')
  })

  it('should follow the value picked in the native calendar', async () => {
    const wrapper = mount(DatePicker, { props: { name: 'when' } })

    await wrapper.find('input[name="when"]').setValue('2026-12-25')

    expect(wrapper.find('input[type="text"]').element.value).toBe('25/12/2026')
    expect(wrapper.emitted('update:modelValue').at(-1)).toEqual(['2026-12-25'])
  })

  it('should clear the text when the parent resets the value', async () => {
    const wrapper = mount(DatePicker, { props: { modelValue: '2026-03-09' } })

    await wrapper.setProps({ modelValue: '' })

    expect(wrapper.find('input[type="text"]').element.value).toBe('')
  })

  it('should block typing when disabled', () => {
    const wrapper = mount(DatePicker, { props: { disabled: true, invalid: true } })

    expect(wrapper.find('input[type="text"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('input[type="text"]').attributes('aria-invalid')).toBe('true')
  })
})
