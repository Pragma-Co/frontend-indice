import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SearchPanel from '@/views/home/components/SearchPanel.vue'
import { useSearchStore } from '@/stores/searchStore.js'
import * as searchHistoryApi from '@/api/searchHistory.js'

vi.mock('@/api/searchHistory.js', () => ({
  fetchSearchHistory: vi.fn(),
  clearSearchHistory: vi.fn(),
  removeSearchHistoryTerm: vi.fn(),
}))

const HISTORY = ['Normas de estruturas metálicas', 'MIL-C-5541', 'Relatório de cargas']

const route = { query: {} }
vi.mock('vue-router', () => ({
  useRoute: () => route,
  RouterLink: { template: '<a><slot /></a>' },
}))

const OPTIONS = {
  dates: [{ value: 'last_month', label: 'Último mês' }],
  areas: [{ acronym: 'EST', name: 'Engenharia Estrutural' }],
  types: [{ code: 'DWG', name: 'Desenho Técnico' }],
}

async function mountPanel(extraProps = {}) {
  const wrapper = mount(SearchPanel, {
    props: { filters: OPTIONS, filtersLoading: false, ...extraProps },
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  })
  await flushPromises()
  return wrapper
}

describe('SearchPanel', () => {
  let searchStore

  beforeEach(() => {
    setActivePinia(createPinia())
    searchStore = useSearchStore()
    route.query = {}
  })

  it('should show the view all documents button by default', async () => {
    const wrapper = await mountPanel()

    expect(wrapper.find('.all-documents').exists()).toBe(true)
  })

  it('should hide the view all documents button when it is not allowed', async () => {
    const wrapper = await mountPanel({ showViewAll: false })

    expect(wrapper.find('.all-documents').exists()).toBe(false)
  })

  it('should remember the search when it is fired', async () => {
    const wrapper = await mountPanel()

    await wrapper.find('input[type="search"]').setValue('tubulação')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('search')[0][0]).toEqual({ q: 'tubulação' })
    expect(searchStore.lastSearch).toEqual({ q: 'tubulação' })
  })

  it('should restore the last search when the user comes back to the home', async () => {
    searchStore.remember({ q: 'tubulação', tipo: 'DWG', area: 'EST', data: 'last_month' })

    const wrapper = await mountPanel()

    expect(wrapper.find('input[type="search"]').element.value).toBe('tubulação')
    expect(wrapper.text()).toContain('Tipo DWG')
    expect(wrapper.text()).toContain('Área EST')
    expect(wrapper.text()).toContain('Último mês')
  })

  it('should prefer the filters of the URL over the remembered search', async () => {
    searchStore.remember({ q: 'tubulação' })
    route.query = { q: 'caverna', tipo: 'DWG' }

    const wrapper = await mountPanel()

    expect(wrapper.find('input[type="search"]').element.value).toBe('caverna')
    expect(wrapper.text()).toContain('Tipo DWG')
  })

  it('should start empty when nothing was searched yet', async () => {
    const wrapper = await mountPanel()

    expect(wrapper.find('input[type="search"]').element.value).toBe('')
    expect(wrapper.text()).toContain('Qualquer data')
  })

  it('should forget the remembered search when the filters are cleared', async () => {
    searchStore.remember({ q: 'tubulação', tipo: 'DWG' })
    const wrapper = await mountPanel()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Limpar filtros')
      .trigger('click')

    expect(wrapper.find('input[type="search"]').element.value).toBe('')
    expect(searchStore.lastSearch).toEqual({})
    expect(wrapper.emitted('search')).toBeUndefined()
  })

  describe('recent searches', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      searchHistoryApi.fetchSearchHistory.mockResolvedValue(HISTORY)
      searchHistoryApi.clearSearchHistory.mockResolvedValue(null)
      searchHistoryApi.removeSearchHistoryTerm.mockResolvedValue(null)
    })

    async function focusSearch(wrapper) {
      await wrapper.find('input[type="search"]').trigger('focus')
      await flushPromises()
    }

    it('should not load the history before the input is focused', async () => {
      const wrapper = await mountPanel()

      expect(searchHistoryApi.fetchSearchHistory).not.toHaveBeenCalled()
      expect(wrapper.find('.recent-searches').exists()).toBe(false)
    })

    it('should show the recent searches when the input is focused', async () => {
      const wrapper = await mountPanel()

      await focusSearch(wrapper)

      const input = wrapper.find('input[type="search"]')
      expect(wrapper.find('.recent-searches').exists()).toBe(true)
      expect(wrapper.findAll('.recent-search-text').map((item) => item.text())).toEqual(HISTORY)
      expect(input.attributes('aria-expanded')).toBe('true')
      expect(input.attributes('aria-controls')).toBe(
        wrapper.find('[role="listbox"]').attributes('id'),
      )
    })

    it('should fill the input and search again when a term is clicked', async () => {
      const wrapper = await mountPanel()
      await focusSearch(wrapper)

      await wrapper.findAll('.recent-search-term')[1].trigger('click')

      expect(wrapper.find('input[type="search"]').element.value).toBe('MIL-C-5541')
      expect(wrapper.emitted('search')).toEqual([[{ q: 'MIL-C-5541' }]])
      expect(searchStore.currentTerm).toBe('MIL-C-5541')
      expect(wrapper.find('.recent-searches').exists()).toBe(false)
    })

    it('should search the highlighted term with the keyboard', async () => {
      const wrapper = await mountPanel()
      await focusSearch(wrapper)
      const input = wrapper.find('input[type="search"]')

      await input.trigger('keydown', { key: 'ArrowDown' })
      await input.trigger('keydown', { key: 'ArrowDown' })

      expect(input.attributes('aria-activedescendant')).toMatch(/-option-1$/)
      await input.trigger('keydown', { key: 'Enter' })

      expect(wrapper.emitted('search')).toEqual([[{ q: 'MIL-C-5541' }]])
    })

    it('should clear the history and hide the popover', async () => {
      const wrapper = await mountPanel()
      await focusSearch(wrapper)

      await wrapper.find('.recent-searches-clear').trigger('click')
      await flushPromises()

      expect(searchHistoryApi.clearSearchHistory).toHaveBeenCalledTimes(1)
      expect(wrapper.find('.recent-searches').exists()).toBe(false)
    })

    it('should close the popover when the input loses focus', async () => {
      const wrapper = await mountPanel()
      await focusSearch(wrapper)

      await wrapper.find('input[type="search"]').trigger('blur')

      expect(wrapper.find('.recent-searches').exists()).toBe(false)
      expect(wrapper.find('input[type="search"]').attributes('aria-expanded')).toBe('false')
    })
  })
})
