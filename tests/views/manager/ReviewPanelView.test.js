import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'
import { mount } from '@vue/test-utils'

function makeList(overrides = {}) {
  return reactive({
    items: [],
    count: 0,
    totalPages: 1,
    currentPage: 1,
    loading: false,
    error: '',
    updatedAt: new Date(2026, 8, 26, 14, 36),
    load: vi.fn(),
    goToPage: vi.fn(),
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
const openRevisionReview = vi.fn()
let revisions
let accessRequests

vi.mock('@/views/manager/composables/useReviewPanel.js', () => ({
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
    selectTab,
    openRevisionReview,
  }),
}))

import ReviewPanelView from '@/views/manager/ReviewPanelView.vue'

function findTab(wrapper, label) {
  return wrapper.findAll('[role="tab"]').find((tab) => tab.text().startsWith(label))
}

describe('ReviewPanelView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    activeTab.value = 'revisions'
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

  it('should page through the list only when there is more than one page', async () => {
    revisions = makeList({ items: [REVISION], count: 45, totalPages: 3, currentPage: 2 })
    const wrapper = mount(ReviewPanelView)
    const [previous, next] = wrapper.findAll('.panel-pagination button')

    await previous.trigger('click')
    await next.trigger('click')

    expect(wrapper.find('.panel-pagination').text()).toContain('Página 2 de 3')
    expect(revisions.goToPage.mock.calls).toEqual([[1], [3]])
  })

  it('should hide the pagination for a single page', () => {
    const wrapper = mount(ReviewPanelView)

    expect(wrapper.find('.panel-pagination').exists()).toBe(false)
  })
})
