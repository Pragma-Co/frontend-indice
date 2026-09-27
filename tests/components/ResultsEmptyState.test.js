import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ResultsEmptyState from '@/views/document/components/ResultsEmptyState.vue'

describe('ResultsEmptyState', () => {
  it('should suggest removing filters and offer to clear them when filters are active', async () => {
    const wrapper = mount(ResultsEmptyState, { props: { hasFilters: true } })

    expect(wrapper.text()).toContain('Nenhum documento encontrado')
    expect(wrapper.text()).toContain('Tente remover algum filtro')
    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  it('should not offer to clear filters when none is active', () => {
    const wrapper = mount(ResultsEmptyState)

    expect(wrapper.text()).toContain('Ainda não há documentos para exibir.')
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
