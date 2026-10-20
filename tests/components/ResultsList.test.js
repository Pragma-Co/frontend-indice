import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import ResultsList from '@/views/document/components/ResultsList.vue'

const route = reactive({ query: {} })
const router = {
  push: vi.fn(),
  replace: vi.fn(({ query }) => {
    route.query = query
    return Promise.resolve()
  }),
}

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => router,
}))
vi.mock('@/api/documents.js', () => ({
  fetchDocuments: vi.fn(),
  fetchSimpleFilters: vi.fn(),
  searchDocuments: vi.fn(),
}))

import { fetchDocuments, fetchSimpleFilters, searchDocuments } from '@/api/documents.js'

const OPTIONS = {
  types: [
    { code: 'DWG', name: 'Desenho Técnico' },
    { code: 'MEM', name: 'Memorial' },
  ],
  areas: [{ acronym: 'EST', name: 'Engenharia Estrutural' }],
  disciplines: [{ code: 'MAT', name: 'Materiais e Processos' }],
  statuses: [{ value: 'PENDING', label: 'Em revisão' }],
  dates: [{ value: 'last_month', label: 'Último mês' }],
}

function makeDocument(id) {
  return {
    id,
    code: `AK-2100-EST-DWG-${String(id).padStart(4, '0')}`,
    title: `Documento ${id}`,
    type: { code: 'DWG', name: 'Desenho Técnico' },
    discipline: { code: 'EST', name: 'Estruturas' },
    revision: { version: 1, label: 'REV01' },
    status: 'PENDING',
    updated_at: '2026-09-18T21:30:04+00:00',
  }
}

function pageOf(results, { count = results.length, totalPages = 1, currentPage = 1 } = {}) {
  return { count, total_pages: totalPages, current_page: currentPage, page_size: 20, results }
}

const mountedViews = []

async function mountView() {
  const wrapper = mount(ResultsList)
  mountedViews.push(wrapper)
  await flushPromises()
  return wrapper
}

function checkbox(wrapper, name, value) {
  return wrapper.find(`input[name="${name}"][value="${value}"]`)
}

describe('ResultsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route.query = {}
    fetchDocuments.mockResolvedValue(pageOf([]))
    searchDocuments.mockResolvedValue(pageOf([]))
    fetchSimpleFilters.mockResolvedValue(OPTIONS)
  })

  afterEach(() => {
    mountedViews.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  it('should search with the criteria of the URL as soon as it opens', async () => {
    route.query = { q: 'tubulação', tipo: 'DWG', area: 'EST', data: 'last_month' }

    await mountView()

    expect(fetchDocuments).not.toHaveBeenCalled()
    expect(searchDocuments).toHaveBeenCalledWith({
      q: 'tubulação',
      tipo: 'DWG',
      area: 'EST',
      data: 'last_month',
      page: 1,
      page_size: 20,
    })
  })

  it('should fill the search bar and the side panel with the criteria of the URL', async () => {
    route.query = { q: 'tubulação', tipo: 'DWG', status: 'PENDING' }

    const wrapper = await mountView()

    expect(wrapper.find('input[type="search"]').element.value).toBe('tubulação')
    expect(checkbox(wrapper, 'tipo', 'DWG').element.checked).toBe(true)
    expect(checkbox(wrapper, 'tipo', 'MEM').element.checked).toBe(false)
    expect(checkbox(wrapper, 'status', 'PENDING').element.checked).toBe(true)
  })

  it('should list every document without searching when there is no term', async () => {
    await mountView()

    expect(searchDocuments).not.toHaveBeenCalled()
    expect(fetchDocuments).toHaveBeenCalledWith({ page: 1, page_size: 20 })
  })

  it('should render the essential metadata of each result card', async () => {
    fetchDocuments.mockResolvedValue(
      pageOf([
        {
          ...makeDocument(1),
          tags: ['concreto'],
          areas: [{ acronym: 'EST', name: 'Engenharia Estrutural' }],
        },
      ]),
    )

    const wrapper = await mountView()

    const card = wrapper.find('.result-card').text()
    expect(card).toContain('AK-2100-EST-DWG-0001')
    expect(card).toContain('Documento 1')
    expect(card).toContain('Desenho Técnico')
    expect(card).toContain('Estruturas')
    expect(card).toContain('Engenharia Estrutural')
    expect(card).toContain('concreto')
    expect(card).toContain('REV01')
    expect(card).toContain('Em revisão')
    expect(card).toContain('Atualizado em 18/09/2026')
  })

  it('should highlight the searched terms in the title and in the snippet', async () => {
    route.query = { q: 'tubulação' }
    searchDocuments.mockResolvedValue(
      pageOf([
        {
          ...makeDocument(1),
          title: 'Planta de tubulação',
          description: 'Traçado da tubulação de água',
          highlights: {
            title: 'Planta de <mark>tubulação</mark>',
            description: 'Traçado da <mark>tubulação</mark> de água',
            content: [],
          },
        },
      ]),
    )

    const wrapper = await mountView()

    const marks = wrapper.findAll('.result-card mark').map((mark) => mark.text())
    expect(marks).toEqual(['tubulação', 'tubulação'])
    expect(wrapper.find('.result-snippet').text()).toBe('Traçado da tubulação de água')
  })

  it('should show the skeleton while the results are loading', async () => {
    searchDocuments.mockReturnValue(new Promise(() => {}))
    route.query = { q: 'tubulação' }

    const wrapper = mount(ResultsList)
    mountedViews.push(wrapper)
    await flushPromises()

    expect(wrapper.find('.results-skeleton[aria-busy="true"]').exists()).toBe(true)
    expect(wrapper.find('.result-card').exists()).toBe(false)
  })

  it('should put the applied filters in the URL and go back to the first page', async () => {
    route.query = { q: 'tubulação', page: '3', page_size: '5' }
    const wrapper = await mountView()

    await checkbox(wrapper, 'tipo', 'DWG').setValue(true)
    await checkbox(wrapper, 'discipline', 'MAT').setValue(true)
    await wrapper.find('form[aria-label="Filtros avançados"]').trigger('submit')
    await flushPromises()

    expect(router.replace).toHaveBeenCalledWith({
      query: { q: 'tubulação', tipo: 'DWG', discipline: 'MAT', page_size: '5' },
    })
    expect(searchDocuments).toHaveBeenLastCalledWith({
      q: 'tubulação',
      tipo: 'DWG',
      discipline: 'MAT',
      page: 1,
      page_size: 5,
    })
  })

  it('should keep only the term when the filters are cleared', async () => {
    route.query = { q: 'tubulação', tipo: 'DWG', status: 'PENDING', page: '2' }
    const wrapper = await mountView()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Limpar')
      .trigger('click')
    await flushPromises()

    expect(router.replace).toHaveBeenCalledWith({ query: { q: 'tubulação' } })
    expect(searchDocuments).toHaveBeenLastCalledWith({ q: 'tubulação', page: 1, page_size: 20 })
  })

  it('should search again with a new term keeping the refinements', async () => {
    route.query = { q: 'tubulação', tipo: 'DWG' }
    const wrapper = await mountView()

    await wrapper.find('input[type="search"]').setValue('válvulas')
    await wrapper.find('form[role="search"]').trigger('submit')
    await flushPromises()

    expect(router.replace).toHaveBeenCalledWith({ query: { q: 'válvulas', tipo: 'DWG' } })
  })

  it('should show the empty state with a way to clear the filters when nothing matches', async () => {
    route.query = { q: 'nada', tipo: 'DWG' }

    const wrapper = await mountView()

    expect(wrapper.text()).toContain('Nenhum resultado para “nada”')
    expect(wrapper.find('.result-card').exists()).toBe(false)
    expect(wrapper.find('.pagination').exists()).toBe(false)
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Limpar filtros')
      .trigger('click')
    expect(router.replace).toHaveBeenCalledWith({ query: { q: 'nada' } })
  })

  it('should paginate in the footer keeping the filters', async () => {
    route.query = { q: 'tubulação' }
    searchDocuments.mockResolvedValue(pageOf([makeDocument(1)], { count: 47, totalPages: 3 }))
    const wrapper = await mountView()

    await wrapper
      .findAll('.pagination button')
      .find((button) => button.text() === 'Próximo')
      .trigger('click')
    await flushPromises()

    expect(router.replace).toHaveBeenCalledWith({ query: { q: 'tubulação', page: 2 } })
    expect(searchDocuments).toHaveBeenLastCalledWith({ q: 'tubulação', page: 2, page_size: 20 })
  })

  it('should show a generic message when the search fails', async () => {
    fetchDocuments.mockRejectedValue(new Error('Documents failed with status 400'))

    const wrapper = await mountView()

    expect(wrapper.text()).toContain('Não foi possível carregar os documentos.')
    expect(wrapper.text()).not.toContain('400')
  })

  it('should keep the panel usable when the filter options cannot be loaded', async () => {
    fetchSimpleFilters.mockRejectedValue(new Error('boom'))

    const wrapper = await mountView()

    expect(wrapper.find('form[aria-label="Filtros avançados"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Sem opções disponíveis.')
  })
})
