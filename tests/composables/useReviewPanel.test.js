import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

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
  ACCESS_REQUEST_DECISIONS: { APPROVED: 'APPROVED', REJECTED: 'REJECTED' },
  REVISION_DECISIONS: { APPROVED: 'APPROVED', REJECTED: 'REJECTED' },
  fetchDecisionHistory: vi.fn(),
  fetchPendingRevisions: vi.fn(),
  fetchPendingAccessRequests: vi.fn(),
  submitAccessRequestDecision: vi.fn(),
}))

import {
  fetchDecisionHistory,
  fetchPendingAccessRequests,
  fetchPendingRevisions,
  submitAccessRequestDecision,
} from '@/api/manager.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import {
  PANEL_TABS,
  normalizeAccessRequest,
  normalizeDecision,
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
      confidentiality_level: 'CONFIDENTIAL',
      project: { code: 'AK-3100', name: 'Pilone' },
      discipline: { code: 'EST', name: 'Estruturas' },
    },
    files: [{ id: 58, original_name: 'memorial.pdf', extension: 'pdf', size_bytes: 2048 }],
    ...overrides,
  }
}

function makeAccessRequest(overrides = {}) {
  return {
    id: 7,
    status: 'PENDING',
    justification: '  Preciso consultar o memorial.  ',
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

function makeDecision(overrides = {}) {
  return {
    id: 501,
    timestamp: '2026-09-26T14:32:00+00:00',
    request_type: 'REVISION',
    decision: 'APPROVED',
    document: { id: 23, code: 'AK-2100-PES-MEM-0005', title: 'Memorial de pesos' },
    revision: 'REV01',
    requester: { id: 6, name: 'Caio Bertoni' },
    reason: 'Conforme a norma aplicável.',
    user: { id: 4, name: 'Marina Duarte' },
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

  it('should expose what the reviewer needs to evaluate the revision', () => {
    const revision = normalizePendingRevision(makeRevision({ change_description: '  Updates.  ' }))

    expect(revision).toMatchObject({
      program: 'AK-3100',
      confidentiality: 'Confidencial',
      changeDescription: 'Updates.',
      files: [{ id: 58, original_name: 'memorial.pdf', extension: 'pdf', size_bytes: 2048 }],
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
      program: '-',
      confidentiality: '-',
      changeDescription: '',
      files: [],
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
      justification: 'Preciso consultar o memorial.',
      requestedAt: '2026-09-25T17:46:00',
    })
  })

  it('should use an empty justification when the backend does not provide one', () => {
    expect(normalizeAccessRequest(makeAccessRequest({ justification: null })).justification).toBe(
      '',
    )
  })
})

describe('normalizeDecision', () => {
  it('should expose the document, revision, decision, responsible and moment', () => {
    expect(normalizeDecision(makeDecision())).toEqual({
      id: 501,
      code: 'AK-2100-PES-MEM-0005',
      title: 'Memorial de pesos',
      revision: 'REV01',
      requestType: 'REVISION',
      decision: 'APPROVED',
      requesterName: 'Caio Bertoni',
      reason: 'Conforme a norma aplicável.',
      userName: 'Marina Duarte',
      decidedAt: '2026-09-26T14:32:00+00:00',
    })
  })

  it('should keep working for an access decision and a deleted document or user', () => {
    const decision = normalizeDecision(
      makeDecision({
        request_type: 'ACCESS',
        revision: null,
        requester: null,
        reason: null,
        user: null,
        document: { id: null, code: 'AK-2100-PES-MEM-0005', title: null },
      }),
    )

    expect(decision).toMatchObject({
      title: '',
      revision: null,
      requestType: 'ACCESS',
      requesterName: '-',
      reason: '',
      userName: '-',
    })
  })
})

describe('useReviewPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    route.query = {}
    fetchPendingRevisions.mockResolvedValue(page([makeRevision()]))
    fetchPendingAccessRequests.mockResolvedValue(
      page([makeAccessRequest(), makeAccessRequest({ id: 8 })]),
    )
    fetchDecisionHistory.mockResolvedValue(page([makeDecision()]))
    submitAccessRequestDecision.mockResolvedValue({ id: 7, status: 'APPROVED' })
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

  it('should reload from the first page with the chosen page size', async () => {
    fetchPendingRevisions.mockResolvedValue(page([makeRevision()], { count: 45, total_pages: 3 }))
    const panel = await mountPanel()
    panel.revisions.goToPage(2)
    await flushPromises()

    panel.revisions.setPageSize(50)
    await flushPromises()

    expect(fetchPendingRevisions).toHaveBeenLastCalledWith({ page: 1, pageSize: 50 })
    expect(panel.revisions.pageSize).toBe(50)
    expect(panel.revisions.currentPage).toBe(1)
  })

  it('should ignore a page size that is not offered or is already in use', async () => {
    const panel = await mountPanel()

    panel.revisions.setPageSize(33)
    panel.revisions.setPageSize(20)
    await flushPromises()

    expect(fetchPendingRevisions).toHaveBeenCalledTimes(1)
    expect(panel.revisions.pageSize).toBe(20)
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

  it('should close the review, confirm the approval and reload the list', async () => {
    const panel = await mountPanel()
    const [revision] = panel.revisions.items
    panel.openRevisionReview(revision)
    fetchPendingRevisions.mockResolvedValue(page([]))

    await panel.handleRevisionDecided({ revision, decision: 'APPROVED' })

    expect(panel.revisionUnderReview.value).toBeNull()
    expect(useNotificationStore().items.at(-1)).toMatchObject({
      type: 'success',
      message: 'Revisão REV02 de AK-3100-EST-ESP-0001 aprovada.',
    })
    expect(fetchPendingRevisions).toHaveBeenCalledTimes(2)
    expect(panel.revisions.items).toEqual([])
    expect(panel.tabs.value[0].count).toBe(0)
  })

  it('should confirm a refusal with its own message', async () => {
    const panel = await mountPanel()
    const [revision] = panel.revisions.items

    await panel.handleRevisionDecided({ revision, decision: 'REJECTED' })

    expect(useNotificationStore().items.at(-1).message).toBe(
      'Revisão REV02 de AK-3100-EST-ESP-0001 recusada.',
    )
  })

  it('should submit the decision, confirm it and refresh the pending access requests', async () => {
    const panel = await mountPanel()
    const [request] = panel.accessRequests.items
    fetchPendingAccessRequests.mockResolvedValue(page([makeAccessRequest({ id: 8 })]))

    await panel.handleAccessRequestDecision({
      request,
      decision: 'APPROVED',
      opinion: 'Parecer técnico detalhado.',
    })

    expect(submitAccessRequestDecision).toHaveBeenCalledWith(7, {
      decision: 'APPROVED',
      opinion: 'Parecer técnico detalhado.',
    })
    expect(useNotificationStore().items.at(-1)).toMatchObject({
      type: 'success',
      message: 'Pedido de acesso a AK-3100-HID-MEM-0018 aprovado.',
    })
    expect(fetchPendingAccessRequests).toHaveBeenCalledTimes(2)
    expect(panel.accessRequests.items.map((item) => item.id)).toEqual([8])
    expect(panel.accessRequestDecision.value).toBeNull()
  })

  it('should refresh a request that another manager has already decided', async () => {
    submitAccessRequestDecision.mockRejectedValue(
      Object.assign(new Error('already decided'), {
        status: 409,
        details: { error: 'AccessRequestAlreadyDecided' },
      }),
    )
    const panel = await mountPanel()
    const [request] = panel.accessRequests.items

    await panel.handleAccessRequestDecision({
      request,
      decision: 'REJECTED',
      opinion: 'Parecer técnico detalhado.',
    })

    expect(useNotificationStore().items.at(-1)).toMatchObject({
      type: 'error',
      message: 'Este pedido já não está disponível para decisão.',
    })
    expect(fetchPendingAccessRequests).toHaveBeenCalledTimes(2)
  })

  it('should go back one page when the decided revision was the last of its page', async () => {
    fetchPendingRevisions.mockResolvedValue(page([makeRevision()], { count: 21, total_pages: 2 }))
    const panel = await mountPanel()
    panel.revisions.goToPage(2)
    await flushPromises()
    const [revision] = panel.revisions.items
    fetchPendingRevisions
      .mockResolvedValueOnce(page([], { count: 20, total_pages: 1 }))
      .mockResolvedValueOnce(page([makeRevision({ id: 5 })], { count: 20, total_pages: 1 }))

    await panel.handleRevisionDecided({ revision, decision: 'APPROVED' })

    expect(fetchPendingRevisions).toHaveBeenLastCalledWith({ page: 1, pageSize: 20 })
    expect(panel.revisions.currentPage).toBe(1)
    expect(panel.revisions.items).toHaveLength(1)
  })

  it('should close the review, warn and reload when the revision is no longer available', async () => {
    const panel = await mountPanel()
    panel.openRevisionReview(panel.revisions.items[0])

    await panel.handleRevisionUnavailable('Esta revisão já foi avaliada por outro gestor.')

    expect(panel.revisionUnderReview.value).toBeNull()
    expect(useNotificationStore().items.at(-1)).toMatchObject({
      type: 'error',
      message: 'Esta revisão já foi avaliada por outro gestor.',
    })
    expect(fetchPendingRevisions).toHaveBeenCalledTimes(2)
  })

  describe('history', () => {
    it('should load the first page of the history on mount', async () => {
      const panel = await mountPanel()

      expect(fetchDecisionHistory).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        requestType: '',
        decision: '',
        dateFrom: '',
        dateTo: '',
      })
      expect(panel.history.items.map((item) => item.id)).toEqual([501])
    })

    it('should report a failure and a permission error with their own messages', async () => {
      fetchDecisionHistory.mockRejectedValueOnce(new Error('boom'))
      const failed = await mountPanel()
      fetchDecisionHistory.mockRejectedValueOnce({ status: 403 })
      const forbidden = await mountPanel()

      expect(failed.history.error).toBe('Não foi possível carregar o histórico de decisões.')
      expect(forbidden.history.error).toBe(
        'Você não tem permissão para acessar o painel de gestão.',
      )
    })

    it('should reload from the first page when a filter changes', async () => {
      const panel = await mountPanel()
      fetchDecisionHistory.mockClear()

      panel.history.setFilter('decision', 'REJECTED')
      panel.history.setFilter('requestType', 'ACCESS')
      await flushPromises()

      expect(fetchDecisionHistory).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 20,
        requestType: 'ACCESS',
        decision: 'REJECTED',
        dateFrom: '',
        dateTo: '',
      })
      expect(panel.history.hasFilters).toBe(true)
    })

    it('should ignore a filter that does not change', async () => {
      const panel = await mountPanel()
      fetchDecisionHistory.mockClear()

      panel.history.setFilter('decision', '')

      expect(fetchDecisionHistory).not.toHaveBeenCalled()
    })

    it('should keep the page while paging and send the active filters with it', async () => {
      fetchDecisionHistory.mockResolvedValue(page([makeDecision()], { total_pages: 3 }))
      const panel = await mountPanel()
      panel.history.setFilter('dateFrom', '2026-09-01')
      await flushPromises()

      panel.history.goToPage(2)
      await flushPromises()

      expect(fetchDecisionHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, dateFrom: '2026-09-01' }),
      )
    })

    it('should not query while the period ends before it starts', async () => {
      const panel = await mountPanel()
      panel.history.setFilter('dateFrom', '2026-09-10')
      await flushPromises()
      fetchDecisionHistory.mockClear()

      panel.history.setFilter('dateTo', '2026-09-01')
      await flushPromises()

      expect(panel.history.periodInvalid).toBe(true)
      expect(fetchDecisionHistory).not.toHaveBeenCalled()
    })

    it('should clear every filter and reload', async () => {
      const panel = await mountPanel()
      panel.history.setFilter('decision', 'APPROVED')
      await flushPromises()
      fetchDecisionHistory.mockClear()

      panel.history.clearFilters()
      await flushPromises()

      expect(panel.history.hasFilters).toBe(false)
      expect(fetchDecisionHistory).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, decision: '' }),
      )
    })

    it('should refresh the history after a decision and from the history tab', async () => {
      const panel = await mountPanel()
      fetchDecisionHistory.mockClear()

      await panel.handleRevisionDecided({
        revision: { toRevision: 'REV02', code: 'AK-3100-EST-ESP-0001' },
        decision: 'APPROVED',
      })
      route.query = { tab: 'history' }
      await panel.refreshActiveList()

      expect(fetchDecisionHistory).toHaveBeenCalledTimes(2)
    })
  })
})
