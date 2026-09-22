import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import ResultsList from '@/views/document/components/ResultsList.vue'

const mockRoute = reactive({ query: {} })
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(({ query }) => {
    mockRoute.query = query
    return Promise.resolve()
  }),
}

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => mockRouter,
}))

vi.mock('@/api/documents.js', () => ({
  fetchDocuments: vi.fn(),
}))

import { fetchDocuments } from '@/api/documents.js'

const DocumentsTableStub = {
  name: 'DocumentsTable',
  props: ['documents'],
  emits: ['action'],
  template: `
    <div data-test="documents-table">
      <span data-test="count">{{ documents.length }}</span>
      <button
        v-for="doc in documents"
        :key="doc.id"
        :data-test="'action-' + doc.id"
        @click="$emit('action', { document: doc, action: 'view-details' })"
      >
        {{ doc.title }}
      </button>
      <button data-test="emit-new-revision" @click="$emit('action', { document: documents[0], action: 'new-revision' })">
        new-revision
      </button>
      <button data-test="emit-unknown" @click="$emit('action', { document: documents[0], action: 'unknown' })">
        unknown
      </button>
    </div>
  `,
}

const PaginationStub = {
  name: 'Pagination',
  props: ['currentPage', 'totalPages', 'totalItems', 'itemsPerPage', 'itemsPerPageOptions'],
  emits: ['change-page', 'change-items-per-page'],
  template: `
    <div data-test="pagination">
      <button data-test="page-2" @click="$emit('change-page', 2)">2</button>
      <button data-test="page-999" @click="$emit('change-page', 999)">999</button>
      <button data-test="per-page-5" @click="$emit('change-items-per-page', 5)">5</button>
    </div>
  `,
}

const PageLayoutStub = {
  name: 'PageLayout',
  props: ['title', 'subtitle'],
  template: '<div data-test="page-layout"><slot /></div>',
}

const makeDocument = (id) => ({
  id,
  title: `Document ${id}`,
  type: { code: 'DWG', name: 'Desenho Técnico' },
  revision: { version: 1, label: 'REV01' },
  status: 'APPROVED',
  updated_at: '2026-01-01',
})

const makeDocuments = (count) => Array.from({ length: count }, (_, i) => makeDocument(i + 1))

const pageOf = (results, { count = results.length, totalPages = 1, currentPage = 1 } = {}) => ({
  count,
  total_pages: totalPages,
  current_page: currentPage,
  page_size: 20,
  results,
})

const mountedViews = []

const mountView = async () => {
  const wrapper = mount(ResultsList, {
    global: {
      stubs: {
        DocumentsTable: DocumentsTableStub,
        Pagination: PaginationStub,
        PageLayout: PageLayoutStub,
      },
    },
  })
  mountedViews.push(wrapper)
  await flushPromises()
  return wrapper
}

describe('ResultsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRoute.query = {}
    fetchDocuments.mockResolvedValue(pageOf([]))
  })

  afterEach(() => {
    mountedViews.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  it('should render the results page title and subtitle', async () => {
    const wrapper = await mountView()

    const layout = wrapper.findComponent(PageLayoutStub)
    expect(layout.props('title')).toBe('Resultados')
    expect(layout.props('subtitle')).toBe('Visualize os resultados da sua busca.')
  })

  it('should show the loading message while the request is pending', async () => {
    let resolveRequest
    fetchDocuments.mockReturnValueOnce(new Promise((resolve) => (resolveRequest = resolve)))

    const wrapper = mount(ResultsList, {
      global: {
        stubs: {
          DocumentsTable: DocumentsTableStub,
          Pagination: PaginationStub,
          PageLayout: PageLayoutStub,
        },
      },
    })
    mountedViews.push(wrapper)
    await nextTick()
    expect(wrapper.text()).toContain('Carregando documentos...')

    resolveRequest(pageOf([]))
    await flushPromises()

    expect(wrapper.text()).not.toContain('Carregando documentos...')
  })

  it('should search with the filters of the URL plus the page and the page size', async () => {
    mockRoute.query = { q: 'caverna', tipo: 'DWG' }

    await mountView()

    expect(fetchDocuments).toHaveBeenCalledWith({
      q: 'caverna',
      tipo: 'DWG',
      page: 1,
      page_size: 20,
    })
  })

  it('should hand the page returned by the server to the table without slicing it', async () => {
    fetchDocuments.mockResolvedValue(pageOf(makeDocuments(20), { count: 45, totalPages: 3 }))

    const wrapper = await mountView()

    expect(wrapper.find('[data-test="count"]').text()).toBe('20')
    expect(wrapper.findComponent(DocumentsTableStub).props('documents')[0]).toMatchObject({
      id: 1,
      type: 'Desenho Técnico',
      revision: 'REV01',
      status: 'APPROVED',
    })
  })

  it('should feed the pagination with the totals of the response', async () => {
    mockRoute.query = { page: '2' }
    fetchDocuments.mockResolvedValue(
      pageOf(makeDocuments(20), { count: 45, totalPages: 3, currentPage: 2 }),
    )

    const wrapper = await mountView()

    const pagination = wrapper.findComponent(PaginationStub)
    expect(pagination.props('currentPage')).toBe(2)
    expect(pagination.props('totalPages')).toBe(3)
    expect(pagination.props('totalItems')).toBe(45)
    expect(pagination.props('itemsPerPage')).toBe(20)
    expect(pagination.props('itemsPerPageOptions')).toEqual([5, 10, 20, 50])
  })

  it('should request the next page keeping the search filters in the URL', async () => {
    mockRoute.query = { q: 'caverna', tipo: 'DWG' }
    fetchDocuments.mockResolvedValue(pageOf(makeDocuments(20), { count: 45, totalPages: 3 }))
    const wrapper = await mountView()

    await wrapper.find('[data-test="page-2"]').trigger('click')
    await flushPromises()

    expect(mockRouter.replace).toHaveBeenCalledWith({
      query: { q: 'caverna', tipo: 'DWG', page: 2 },
    })
    expect(fetchDocuments).toHaveBeenLastCalledWith({
      q: 'caverna',
      tipo: 'DWG',
      page: 2,
      page_size: 20,
    })
  })

  it('should not go past the last page', async () => {
    fetchDocuments.mockResolvedValue(pageOf(makeDocuments(20), { count: 45, totalPages: 3 }))
    const wrapper = await mountView()

    await wrapper.find('[data-test="page-999"]').trigger('click')
    await flushPromises()

    expect(mockRouter.replace).toHaveBeenCalledWith({ query: { page: 3 } })
  })

  it('should go back to the first page when the page size changes', async () => {
    mockRoute.query = { q: 'caverna', page: '3' }
    fetchDocuments.mockResolvedValue(pageOf(makeDocuments(5), { count: 45, totalPages: 3 }))
    const wrapper = await mountView()

    await wrapper.find('[data-test="per-page-5"]').trigger('click')
    await flushPromises()

    expect(mockRouter.replace).toHaveBeenCalledWith({
      query: { q: 'caverna', page: 1, page_size: 5 },
    })
    expect(fetchDocuments).toHaveBeenLastCalledWith({ q: 'caverna', page: 1, page_size: 5 })
  })

  it('should show the empty state when nothing matches', async () => {
    const wrapper = await mountView()

    expect(wrapper.text()).toContain('Nenhum documento encontrado.')
    expect(wrapper.find('[data-test="documents-table"]').exists()).toBe(false)
  })

  it('should show a generic message when the request fails', async () => {
    fetchDocuments.mockRejectedValue(new Error('Documents failed with status 400'))

    const wrapper = await mountView()

    expect(wrapper.text()).toContain('Não foi possível carregar os documentos.')
    expect(wrapper.text()).not.toContain('400')
    expect(wrapper.find('[data-test="documents-table"]').exists()).toBe(false)
  })

  it('should open the document details from the table', async () => {
    fetchDocuments.mockResolvedValue(pageOf(makeDocuments(2)))
    const wrapper = await mountView()

    await wrapper.find('[data-test="action-1"]').trigger('click')

    expect(mockRouter.push).toHaveBeenCalledWith({
      name: 'document-details',
      params: { documentId: 1 },
    })
  })

  it('should open the upload for a new revision and ignore unknown actions', async () => {
    fetchDocuments.mockResolvedValue(pageOf(makeDocuments(2)))
    const wrapper = await mountView()

    await wrapper.find('[data-test="emit-unknown"]').trigger('click')
    expect(mockRouter.push).not.toHaveBeenCalled()
    await wrapper.find('[data-test="emit-new-revision"]').trigger('click')

    expect(mockRouter.push).toHaveBeenCalledWith({ name: 'document-upload' })
  })
})
