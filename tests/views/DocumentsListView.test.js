import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
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
vi.mock('@/api/documents.js', () => ({ fetchDocuments: vi.fn() }))

import { fetchDocuments } from '@/api/documents.js'
import DocumentsListView from '@/views/document/DocumentsListView.vue'

const NEWEST = {
  id: 33,
  code: 'AK-2100-MAT-ESP-0004',
  title: 'Card 31 live',
  description: '',
  type: { code: 'ESP', name: 'Especificação Técnica' },
  discipline: { code: 'MAT', name: 'Materiais e Processos' },
  areas: [{ acronym: 'EST', name: 'Engenharia Estrutural' }],
  revision: { version: 1, label: 'REV01' },
  status: 'PENDING',
  updated_at: '2026-09-18T21:30:04+00:00',
}
const OLDER = {
  ...NEWEST,
  id: 3,
  code: 'AK-2100-EST-MEM-0001',
  title: 'Memorial de cálculo da longarina',
  revision: null,
  status: 'APPROVED',
  updated_at: '2026-09-10T12:00:00+00:00',
}

function page(results, { count = results.length, totalPages = 1 } = {}) {
  return { count, total_pages: totalPages, current_page: 1, page_size: 20, results }
}

const mountedViews = []

async function mountView() {
  const wrapper = mount(DocumentsListView)
  mountedViews.push(wrapper)
  await flushPromises()
  return wrapper
}

describe('DocumentsListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route.query = {}
    fetchDocuments.mockResolvedValue(page([]))
  })

  afterEach(() => {
    mountedViews.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  it('should list the results of the API keeping the newest document on top', async () => {
    fetchDocuments.mockResolvedValue(page([NEWEST, OLDER], { count: 30, totalPages: 2 }))

    const wrapper = await mountView()

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Card 31 live')
    expect(rows[1].text()).toContain('Memorial de cálculo da longarina')
  })

  it('should show a freshly published document as under review with its revision label', async () => {
    fetchDocuments.mockResolvedValue(page([NEWEST, OLDER], { count: 30, totalPages: 2 }))

    const wrapper = await mountView()

    const [first, second] = wrapper.findAll('tbody tr')
    expect(first.text()).toContain('Em revisão')
    expect(first.text()).toContain('REV01')
    expect(second.text()).toContain('Vigente')
    expect(second.find('.badge').text()).toBe('-')
  })

  it('should show the total found by the server, not the size of the page', async () => {
    fetchDocuments.mockResolvedValue(page([NEWEST, OLDER], { count: 30, totalPages: 2 }))

    const wrapper = await mountView()

    expect(wrapper.text()).toContain('30')
    expect(fetchDocuments).toHaveBeenCalledWith({ page: 1, page_size: 20 })
  })

  it('should show the empty state when there is no document', async () => {
    const wrapper = await mountView()

    expect(wrapper.text()).toContain('Nenhum documento encontrado.')
    expect(wrapper.find('tbody').exists()).toBe(false)
  })

  it('should show a friendly message when the list cannot be loaded', async () => {
    fetchDocuments.mockRejectedValue(new Error('Documents failed with status 500'))

    const wrapper = await mountView()

    expect(wrapper.text()).toContain('Não foi possível carregar os documentos.')
    expect(wrapper.text()).not.toContain('500')
  })

  it('should open the upload from the new document button', async () => {
    const wrapper = await mountView()

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Novo documento'))
      .trigger('click')

    expect(router.push).toHaveBeenCalledWith({ name: 'document-upload' })
  })
})
