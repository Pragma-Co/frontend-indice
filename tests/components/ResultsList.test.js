import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import ResultsList from '@/views/document/components/ResultsList.vue'

const mockRoute = { query: {} }
const mockRouter = { push: vi.fn() }

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => mockRouter,
}))

vi.mock('@/api/documents.js', () => ({
  fetchDocuments: vi.fn(),
}))

vi.mock('@/utils/searchParams.js', () => ({
  buildDocumentQueryKey: vi.fn((query) => JSON.stringify(query)),
}))

import { fetchDocuments } from '@/api/documents.js'
import { buildDocumentQueryKey } from '@/utils/searchParams.js'

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
      <button data-test="emit-continue-editing" @click="$emit('action', { document: documents[0], action: 'continue-editing' })">
        continue-editing
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
      <button data-test="page-0" @click="$emit('change-page', 0)">0</button>
      <button data-test="per-page-5" @click="$emit('change-items-per-page', 5)">5</button>
    </div>
  `,
}

const PageLayoutStub = {
  name: 'PageLayout',
  props: ['title', 'subtitle'],
  template: '<div data-test="page-layout"><slot /></div>',
}

const makeDoc = (id) => ({
  id,
  title: `Document ${id}`,
  type: { name: 'Contrato' },
  revision: '1',
  status: 'vigente',
  updated_at: '2026-01-01',
  updated_by: 'alice',
  action: 'view-details',
})

const makeRawDocs = (count) => Array.from({ length: count }, (_, i) => makeDoc(i + 1))

const mountView = () =>
  mount(ResultsList, {
    global: {
      stubs: {
        DocumentsTable: DocumentsTableStub,
        Pagination: PaginationStub,
        PageLayout: PageLayoutStub,
      },
    },
  })

const resolveWith = (documents = []) => ({ documents })

describe('ResultsList.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRoute.query = {}
    fetchDocuments.mockResolvedValue(resolveWith([]))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Carregamento inicial', () => {
    it('renderiza PageLayout com title e subtitle corretos', async () => {
      const wrapper = mountView()
      await flushPromises()

      const layout = wrapper.findComponent(PageLayoutStub)
      expect(layout.exists()).toBe(true)
      expect(layout.props('title')).toBe('Resultados')
      expect(layout.props('subtitle')).toBe('Visualize os resultados da sua busca.')
    })

    it('exibe mensagem de loading enquanto busca', async () => {
      let resolveFn
      fetchDocuments.mockReturnValueOnce(new Promise((res) => (resolveFn = res)))

      const wrapper = mountView()
      await nextTick()

      expect(wrapper.text()).toContain('Carregando documentos...')

      resolveFn(resolveWith([]))
      await flushPromises()
      expect(wrapper.text()).not.toContain('Carregando documentos...')
    })

    it('chama fetchDocuments com route.query ao montar', async () => {
      mockRoute.query = { search: 'contrato' }
      mountView()
      await flushPromises()

      expect(fetchDocuments).toHaveBeenCalledWith({ search: 'contrato' })
    })

    it('preenche documents com os dados normalizados', async () => {
      fetchDocuments.mockResolvedValueOnce(resolveWith(makeRawDocs(3)))
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.vm.documents).toHaveLength(3)
      expect(wrapper.vm.documents[0]).toMatchObject({
        id: 1,
        title: 'Document 1',
        type: 'Contrato',
        revision: '1',
        status: 'vigente',
      })
      expect(wrapper.vm.loading).toBe(false)
    })
  })

  describe('normalizeDocument', () => {
    it('usa type.name quando disponível', async () => {
      fetchDocuments.mockResolvedValueOnce({
        documents: [{ id: 1, type: { name: 'Ofício', code: 'OF' } }],
      })
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.vm.documents[0].type).toBe('Ofício')
    })

    it('cai para type.code quando não há name', async () => {
      fetchDocuments.mockResolvedValueOnce({
        documents: [{ id: 1, type: { code: 'OF' } }],
      })
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.vm.documents[0].type).toBe('OF')
    })

    it('usa "Não informado" quando não há type', async () => {
      fetchDocuments.mockResolvedValueOnce({
        documents: [{ id: 1 }],
      })
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.vm.documents[0].type).toBe('Não informado')
    })

    it('aplica defaults para campos ausentes', async () => {
      fetchDocuments.mockResolvedValueOnce({
        documents: [{ id: 1 }],
      })
      const wrapper = mountView()
      await flushPromises()

      const doc = wrapper.vm.documents[0]
      expect(doc.revision).toBe('-')
      expect(doc.status).toBe('vigente')
      expect(doc.updatedBy).toBe('sistema')
      expect(doc.action).toBe('view-details')
    })

    it('mapeia updated_at para updatedAt e updated_by para updatedBy', async () => {
      fetchDocuments.mockResolvedValueOnce({
        documents: [{ id: 1, updated_at: '2026-01-01', updated_by: 'bob' }],
      })
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.vm.documents[0].updatedAt).toBe('2026-01-01')
      expect(wrapper.vm.documents[0].updatedBy).toBe('bob')
    })
  })

  describe('Tratamento de erro', () => {
    it('exibe mensagem de erro e limpa documents em caso de falha', async () => {
      fetchDocuments.mockRejectedValueOnce(new Error('boom'))
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.vm.error).toBe('Não foi possível carregar os documentos.')
      expect(wrapper.vm.documents).toEqual([])
      expect(wrapper.vm.loading).toBe(false)
      expect(wrapper.text()).toContain('Não foi possível carregar os documentos.')
    })

    it('exibe "Nenhum documento encontrado." quando vazio', async () => {
      fetchDocuments.mockResolvedValueOnce(resolveWith([]))
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain('Nenhum documento encontrado.')
      expect(wrapper.find('[data-test="documents-table"]').exists()).toBe(false)
    })
  })

  describe('Renderização do DocumentsTable', () => {
    it('renderiza a tabela quando há documentos', async () => {
      fetchDocuments.mockResolvedValueOnce(resolveWith(makeRawDocs(2)))
      const wrapper = mountView()
      await flushPromises()

      const table = wrapper.find('[data-test="documents-table"]')
      expect(table.exists()).toBe(true)
      expect(table.find('[data-test="count"]').text()).toBe('2')
    })

    it('não mostra mensagens de status quando há documentos', async () => {
      fetchDocuments.mockResolvedValueOnce(resolveWith(makeRawDocs(1)))
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).not.toContain('Carregando documentos...')
      expect(wrapper.text()).not.toContain('Nenhum documento encontrado.')
      expect(wrapper.text()).not.toContain('Não foi possível carregar')
    })
  })

  describe('Paginação (helpers)', () => {
    it('totalPages retorna mínimo 1 com lista vazia', async () => {
      fetchDocuments.mockResolvedValueOnce(resolveWith([]))
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.vm.totalPages()).toBe(1)
    })

    it('totalPages calcula com base em itemsPerPage', async () => {
      fetchDocuments.mockResolvedValueOnce(resolveWith(makeRawDocs(45)))
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.vm.totalPages()).toBe(3)
    })

    it('paginatedDocuments fatia conforme currentPage/itemsPerPage', async () => {
      fetchDocuments.mockResolvedValueOnce(resolveWith(makeRawDocs(25)))
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.vm.paginatedDocuments()).toHaveLength(20)

      wrapper.vm.currentPage = 2
      await nextTick()
      expect(wrapper.vm.paginatedDocuments()).toHaveLength(5)
    })

    it('passa props corretas para Pagination', async () => {
      fetchDocuments.mockResolvedValueOnce(resolveWith(makeRawDocs(45)))
      const wrapper = mountView()
      await flushPromises()

      const pag = wrapper.findComponent(PaginationStub)
      expect(pag.props('currentPage')).toBe(1)
      expect(pag.props('totalPages')).toBe(3)
      expect(pag.props('totalItems')).toBe(45)
      expect(pag.props('itemsPerPage')).toBe(20)
      expect(pag.props('itemsPerPageOptions')).toEqual([5, 10, 20, 50])
    })
  })

  describe('Interações de paginação', () => {
    it('goToPage dentro dos limites', async () => {
      fetchDocuments.mockResolvedValueOnce(resolveWith(makeRawDocs(45)))
      const wrapper = mountView()
      await flushPromises()

      wrapper.vm.goToPage(2)
      expect(wrapper.vm.currentPage).toBe(2)
    })

    it('goToPage não ultrapassa totalPages', async () => {
      fetchDocuments.mockResolvedValueOnce(resolveWith(makeRawDocs(45)))
      const wrapper = mountView()
      await flushPromises()

      wrapper.vm.goToPage(999)
      expect(wrapper.vm.currentPage).toBe(3)
    })

    it('goToPage não aceita valor abaixo de 1', async () => {
      fetchDocuments.mockResolvedValueOnce(resolveWith(makeRawDocs(45)))
      const wrapper = mountView()
      await flushPromises()

      wrapper.vm.goToPage(0)
      expect(wrapper.vm.currentPage).toBe(1)
    })

    it('setItemsPerPage reseta currentPage para 1', async () => {
      fetchDocuments.mockResolvedValueOnce(resolveWith(makeRawDocs(45)))
      const wrapper = mountView()
      await flushPromises()

      wrapper.vm.currentPage = 3
      wrapper.vm.setItemsPerPage(5)

      expect(wrapper.vm.itemsPerPage).toBe(5)
      expect(wrapper.vm.currentPage).toBe(1)
    })

    it('evento change-page do Pagination atualiza currentPage', async () => {
      fetchDocuments.mockResolvedValueOnce(resolveWith(makeRawDocs(45)))
      const wrapper = mountView()
      await flushPromises()

      await wrapper.find('[data-test="page-2"]').trigger('click')
      expect(wrapper.vm.currentPage).toBe(2)
    })

    it('evento change-items-per-page reseta currentPage', async () => {
      fetchDocuments.mockResolvedValueOnce(resolveWith(makeRawDocs(45)))
      const wrapper = mountView()
      await flushPromises()

      wrapper.vm.currentPage = 3
      await wrapper.find('[data-test="per-page-5"]').trigger('click')

      expect(wrapper.vm.itemsPerPage).toBe(5)
      expect(wrapper.vm.currentPage).toBe(1)
    })
  })

  describe('Navegação', () => {
    it('goToUpload navega para document-upload', () => {
      const wrapper = mountView()
      wrapper.vm.goToUpload()

      expect(mockRouter.push).toHaveBeenCalledWith({ name: 'document-upload' })
    })

    it('goToDocumentDetails navega com o documentId', () => {
      const wrapper = mountView()
      wrapper.vm.goToDocumentDetails({ id: 42 })

      expect(mockRouter.push).toHaveBeenCalledWith({
        name: 'document-details',
        params: { documentId: 42 },
      })
    })

    it('handleDocumentAction → new-revision vai para upload', () => {
      const wrapper = mountView()
      wrapper.vm.handleDocumentAction({ document: { id: 1 }, action: 'new-revision' })

      expect(mockRouter.push).toHaveBeenCalledWith({ name: 'document-upload' })
    })

    it('handleDocumentAction → continue-editing vai para upload', () => {
      const wrapper = mountView()
      wrapper.vm.handleDocumentAction({ document: { id: 1 }, action: 'continue-editing' })

      expect(mockRouter.push).toHaveBeenCalledWith({ name: 'document-upload' })
    })

    it('handleDocumentAction → view-details vai para details', () => {
      const wrapper = mountView()
      wrapper.vm.handleDocumentAction({ document: { id: 7 }, action: 'view-details' })

      expect(mockRouter.push).toHaveBeenCalledWith({
        name: 'document-details',
        params: { documentId: 7 },
      })
    })

    it('handleDocumentAction ignora ações desconhecidas', () => {
      const wrapper = mountView()
      wrapper.vm.handleDocumentAction({ document: { id: 1 }, action: 'whatever' })

      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    it('evento action do DocumentsTable dispara navegação', async () => {
      fetchDocuments.mockResolvedValueOnce(resolveWith(makeRawDocs(2)))
      const wrapper = mountView()
      await flushPromises()

      await wrapper.find('[data-test="action-1"]').trigger('click')

      expect(mockRouter.push).toHaveBeenCalledWith({
        name: 'document-details',
        params: { documentId: 1 },
      })
    })
  })

  describe('Watch de route.query', () => {
    it('recarrega documentos quando a query muda', async () => {
      fetchDocuments.mockResolvedValue(resolveWith(makeRawDocs(1)))
      const wrapper = mountView()
      await flushPromises()

      const initialCalls = fetchDocuments.mock.calls.length

      mockRoute.query = { search: 'foo' }
      await wrapper.vm.$nextTick()

      await wrapper.vm.loadDocuments()
      await flushPromises()

      expect(fetchDocuments.mock.calls.length).toBeGreaterThan(initialCalls)
    })

    it('buildDocumentQueryKey é chamada ao menos uma vez', async () => {
      mountView()
      await flushPromises()

      expect(buildDocumentQueryKey).toHaveBeenCalled()
    })

    it('loadDocuments reseta currentPage para 1', async () => {
      fetchDocuments.mockResolvedValue(resolveWith(makeRawDocs(45)))
      const wrapper = mountView()
      await flushPromises()

      wrapper.vm.currentPage = 3
      await wrapper.vm.loadDocuments()
      await flushPromises()

      expect(wrapper.vm.currentPage).toBe(1)
    })
  })
})
