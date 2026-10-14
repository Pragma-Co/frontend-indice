import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'
import { mount } from '@vue/test-utils'

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
  requestedAt: '2026-09-25T17:46:00',
  status: 'PENDING',
}

const activeTab = ref('revisions')
const selectTab = vi.fn((tab) => {
  activeTab.value = tab
})
const revisionUnderReview = ref(null)
const openRevisionReview = vi.fn((revision) => {
  revisionUnderReview.value = revision
})
const closeRevisionReview = vi.fn(() => {
  revisionUnderReview.value = null
})
const handleRevisionDecided = vi.fn()
const handleRevisionUnavailable = vi.fn()
let revisions
let accessRequests

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
    revisionUnderReview,
    selectTab,
    openRevisionReview,
    closeRevisionReview,
    handleRevisionDecided,
    handleRevisionUnavailable,
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

describe('ReviewPanelView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    activeTab.value = 'revisions'
    revisionUnderReview.value = null
    revisions = makeList({ items: [REVISION], count: 1 })
    accessRequests = makeList({ items: [ACCESS_REQUEST], count: 1 })
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
    expect(wrapper.find('tbody button').exists()).toBe(false)
  })

  it('should show an empty state when there is no access request', async () => {
    accessRequests = makeList()
    const wrapper = mount(ReviewPanelView)

    await findTab(wrapper, 'Pedidos de Acesso').trigger('click')

    expect(wrapper.find('.panel-empty').text()).toContain('Nenhum pedido de acesso pendente')
  })

  it('should explain that the history is not available yet', async () => {
    const wrapper = mount(ReviewPanelView)

    await findTab(wrapper, 'Histórico').trigger('click')

    expect(wrapper.find('[role="tabpanel"]').attributes('aria-labelledby')).toBe(
      'panel-tab-history',
    )
    expect(wrapper.find('.panel-empty').text()).toContain('Histórico ainda não disponível')
    expect(wrapper.find('table').exists()).toBe(false)
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

  it('should hide the pagination on the history tab and when the list fails', async () => {
    revisions = makeList({ error: 'Não foi possível carregar as revisões pendentes.' })
    const wrapper = mount(ReviewPanelView)
    const shownOnError = wrapper.find('.panel-pagination').exists()

    await findTab(wrapper, 'Histórico').trigger('click')

    expect(shownOnError).toBe(false)
    expect(wrapper.find('.panel-pagination').exists()).toBe(false)
  })
})
