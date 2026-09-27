import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, reactive } from 'vue'
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
import { normalizeDocument, useDocumentList } from '@/views/document/composables/useDocumentList.js'

function page(results, { count = results.length, totalPages = 1, currentPage = 1 } = {}) {
  return { count, total_pages: totalPages, current_page: currentPage, page_size: 20, results }
}

function makeDocument(id, overrides = {}) {
  return {
    id,
    code: `AK-2100-EST-DWG-${String(id).padStart(4, '0')}`,
    title: `Document ${id}`,
    type: { code: 'DWG', name: 'Desenho Técnico' },
    discipline: { code: 'EST', name: 'Estruturas' },
    revision: { version: 1, label: 'REV01' },
    status: 'PENDING',
    updated_at: '2026-09-18T21:30:04+00:00',
    ...overrides,
  }
}

const mountedHosts = []

async function mountList() {
  let list
  const Host = defineComponent({
    setup() {
      list = useDocumentList()
      return () => h('div')
    },
  })
  mountedHosts.push(mount(Host))
  await flushPromises()
  return list
}

describe('useDocumentList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route.query = {}
    fetchDocuments.mockResolvedValue(page([]))
  })

  afterEach(() => {
    mountedHosts.splice(0).forEach((host) => host.unmount())
  })

  it('should read the documents from results and the totals from the response', async () => {
    fetchDocuments.mockResolvedValue(
      page([makeDocument(33), makeDocument(32)], { count: 30, totalPages: 2 }),
    )

    const list = await mountList()

    expect(list.documents.value.map((document) => document.id)).toEqual([33, 32])
    expect(list.totalItems.value).toBe(30)
    expect(list.totalPages.value).toBe(2)
    expect(list.loading.value).toBe(false)
  })

  it('should ask for the first page with twenty items by default', async () => {
    await mountList()

    expect(fetchDocuments).toHaveBeenCalledWith({ page: 1, page_size: 20 })
  })

  it('should send page and page_size together with the filters of the URL', async () => {
    route.query = { q: 'caverna', tipo: 'DWG', area: 'EST', page: '2', page_size: '5' }

    const list = await mountList()

    expect(fetchDocuments).toHaveBeenCalledWith({
      q: 'caverna',
      tipo: 'DWG',
      area: 'EST',
      page: 2,
      page_size: 5,
    })
    expect(list.currentPage.value).toBe(2)
    expect(list.itemsPerPage.value).toBe(5)
  })

  it('should ignore invalid page and page_size values from the URL', async () => {
    route.query = { page: 'abc', page_size: '7' }

    const list = await mountList()

    expect(list.currentPage.value).toBe(1)
    expect(list.itemsPerPage.value).toBe(20)
    expect(fetchDocuments).toHaveBeenCalledWith({ page: 1, page_size: 20 })
  })

  it('should move to another page keeping the filters in the URL', async () => {
    route.query = { q: 'caverna', tipo: 'DWG' }
    fetchDocuments.mockResolvedValue(page([makeDocument(1)], { count: 30, totalPages: 2 }))
    const list = await mountList()

    list.goToPage(2)
    await flushPromises()

    expect(router.replace).toHaveBeenCalledWith({ query: { q: 'caverna', tipo: 'DWG', page: 2 } })
    expect(fetchDocuments).toHaveBeenLastCalledWith({
      q: 'caverna',
      tipo: 'DWG',
      page: 2,
      page_size: 20,
    })
  })

  it('should clamp the requested page to the pages that exist', async () => {
    fetchDocuments.mockResolvedValue(page([makeDocument(1)], { count: 45, totalPages: 3 }))
    const list = await mountList()

    list.goToPage(999)
    await flushPromises()

    expect(router.replace).toHaveBeenCalledWith({ query: { page: 3 } })
  })

  it('should not navigate when the requested page is the current one', async () => {
    fetchDocuments.mockResolvedValue(page([makeDocument(1)], { count: 45, totalPages: 3 }))
    const list = await mountList()

    list.goToPage(0)

    expect(router.replace).not.toHaveBeenCalled()
  })

  it('should go back to the first page when the page size changes', async () => {
    route.query = { q: 'caverna', page: '3' }
    fetchDocuments.mockResolvedValue(page([makeDocument(1)], { count: 45, totalPages: 3 }))
    const list = await mountList()

    list.setItemsPerPage(5)
    await flushPromises()

    expect(router.replace).toHaveBeenCalledWith({
      query: { q: 'caverna', page: 1, page_size: 5 },
    })
    expect(fetchDocuments).toHaveBeenLastCalledWith({ q: 'caverna', page: 1, page_size: 5 })
  })

  it('should start from the first page when the filters change', async () => {
    route.query = { q: 'caverna', page: '3' }
    await mountList()

    route.query = { q: 'longarina' }
    await flushPromises()

    expect(fetchDocuments).toHaveBeenLastCalledWith({ q: 'longarina', page: 1, page_size: 20 })
  })

  it('should fall back to the last page when the requested page is past the end', async () => {
    route.query = { page: '9' }
    fetchDocuments
      .mockResolvedValueOnce(page([], { count: 30, totalPages: 2, currentPage: 9 }))
      .mockResolvedValueOnce(page([makeDocument(10)], { count: 30, totalPages: 2, currentPage: 2 }))

    const list = await mountList()
    await flushPromises()

    expect(router.replace).toHaveBeenCalledWith({ query: { page: 2 } })
    expect(list.currentPage.value).toBe(2)
    expect(list.documents.value.map((document) => document.id)).toEqual([10])
  })

  it('should keep the empty state when the filters match nothing', async () => {
    fetchDocuments.mockResolvedValue(page([], { count: 0, totalPages: 1 }))

    const list = await mountList()

    expect(list.documents.value).toEqual([])
    expect(list.error.value).toBe('')
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('should show a generic message and an empty list when the request fails', async () => {
    fetchDocuments.mockRejectedValue(new Error('Documents failed with status 400'))

    const list = await mountList()

    expect(list.error.value).toBe('Não foi possível carregar os documentos.')
    expect(list.error.value).not.toContain('400')
    expect(list.documents.value).toEqual([])
    expect(list.totalItems.value).toBe(0)
    expect(list.loading.value).toBe(false)
  })

  it('should open the upload for a new revision and the details for a document', async () => {
    const list = await mountList()

    list.handleDocumentAction({ document: { id: 7 }, action: 'new-revision' })
    list.handleDocumentAction({ document: { id: 7 }, action: 'view-details' })
    list.handleDocumentAction({ document: { id: 7 }, action: 'unknown' })

    expect(router.push).toHaveBeenCalledTimes(2)
    expect(router.push).toHaveBeenCalledWith({ name: 'document-upload' })
    expect(router.push).toHaveBeenCalledWith({
      name: 'document-details',
      params: { documentId: 7 },
    })
  })
})

describe('normalizeDocument', () => {
  it('should show the label of the revision object', () => {
    expect(normalizeDocument(makeDocument(1)).revision).toBe('REV01')
  })

  it('should show a dash when the document has no revision', () => {
    expect(normalizeDocument(makeDocument(1, { revision: null })).revision).toBe('-')
  })

  it('should keep the backend status and use null when it is missing', () => {
    expect(normalizeDocument(makeDocument(1, { status: 'OBSOLETE' })).status).toBe('OBSOLETE')
    expect(normalizeDocument(makeDocument(1, { status: null })).status).toBeNull()
    expect(normalizeDocument({ id: 1 }).status).toBeNull()
  })

  it('should prefer the type name, then the code, then a placeholder', () => {
    expect(normalizeDocument(makeDocument(1)).type).toBe('Desenho Técnico')
    expect(normalizeDocument(makeDocument(1, { type: { code: 'DWG' } })).type).toBe('DWG')
    expect(normalizeDocument({ id: 1 }).type).toBe('Não informado')
  })

  it('should expose the update date and a default author', () => {
    const document = normalizeDocument(makeDocument(1))

    expect(document.updatedAt).toBe('2026-09-18T21:30:04+00:00')
    expect(document.updatedBy).toBe('sistema')
    expect(document.action).toBe('view-details')
  })
})
