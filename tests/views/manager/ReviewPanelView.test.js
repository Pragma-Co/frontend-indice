import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'
import { mount } from '@vue/test-utils'

function makeHistory(overrides = {}) {
  return makeList({
    filters: { requestType: '', decision: '', dateFrom: '', dateTo: '' },
    periodInvalid: false,
    hasFilters: false,
    setFilter: vi.fn(),
    clearFilters: vi.fn(),
    ...overrides,
  })
}

function makeList(overrides = {}) {
  return reactive({
    items: [],
    count: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 20,
    loading: false,
    error: '',
    updatedAt: new Date(2026, 8, 26, 14, 36),
    load: vi.fn(),
    goToPage: vi.fn(),
    setPageSize: vi.fn(),
    ...overrides,
  })
}

const REVISION = {
  id: 91,
  code: 'AK-3100-EST-ESP-0001',
  title: 'Relatório de verificação estrutural',
  discipline: 'Estruturas',
  fromRevision: 'REV01',
  toRevision: 'REV02',
  authorName: 'Marina Duarte',
  createdAt: '2026-09-26T14:32:00',
  status: 'PENDING',
}

const ACCESS_REQUEST = {
  id: 7,
  code: 'AK-3100-HID-MEM-0018',
  title: 'Memorial de dimensionamento',
  discipline: 'Hidráulica',
  requesterName: 'Caio Bertoni',
  requesterArea: 'EST',
  justification: 'Preciso consultar o documento para a inspeção.',
  requestedAt: '2026-09-25T17:46:00',
  status: 'PENDING',
}

const DECISION = {
  id: 501,
  code: 'AK-2100-PES-MEM-0005',
  title: 'Memorial de pesos',
  revision: 'REV01',
  requestType: 'REVISION',
  decision: 'APPROVED',
  requesterName: 'Caio Bertoni',
  reason: 'Memorial conforme a norma aplicável.',
  userName: 'Marina Duarte',
  decidedAt: '2026-09-26T14:32:00',
}

const activeTab = ref('revisions')
const selectTab = vi.fn((tab) => {
  activeTab.value = tab
})
const revisionUnderReview = ref(null)
const accessRequestDecision = ref(null)
const accessRequestUnderReview = ref(null)
const openAccessRequestReview = vi.fn((request) => {
  accessRequestUnderReview.value = request
})
const closeAccessRequestReview = vi.fn(() => {
  accessRequestUnderReview.value = null
})
const openRevisionReview = vi.fn((revision) => {
  revisionUnderReview.value = revision
})
const closeRevisionReview = vi.fn(() => {
  revisionUnderReview.value = null
})
const handleRevisionDecided = vi.fn()
const handleRevisionUnavailable = vi.fn()
const handleAccessRequestDecision = vi.fn()
let revisions
let accessRequests
let history

vi.mock('@/views/manager/composables/useReviewPanel.js', () => ({
  PANEL_PAGE_SIZE_OPTIONS: [5, 10, 20, 50],
  PANEL_TABS: { REVISIONS: 'revisions', ACCESS_REQUESTS: 'access-requests', HISTORY: 'history' },
  useReviewPanel: () => ({
    tabs: ref([
      { id: 'revisions', label: 'Revisões Técnicas Pendentes', count: revisions.count },
      {
        id: 'access-requests',
        label: 'Pedidos de Acesso a Documentos Restritos',
        count: accessRequests.count,
      },
      { id: 'history', label: 'Histórico', count: null },
    ]),
    activeTab,
    revisions,
    accessRequests,
    history,
    revisionUnderReview,
    accessRequestDecision,
    accessRequestUnderReview,
    openAccessRequestReview,
    closeAccessRequestReview,
    selectTab,
    openRevisionReview,
    closeRevisionReview,
    handleRevisionDecided,
    handleRevisionUnavailable,
    handleAccessRequestDecision,
  }),
}))

vi.mock('@/views/manager/components/RevisionReviewModal.vue', () => ({
  default: {
    name: 'RevisionReviewModal',
    props: ['revision'],
    emits: ['close', 'decided', 'unavailable'],
    template: '<div class="review-modal-stub">{{ revision.code }}</div>',
  },
}))

import ReviewPanelView from '@/views/manager/ReviewPanelView.vue'

function findTab(wrapper, label) {
  return wrapper.findAll('[role="tab"]').find((tab) => tab.text().startsWith(label))
}

function findFilter(wrapper, label) {
  return wrapper.findAll('.filter-trigger').find((trigger) => trigger.text().startsWith(label))
}

describe('ReviewPanelView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    HTMLDialogElement.prototype.showModal = vi.fn()
    HTMLDialogElement.prototype.close = vi.fn()
    activeTab.value = 'revisions'
    revisionUnderReview.value = null
    accessRequestDecision.value = null
    accessRequestUnderReview.value = null
    revisions = makeList({ items: [REVISION], count: 1 })
    accessRequests = makeList({ items: [ACCESS_REQUEST], count: 1 })
    history = makeHistory({ items: [DECISION], count: 1 })
  })

  afterEach(() => {
    delete HTMLDialogElement.prototype.showModal
    delete HTMLDialogElement.prototype.close
  })

  it('should present the panel with its three tabs', () => {
    const wrapper = mount(ReviewPanelView)

    expect(wrapper.find('h1').text()).toBe('Painel de revisões')
    expect(wrapper.findAll('[role="tab"]').map((tab) => tab.text())).toEqual([
      'Revisões Técnicas Pendentes (1)',
      'Pedidos de Acesso a Documentos Restritos (1)',
      'Histórico',
    ])
  })

  it('should list the pending revisions with the time of the last update', () => {
    const wrapper = mount(ReviewPanelView)

    expect(wrapper.find('[role="tabpanel"] h2').text()).toBe('Revisões aguardando decisão técnica')
    expect(wrapper.find('.panel-updated').text()).toBe('Atualizado hoje • 14:36')
    expect(wrapper.find('tbody').text()).toContain('AK-3100-EST-ESP-0001')
  })

  it('should hand the revision to the evaluation when its button is clicked', async () => {
    const wrapper = mount(ReviewPanelView)

    await wrapper.find('tbody button').trigger('click')

    expect(openRevisionReview).toHaveBeenCalledWith(REVISION)
  })

  it('should keep the evaluation modal closed until a revision is chosen', () => {
    const wrapper = mount(ReviewPanelView)

    expect(wrapper.find('.review-modal-stub').exists()).toBe(false)
  })

  it('should open the evaluation modal for the chosen revision', async () => {
    const wrapper = mount(ReviewPanelView)

    await wrapper.find('tbody button').trigger('click')

    expect(wrapper.find('.review-modal-stub').text()).toBe('AK-3100-EST-ESP-0001')
  })

  it('should forward what happens in the modal to the panel', async () => {
    const wrapper = mount(ReviewPanelView)
    await wrapper.find('tbody button').trigger('click')
    const modal = wrapper.findComponent({ name: 'RevisionReviewModal' })
    const outcome = { revision: REVISION, decision: 'APPROVED' }

    modal.vm.$emit('decided', outcome)
    modal.vm.$emit('unavailable', 'Esta revisão já foi avaliada por outro gestor.')
    modal.vm.$emit('close')
    await wrapper.vm.$nextTick()

    expect(handleRevisionDecided).toHaveBeenCalledWith(outcome)
    expect(handleRevisionUnavailable).toHaveBeenCalledWith(
      'Esta revisão já foi avaliada por outro gestor.',
    )
    expect(closeRevisionReview).toHaveBeenCalled()
    expect(wrapper.find('.review-modal-stub').exists()).toBe(false)
  })

  it('should show a skeleton while the revisions are loading', () => {
    revisions = makeList({ loading: true, updatedAt: null, count: null })

    const wrapper = mount(ReviewPanelView)

    const skeleton = wrapper.find('.panel-skeleton')
    expect(skeleton.attributes('aria-busy')).toBe('true')
    expect(skeleton.attributes('aria-label')).toBe('Carregando revisões pendentes')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('should show an empty state when there is no pending revision', () => {
    revisions = makeList()

    const wrapper = mount(ReviewPanelView)

    expect(wrapper.find('.panel-empty').text()).toContain('Nenhuma revisão pendente')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('should show the error and load again on retry', async () => {
    revisions = makeList({ error: 'Não foi possível carregar as revisões pendentes.' })
    const wrapper = mount(ReviewPanelView)

    await wrapper.find('[role="alert"] button').trigger('click')

    expect(wrapper.find('[role="alert"]').text()).toContain('Não foi possível carregar')
    expect(revisions.load).toHaveBeenCalled()
  })

  it('should switch to the access requests when their tab is clicked', async () => {
    const wrapper = mount(ReviewPanelView)

    await findTab(wrapper, 'Pedidos de Acesso').trigger('click')

    expect(selectTab).toHaveBeenCalledWith('access-requests')
    expect(wrapper.find('[role="tabpanel"] h2').text()).toBe('Pedidos de acesso aguardando decisão')
    expect(wrapper.find('tbody').text()).toContain('Caio Bertoni')
    expect(wrapper.findAll('tbody button').map((button) => button.text())).toEqual([
      'Avaliar Acesso',
    ])
  })

  it('should open the selected access request and show its justification', async () => {
    const wrapper = mount(ReviewPanelView, { global: { stubs: { teleport: true } } })
    await findTab(wrapper, 'Pedidos de Acesso').trigger('click')

    await wrapper.get('button[aria-label^="Avaliar acesso"]').trigger('click')

    expect(openAccessRequestReview).toHaveBeenCalledWith(ACCESS_REQUEST)
    expect(wrapper.get('dialog .justification').text()).toBe(ACCESS_REQUEST.justification)
    await wrapper.get('dialog button[aria-label="Fechar"]').trigger('click')
    expect(wrapper.find('dialog').exists()).toBe(false)
  })

  it('should show an empty state when there is no access request', async () => {
    accessRequests = makeList()
    const wrapper = mount(ReviewPanelView)

    await findTab(wrapper, 'Pedidos de Acesso').trigger('click')

    expect(wrapper.find('.panel-empty').text()).toContain('Nenhum pedido de acesso pendente')
  })

  describe('history tab', () => {
    async function openHistory() {
      const wrapper = mount(ReviewPanelView)
      await findTab(wrapper, 'Histórico').trigger('click')
      return wrapper
    }

    it('should list the decisions already taken', async () => {
      const wrapper = await openHistory()

      expect(wrapper.find('[role="tabpanel"]').attributes('aria-labelledby')).toBe(
        'panel-tab-history',
      )
      expect(wrapper.find('[role="tabpanel"] h2').text()).toBe('Histórico de decisões')
      expect(wrapper.find('tbody').text()).toContain('AK-2100-PES-MEM-0005')
      expect(wrapper.find('tbody').text()).toContain('Aprovada')
      expect(wrapper.find('.panel-empty').exists()).toBe(false)
    })

    it('should be read only, with no evaluation action on the records', async () => {
      const wrapper = await openHistory()

      expect(wrapper.findAll('tbody button').map((button) => button.classes())).toEqual([
        ['code-link'],
      ])
      expect(wrapper.find('thead').text()).not.toContain('Ações')
    })

    it('should show the reason of a decision when its code is clicked', async () => {
      const wrapper = mount(ReviewPanelView, { global: { stubs: { teleport: true } } })
      await findTab(wrapper, 'Histórico').trigger('click')

      await wrapper.find('button.code-link').trigger('click')

      const dialog = wrapper.get('dialog')
      expect(dialog.text()).toContain('Motivo do aceite')
      expect(dialog.text()).toContain('Memorial conforme a norma aplicável.')
      await dialog.get('button[aria-label="Fechar"]').trigger('click')
      expect(wrapper.find('dialog').exists()).toBe(false)
    })

    it('should show the filters and name the decisions in the pagination', async () => {
      const wrapper = await openHistory()

      expect(wrapper.find('form[role="search"]').exists()).toBe(true)
      expect(wrapper.find('.pagination-summary').text()).toBe('Mostrando 1 a 1 de 1 decisões')
    })

    it('should keep the filters out of the other tabs', () => {
      const wrapper = mount(ReviewPanelView)

      expect(wrapper.find('form[role="search"]').exists()).toBe(false)
    })

    it('should show a skeleton while the history is loading', async () => {
      history = makeHistory({ loading: true, updatedAt: null, count: null })

      const wrapper = await openHistory()

      expect(wrapper.find('.panel-skeleton').attributes('aria-label')).toBe(
        'Carregando histórico de decisões',
      )
      expect(wrapper.find('table').exists()).toBe(false)
      expect(wrapper.find('form[role="search"]').exists()).toBe(true)
    })

    it('should show the empty state when no decision was recorded yet', async () => {
      history = makeHistory()

      const wrapper = await openHistory()

      expect(wrapper.find('.panel-empty').text()).toContain('Nenhuma decisão registrada')
      expect(wrapper.find('table').exists()).toBe(false)
    })

    it('should say that nothing matches when the filters leave no decision', async () => {
      history = makeHistory({ hasFilters: true })

      const wrapper = await openHistory()

      expect(wrapper.find('.panel-empty').text()).toContain('Nenhuma decisão encontrada')
    })

    it('should show the error, keep the filters and load again on retry', async () => {
      history = makeHistory({ error: 'Não foi possível carregar o histórico de decisões.' })
      const wrapper = await openHistory()

      await wrapper.find('[role="alert"] button').trigger('click')

      expect(wrapper.find('[role="alert"]').text()).toContain('histórico de decisões')
      expect(wrapper.find('form[role="search"]').exists()).toBe(true)
      expect(wrapper.find('.panel-pagination').exists()).toBe(false)
      expect(history.load).toHaveBeenCalled()
    })

    it('should hand the filters to the history and clear them', async () => {
      history = makeHistory({ hasFilters: true })
      const wrapper = await openHistory()

      await findFilter(wrapper, 'Decisão').trigger('click')
      await wrapper
        .findAll('[role="option"]')
        .find((option) => option.text() === 'Reprovada / Indeferida')
        .trigger('click')
      await wrapper
        .findAll('form button')
        .find((button) => button.text() === 'Limpar filtros')
        .trigger('click')

      expect(history.setFilter).toHaveBeenCalledWith('decision', 'REJECTED')
      expect(history.clearFilters).toHaveBeenCalled()
    })

    it('should page through the history', async () => {
      history = makeHistory({ items: [DECISION], count: 45, totalPages: 3, currentPage: 2 })
      const wrapper = await openHistory()

      await wrapper.find('.panel-pagination .page-nav').trigger('click')
      await wrapper.find('.panel-pagination select').setValue('10')

      expect(history.goToPage).toHaveBeenCalledWith(1)
      expect(history.setPageSize).toHaveBeenCalledWith(10)
    })
  })

  it('should always show the pagination of the list with its own item name', () => {
    const wrapper = mount(ReviewPanelView)

    const pagination = wrapper.find('.panel-pagination')

    expect(pagination.find('.pagination-summary').text()).toBe('Mostrando 1 a 1 de 1 revisões')
    expect(pagination.find('select').element.value).toBe('20')
  })

  it('should keep the table in its own scrolling area above the pagination', () => {
    const wrapper = mount(ReviewPanelView)

    const children = wrapper.find('[role="tabpanel"]').element.children
    const tableArea = wrapper.find('.table-scroll')

    expect(tableArea.classes()).toContain('panel-content')
    expect(children[children.length - 1].classList.contains('panel-pagination')).toBe(true)
  })

  it('should page through the list and change the page size', async () => {
    revisions = makeList({ items: [REVISION], count: 45, totalPages: 3, currentPage: 2 })
    const wrapper = mount(ReviewPanelView)
    const pagination = wrapper.find('.panel-pagination')

    await pagination.find('.page-nav').trigger('click')
    await pagination.findAll('.page-number')[2].trigger('click')
    await pagination.find('select').setValue('50')

    expect(pagination.find('.pagination-summary').text()).toBe('Mostrando 21 a 40 de 45 revisões')
    expect(revisions.goToPage.mock.calls).toEqual([[1], [3]])
    expect(revisions.setPageSize).toHaveBeenCalledWith(50)
  })

  it('should name the access requests in their pagination', async () => {
    const wrapper = mount(ReviewPanelView)

    await findTab(wrapper, 'Pedidos de Acesso').trigger('click')

    expect(wrapper.find('.pagination-summary').text()).toBe('Mostrando 1 a 1 de 1 pedidos')
  })

  it('should hide the pagination when the list fails', () => {
    revisions = makeList({ error: 'Não foi possível carregar as revisões pendentes.' })

    const wrapper = mount(ReviewPanelView)

    expect(wrapper.find('.panel-pagination').exists()).toBe(false)
  })
})
