import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchPendingAccessRequests, fetchPendingRevisions } from '@/api/manager.js'
import { revisionLabel } from '@/utils/documentCode.js'

export const PANEL_TABS = {
  REVISIONS: 'revisions',
  ACCESS_REQUESTS: 'access-requests',
  HISTORY: 'history',
}

export const PANEL_PAGE_SIZE_OPTIONS = [5, 10, 20, 50]
export const PANEL_PAGE_SIZE = 20

const PERMISSION_ERROR_MESSAGE = 'Você não tem permissão para acessar o painel de gestão.'
const REVISIONS_ERROR_MESSAGE = 'Não foi possível carregar as revisões pendentes.'
const ACCESS_REQUESTS_ERROR_MESSAGE = 'Não foi possível carregar os pedidos de acesso.'

export function normalizePendingRevision(revision) {
  const version = revision.version ?? 1
  return {
    id: revision.id,
    documentId: revision.document?.id ?? null,
    code: revision.document?.code ?? '-',
    title: revision.document?.title ?? '-',
    discipline: revision.document?.discipline?.name ?? '-',
    fromRevision: revisionLabel(version - 1),
    toRevision: revision.revision ?? revisionLabel(version),
    authorName: revision.author?.name ?? '-',
    createdAt: revision.created_at ?? null,
    status: revision.status ?? null,
    source: revision,
  }
}

export function normalizeAccessRequest(request) {
  return {
    id: request.id,
    documentId: request.document?.id ?? null,
    code: request.document?.code ?? '-',
    title: request.document?.title ?? '-',
    discipline: request.document?.discipline?.name ?? '-',
    requesterName: request.requester?.name ?? '-',
    requesterArea: request.requester?.area?.acronym ?? null,
    requestedAt: request.requested_at ?? null,
    status: request.status ?? null,
    source: request,
  }
}

function usePendingList(fetchPage, normalize, errorMessage) {
  const items = ref([])
  const count = ref(null)
  const totalPages = ref(1)
  const currentPage = ref(1)
  const pageSize = ref(PANEL_PAGE_SIZE)
  const loading = ref(true)
  const error = ref('')
  const updatedAt = ref(null)
  let latestRequest = 0

  async function load(page = currentPage.value) {
    const request = ++latestRequest
    loading.value = true
    error.value = ''
    try {
      const response = await fetchPage({ page, pageSize: pageSize.value })
      if (request !== latestRequest) return
      items.value = (response?.results ?? []).map(normalize)
      count.value = response?.count ?? items.value.length
      totalPages.value = Math.max(1, response?.total_pages ?? 1)
      currentPage.value = page
      updatedAt.value = new Date()
    } catch (failure) {
      if (request !== latestRequest) return
      items.value = []
      count.value = null
      totalPages.value = 1
      const forbidden = failure?.status === 401 || failure?.status === 403
      error.value = forbidden ? PERMISSION_ERROR_MESSAGE : errorMessage
    } finally {
      if (request === latestRequest) loading.value = false
    }
  }

  function goToPage(page) {
    const target = Math.min(Math.max(1, page), totalPages.value)
    if (target === currentPage.value) return
    load(target)
  }

  function setPageSize(size) {
    if (!PANEL_PAGE_SIZE_OPTIONS.includes(size) || size === pageSize.value) return
    pageSize.value = size
    load(1)
  }

  return reactive({
    items,
    count,
    totalPages,
    currentPage,
    pageSize,
    loading,
    error,
    updatedAt,
    load,
    goToPage,
    setPageSize,
  })
}

export function useReviewPanel() {
  const route = useRoute()
  const router = useRouter()

  const revisions = usePendingList(
    fetchPendingRevisions,
    normalizePendingRevision,
    REVISIONS_ERROR_MESSAGE,
  )
  const accessRequests = usePendingList(
    fetchPendingAccessRequests,
    normalizeAccessRequest,
    ACCESS_REQUESTS_ERROR_MESSAGE,
  )
  const revisionUnderReview = ref(null)

  const activeTab = computed(() =>
    Object.values(PANEL_TABS).includes(route.query.tab) ? route.query.tab : PANEL_TABS.REVISIONS,
  )

  const tabs = computed(() => [
    {
      id: PANEL_TABS.REVISIONS,
      label: 'Revisões Técnicas Pendentes',
      count: revisions.count,
    },
    {
      id: PANEL_TABS.ACCESS_REQUESTS,
      label: 'Pedidos de Acesso a Documentos Restritos',
      count: accessRequests.count,
    },
    { id: PANEL_TABS.HISTORY, label: 'Histórico', count: null },
  ])

  function selectTab(tab) {
    if (tab === activeTab.value) return
    router.replace({ query: { ...route.query, tab } })
  }

  function openRevisionReview(revision) {
    revisionUnderReview.value = revision
  }

  function closeRevisionReview() {
    revisionUnderReview.value = null
  }

  onMounted(() => {
    revisions.load(1)
    accessRequests.load(1)
  })

  return {
    tabs,
    activeTab,
    revisions,
    accessRequests,
    revisionUnderReview,
    selectTab,
    openRevisionReview,
    closeRevisionReview,
  }
}
