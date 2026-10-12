import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

const route = reactive({ query: {} })
const router = {
  replace: vi.fn(({ query }) => {
    route.query = query
  }),
}
vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => router,
}))

vi.mock('@/api/manager.js', () => ({
  fetchPendingRevisions: vi.fn(),
  fetchPendingAccessRequests: vi.fn(),
}))

import { fetchPendingAccessRequests, fetchPendingRevisions } from '@/api/manager.js'
import {
  PANEL_TABS,
  normalizeAccessRequest,
  normalizePendingRevision,
  useReviewPanel,
} from '@/views/manager/composables/useReviewPanel.js'

function makeRevision(overrides = {}) {
  return {
    id: 91,
    version: 2,
    revision: 'REV02',
    status: 'PENDING',
    change_description: 'Updates the load combinations.',
    created_at: '2026-09-26T14:32:00',
    author: { id: 2, name: 'Marina Duarte' },
    document: {
      id: 23,
      code: 'AK-3100-EST-ESP-0001',
      title: 'Relatório de verificação estrutural do pilone',
      discipline: { code: 'EST', name: 'Estruturas' },
    },
    files: [],
    ...overrides,
  }
}

function makeAccessRequest(overrides = {}) {
  return {
    id: 7,
    status: 'PENDING',
    requested_at: '2026-09-25T17:46:00',
    requester: { id: 3, name: 'Caio Bertoni', area: { acronym: 'EST', name: 'Estruturas' } },
    document: {
      id: 31,
      code: 'AK-3100-HID-MEM-0018',
      title: 'Memorial de dimensionamento',
      discipline: { code: 'HID', name: 'Hidráulica' },
    },
    ...overrides,
  }
}

function page(results, overrides = {}) {
  return {
    count: results.length,
    total_pages: 1,
    current_page: 1,
    page_size: 20,
    results,
    ...overrides,
  }
}

function deferred() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

async function mountPanel() {
  let panel
  mount(
    defineComponent({
      setup() {
        panel = useReviewPanel()
        return () => h('div')
      },
    }),
  )
  await flushPromises()
  return panel
}

describe('normalizePendingRevision', () => {
  it('should describe the transition from the previous revision to the pending one', () => {
    const revision = normalizePendingRevision(makeRevision())

    expect(revision).toMatchObject({
      id: 91,
      documentId: 23,
      code: 'AK-3100-EST-ESP-0001',
      title: 'Relatório de verificação estrutural do pilone',
      discipline: 'Estruturas',
      fromRevision: 'REV01',
      toRevision: 'REV02',
      authorName: 'Marina Duarte',
      createdAt: '2026-09-26T14:32:00',
      status: 'PENDING',
    })
  })

  it('should start the transition at REV00 for the first revision of a document', () => {
    const revision = normalizePendingRevision(makeRevision({ version: 1, revision: 'REV01' }))

    expect(revision.fromRevision).toBe('REV00')
    expect(revision.toRevision).toBe('REV01')
  })

  it('should fall back to placeholders when the payload misses nested data', () => {
    const revision = normalizePendingRevision({ id: 5, version: 3 })

    expect(revision).toMatchObject({
      code: '-',
      title: '-',
      discipline: '-',
      authorName: '-',
      fromRevision: 'REV02',
      toRevision: 'REV03',
    })
  })
})

describe('normalizeAccessRequest', () => {
  it('should expose the requester, the document and the request date', () => {
    expect(normalizeAccessRequest(makeAccessRequest())).toMatchObject({
      id: 7,
      documentId: 31,
      code: 'AK-3100-HID-MEM-0018',
      discipline: 'Hidráulica',
      requesterName: 'Caio Bertoni',
      requesterArea: 'EST',
      requestedAt: '2026-09-25T17:46:00',
    })
  })
})

describe('useReviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route.query = {}
    fetchPendingRevisions.mockResolvedValue(page([makeRevision()]))
    fetchPendingAccessRequests.mockResolvedValue(
      page([makeAccessRequest(), makeAccessRequest({ id: 8 })]),
    )
  })

  it('should load both pending lists on mount', async () => {
    const panel = await mountPanel()

    expect(fetchPendingRevisions).toHaveBeenCalledWith({ page: 1, pageSize: 20 })
    expect(fetchPendingAccessRequests).toHaveBeenCalledWith({ page: 1, pageSize: 20 })
    expect(panel.revisions.items).toHaveLength(1)
    expect(panel.accessRequests.items).toHaveLength(2)
    expect(panel.revisions.loading).toBe(false)
    expect(panel.revisions.updatedAt).toBeInstanceOf(Date)
  })

  it('should show the pending counts on the tabs and none on the history tab', async () => {
    const panel = await mountPanel()

    expect(panel.tabs.value).toEqual([
      { id: 'revisions', label: 'Revisões Técnicas Pendentes', count: 1 },
      { id: 'access-requests', label: 'Pedidos de Acesso a Documentos Restritos', count: 2 },
      { id: 'history', label: 'Histórico', count: null },
    ])
  })

  it('should keep the lists loading until the backend answers', async () => {
    const pending = deferred()
    fetchPendingRevisions.mockReturnValue(pending.promise)

    const panel = await mountPanel()
    const loadingBefore = panel.revisions.loading
    pending.resolve(page([]))
    await flushPromises()

    expect(loadingBefore).toBe(true)
    expect(panel.revisions.loading).toBe(false)
    expect(panel.revisions.items).toEqual([])
    expect(panel.revisions.count).toBe(0)
  })

  it('should open on the revisions tab by default', async () => {
    const panel = await mountPanel()

    expect(panel.activeTab.value).toBe(PANEL_TABS.REVISIONS)
  })

  it('should restore the tab from the address and ignore an unknown one', async () => {
    route.query = { tab: 'access-requests' }
    const panel = await mountPanel()
    const restored = panel.activeTab.value

    route.query = { tab: 'anything' }

    expect(restored).toBe(PANEL_TABS.ACCESS_REQUESTS)
    expect(panel.activeTab.value).toBe(PANEL_TABS.REVISIONS)
  })

  it('should keep the selected tab in the address', async () => {
    const panel = await mountPanel()

    panel.selectTab(PANEL_TABS.HISTORY)

    expect(router.replace).toHaveBeenCalledWith({ query: { tab: 'history' } })
    expect(panel.activeTab.value).toBe(PANEL_TABS.HISTORY)
  })

  it('should not navigate when the current tab is selected again', async () => {
    const panel = await mountPanel()

    panel.selectTab(PANEL_TABS.REVISIONS)

    expect(router.replace).not.toHaveBeenCalled()
  })

  it('should explain a permission error when the backend refuses the user', async () => {
    fetchPendingRevisions.mockRejectedValue(Object.assign(new Error('denied'), { status: 403 }))

    const panel = await mountPanel()

    expect(panel.revisions.error).toBe('Você não tem permissão para acessar o painel de gestão.')
    expect(panel.revisions.items).toEqual([])
    expect(panel.revisions.count).toBeNull()
    expect(panel.accessRequests.error).toBe('')
  })

  it('should report a load failure of each list with its own message', async () => {
    fetchPendingRevisions.mockRejectedValue(Object.assign(new Error('boom'), { status: 500 }))
    fetchPendingAccessRequests.mockRejectedValue(new Error('offline'))

    const panel = await mountPanel()

    expect(panel.revisions.error).toBe('Não foi possível carregar as revisões pendentes.')
    expect(panel.accessRequests.error).toBe('Não foi possível carregar os pedidos de acesso.')
  })

  it('should recover when the list is loaded again after a failure', async () => {
    fetchPendingRevisions.mockRejectedValueOnce(new Error('offline'))
    const panel = await mountPanel()

    await panel.revisions.load()

    expect(panel.revisions.error).toBe('')
    expect(panel.revisions.items).toHaveLength(1)
  })

  it('should load another page of the list', async () => {
    fetchPendingRevisions.mockResolvedValue(page([makeRevision()], { count: 45, total_pages: 3 }))
    const panel = await mountPanel()

    panel.revisions.goToPage(2)
    await flushPromises()

    expect(fetchPendingRevisions).toHaveBeenLastCalledWith({ page: 2, pageSize: 20 })
    expect(panel.revisions.currentPage).toBe(2)
    expect(panel.revisions.totalPages).toBe(3)
  })

  it('should ignore a page outside the available range', async () => {
    const panel = await mountPanel()

    panel.revisions.goToPage(5)
    await flushPromises()

    expect(fetchPendingRevisions).toHaveBeenCalledTimes(1)
  })

  it('should keep the revision chosen for evaluation until the review is closed', async () => {
    const panel = await mountPanel()
    const [revision] = panel.revisions.items

    panel.openRevisionReview(revision)
    const opened = panel.revisionUnderReview.value
    panel.closeRevisionReview()

    expect(opened).toEqual(revision)
    expect(panel.revisionUnderReview.value).toBeNull()
  })
})
