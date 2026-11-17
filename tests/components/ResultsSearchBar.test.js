import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ResultsSearchBar from '@/views/document/components/ResultsSearchBar.vue'
import * as searchHistoryApi from '@/api/searchHistory.js'

vi.mock('@/api/searchHistory.js', () => ({
  fetchSearchHistory: vi.fn(),
  clearSearchHistory: vi.fn(),
  removeSearchHistoryTerm: vi.fn(),
}))

const HISTORY = ['Normas de estruturas metálicas', 'MIL-C-5541', 'Relatório de cargas']

describe('ResultsSearchBar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should start with the term that came from the URL', () => {
    const wrapper = mount(ResultsSearchBar, { props: { term: 'tubulação' } })

    expect(wrapper.find('input').element.value).toBe('tubulação')
  })

  it('should emit the trimmed term when searching again', async () => {
    const wrapper = mount(ResultsSearchBar, { props: { term: 'tubulação' } })

    await wrapper.find('input').setValue('  válvulas  ')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('search')).toEqual([['válvulas']])
  })

  it('should follow the URL when the term changes from outside', async () => {
    const wrapper = mount(ResultsSearchBar, { props: { term: 'tubulação' } })

    await wrapper.setProps({ term: 'caverna' })

    expect(wrapper.find('input').element.value).toBe('caverna')
  })

  describe('recent searches', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      searchHistoryApi.fetchSearchHistory.mockResolvedValue(HISTORY)
      searchHistoryApi.removeSearchHistoryTerm.mockResolvedValue(null)
    })

    async function mountFocused(term = '') {
      const wrapper = mount(ResultsSearchBar, { props: { term } })
      await wrapper.find('input').trigger('focus')
      await flushPromises()
      return wrapper
    }

    it('should show the recent searches when the input is focused', async () => {
      const wrapper = await mountFocused()

      expect(wrapper.findAll('.recent-search-text').map((item) => item.text())).toEqual(HISTORY)
    })

    it('should show the whole history even when the input already has the current term', async () => {
      const wrapper = await mountFocused('tubulação')

      expect(wrapper.findAll('.recent-search-text')).toHaveLength(HISTORY.length)
    })

    it('should narrow the recent searches to what is typed', async () => {
      const wrapper = await mountFocused()

      await wrapper.find('input').setValue('cargas')

      expect(wrapper.findAll('.recent-search-text').map((item) => item.text())).toEqual([
        'Relatório de cargas',
      ])
    })

    it('should fill the input and search again when a term is clicked', async () => {
      const wrapper = await mountFocused('tubulação')

      await wrapper.findAll('.recent-search-term')[0].trigger('click')

      expect(wrapper.find('input').element.value).toBe('Normas de estruturas metálicas')
      expect(wrapper.emitted('search')).toEqual([['Normas de estruturas metálicas']])
    })

    it('should remove a single term without searching', async () => {
      const wrapper = await mountFocused()

      await wrapper.findAll('.recent-search-remove')[1].trigger('click')
      await flushPromises()

      expect(searchHistoryApi.removeSearchHistoryTerm).toHaveBeenCalledWith('MIL-C-5541')
      expect(wrapper.findAll('.recent-search-text').map((item) => item.text())).toEqual([
        'Normas de estruturas metálicas',
        'Relatório de cargas',
      ])
      expect(wrapper.emitted('search')).toBeUndefined()
    })

    it('should close the popover with escape', async () => {
      const wrapper = await mountFocused()

      await wrapper.find('input').trigger('keydown', { key: 'Escape' })

      expect(wrapper.find('.recent-searches').exists()).toBe(false)
    })
  })
})
