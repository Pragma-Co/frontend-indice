import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchDocuments } from '@/api/documents.js'
import { buildDocumentQueryKey } from '@/utils/searchParams.js'

export const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50]
export const DEFAULT_ITEMS_PER_PAGE = 20

const LOAD_ERROR_MESSAGE = 'Não foi possível carregar os documentos.'

function toPositiveInteger(value) {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : null
}

export function normalizeDocument(document) {
  return {
    ...document,
    type: document.type?.name ?? document.type?.code ?? 'Não informado',
    revision: document.revision?.label ?? '-',
    status: document.status ?? null,
    updatedAt: document.updated_at,
    updatedBy: document.updated_by ?? 'sistema',
    action: document.action ?? 'view-details',
  }
}

export function useDocumentList() {
  const route = useRoute()
  const router = useRouter()

  const documents = ref([])
  const totalItems = ref(0)
  const totalPages = ref(1)
  const loading = ref(true)
  const error = ref('')
  const skipFirstLoad = ref(false)

  const currentPage = computed(() => toPositiveInteger(route.query.page) ?? 1)
  const itemsPerPage = computed(() => {
    const requested = toPositiveInteger(route.query.page_size)
    return ITEMS_PER_PAGE_OPTIONS.includes(requested) ? requested : DEFAULT_ITEMS_PER_PAGE
  })

  function replaceQuery(changes) {
    return router.replace({ query: { ...route.query, ...changes } })
  }

  async function loadDocuments() {
    loading.value = true
    error.value = ''

    try {
      const response = await fetchDocuments({
        ...route.query,
        page: currentPage.value,
        page_size: itemsPerPage.value,
      })
      const results = response.results ?? []
      totalItems.value = response.count ?? 0
      totalPages.value = Math.max(1, response.total_pages ?? 1)

      const pastTheEnd =
        results.length === 0 && totalItems.value > 0 && currentPage.value > totalPages.value
      if (pastTheEnd) {
        await replaceQuery({ page: totalPages.value })
        return
      }

      documents.value = results.map(normalizeDocument)
    } catch {
      documents.value = []
      totalItems.value = 0
      totalPages.value = 1
      error.value = LOAD_ERROR_MESSAGE
    } finally {
      loading.value = false
    }
  }

  function goToPage(page) {
    const target = Math.min(Math.max(1, page), totalPages.value)
    if (target === currentPage.value) return
    replaceQuery({ page: target })
  }

  function setItemsPerPage(value) {
    replaceQuery({ page_size: value, page: 1 })
  }

  function goToUpload() {
    router.push({ name: 'document-upload' })
  }

  function goToDocumentDetails(document) {
    router.push({ name: 'document-details', params: { documentId: document.id } })
  }

  function handleDocumentAction({ document, action }) {
    if (action === 'new-revision' || action === 'continue-editing') {
      goToUpload()
    } else if (action === 'view-details') {
      goToDocumentDetails(document)
    }
  }

  function setSkipFirstLoad(value) {
    skipFirstLoad.value = value
  }

  onMounted(() => {
    if (!skipFirstLoad.value) {
      loadDocuments()
    }
  })
  watch(() => buildDocumentQueryKey(route.query), loadDocuments)

  return {
    documents,
    totalItems,
    totalPages,
    currentPage,
    itemsPerPage,
    loading,
    error,
    loadDocuments,
    goToPage,
    setItemsPerPage,
    setSkipFirstLoad,
    goToUpload,
    goToDocumentDetails,
    handleDocumentAction,
  }
}
