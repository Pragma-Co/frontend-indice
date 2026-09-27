import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SearchPanel from '@/views/home/components/SearchPanel.vue'
import { useSearchStore } from '@/stores/searchStore.js'

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

async function mountPanel() {
  const wrapper = mount(SearchPanel, {
    props: { filters: OPTIONS, filtersLoading: false },
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
})
