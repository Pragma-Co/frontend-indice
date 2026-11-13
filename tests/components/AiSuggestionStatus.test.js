import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AiSuggestionStatus from '../../src/components/document-upload/AiSuggestionStatus.vue'

function stepStates(wrapper) {
  return wrapper
    .findAll('.ai-status__step')
    .map((step) => [...step.classes()].find((name) => name.startsWith('ai-status__step--')))
}

describe('AiSuggestionStatus', () => {
  it('should show the classification as the step in progress while loading', () => {
    const wrapper = mount(AiSuggestionStatus, { props: { status: 'loading' } })

    expect(wrapper.text()).toContain('Analisando o documento…')
    expect(stepStates(wrapper)).toEqual(['ai-status__step--active', 'ai-status__step--pending'])
  })

  it('should mark the classification as done while the text is being written', () => {
    const wrapper = mount(AiSuggestionStatus, { props: { status: 'generating' } })

    expect(wrapper.text()).toContain('Escrevendo título e descrição…')
    expect(stepStates(wrapper)).toEqual(['ai-status__step--done', 'ai-status__step--active'])
  })

  it('should drop the steps and the manual option once the suggestions are ready', () => {
    const wrapper = mount(AiSuggestionStatus, { props: { status: 'success' } })

    expect(wrapper.text()).toContain('Sugestões prontas')
    expect(wrapper.find('.ai-status__steps').exists()).toBe(false)
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('should emit skip when the user chooses to fill the fields manually', async () => {
    const wrapper = mount(AiSuggestionStatus, { props: { status: 'generating' } })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('skip')).toHaveLength(1)
  })

  it('should announce progress politely to assistive technology', () => {
    const wrapper = mount(AiSuggestionStatus, { props: { status: 'loading' } })

    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.attributes('aria-live')).toBe('polite')
  })
})
