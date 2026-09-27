import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

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

vi.mock('@/stores/authStore.js', () => ({
  useAuthStore: () => ({
    currentUser: { id: 12, name: 'Beatriz Canuto' },
  }),
}))

const documents = ref([])
const totalItems = ref(0)
const totalPages = ref(1)
const currentPage = ref(1)
const itemsPerPage = ref(20)
const loading = ref(false)
const error = ref('')

const goToPage = vi.fn()
const setItemsPerPage = vi.fn()
const goToUpload = vi.fn()
const handleDocumentAction = vi.fn()
const loadDocuments = vi.fn()
const setSkipFirstLoad = vi.fn()

vi.mock('@/views/document/composables/useDocumentList.js', () => ({
  ITEMS_PER_PAGE_OPTIONS: [10, 20, 50],
  useDocumentList: () => ({
    documents,
    totalItems,
    totalPages,
    currentPage,
    itemsPerPage,
    loading,
    error,
    goToPage,
    setItemsPerPage,
    goToUpload,
    handleDocumentAction,
    loadDocuments,
    setSkipFirstLoad,
  }),
}))

const stubs = {
  PageLayout: { template: '<div><slot name="actions" /><slot /></div>' },
  Button: {
    props: ['variant'],
    emits: ['click'],
    template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
  },
  DocumentsTable: {
    props: ['documents'],
    emits: ['action'],
    template:
      '<table><tbody><tr v-for="doc in documents" :key="doc.id"><td>{{ doc.title }}</td></tr></tbody></table>',
  },
  Pagination: {
    props: ['currentPage', 'totalPages', 'totalItems', 'itemsPerPage', 'itemsPerPageOptions'],
    emits: ['change-page', 'change-items-per-page'],
    template: '<div class="pagination-stub" />',
  },
}

import DocumentsListView from '@/views/document/DocumentsListView.vue'

function resetState() {
  documents.value = []
  totalItems.value = 0
  totalPages.value = 1
  currentPage.value = 1
  itemsPerPage.value = 20
  loading.value = false
  error.value = ''
}

async function mountView() {
  const wrapper = mount(DocumentsListView, { global: { stubs } })
  await flushPromises()
  return wrapper
}

describe('DocumentsListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetState()
    route.query = {}
  })

  it('should request only the documents created by the current user', async () => {
    await mountView()

    expect(router.replace).toHaveBeenCalledWith({
      query: { created_by_id: 12 },
    })
    expect(loadDocuments).toHaveBeenCalledTimes(1)
  })

  it('should keep the existing query when adding created_by_id', async () => {
    route.query = { page: '2' }

    await mountView()

    expect(router.replace).toHaveBeenCalledWith({
      query: { page: '2', created_by_id: 12 },
    })
    expect(loadDocuments).toHaveBeenCalledTimes(1)
  })

  it('should not rewrite the query when it already carries created_by_id', async () => {
    route.query = { created_by_id: '12' }

    await mountView()

    expect(router.replace).not.toHaveBeenCalled()
    expect(loadDocuments).toHaveBeenCalledTimes(1)
  })

  it('should list the documents provided by the composable', async () => {
    documents.value = [
      { id: 33, title: 'Card 31 live' },
      { id: 3, title: 'Memorial de cálculo da longarina' },
    ]

    const wrapper = await mountView()

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Card 31 live')
    expect(rows[1].text()).toContain('Memorial de cálculo da longarina')
  })

  it('should show the empty state when there is no document', async () => {
    const wrapper = await mountView()

    expect(wrapper.text()).toContain('Nenhum documento encontrado.')
    expect(wrapper.find('tbody').exists()).toBe(false)
  })

  it('should show a loading message while the list is being fetched', async () => {
    loading.value = true

    const wrapper = await mountView()

    expect(wrapper.text()).toContain('Carregando documentos...')
    expect(wrapper.find('tbody').exists()).toBe(false)
  })

  it('should show a friendly message when the list cannot be loaded', async () => {
    error.value = 'Não foi possível carregar os documentos.'

    const wrapper = await mountView()

    expect(wrapper.text()).toContain('Não foi possível carregar os documentos.')
  })

  it('should open the upload from the new document button', async () => {
    const wrapper = await mountView()

    const newButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Novo documento'))

    await newButton.trigger('click')

    expect(goToUpload).toHaveBeenCalledTimes(1)
  })

  it('should forward the action event from the documents table', async () => {
    documents.value = [{ id: 33, title: 'Card 31 live' }]

    const wrapper = await mountView()

    await wrapper.findComponent(stubs.DocumentsTable).vm.$emit('action', { id: 33, type: 'view' })

    expect(handleDocumentAction).toHaveBeenCalledWith({ id: 33, type: 'view' })
  })
})
