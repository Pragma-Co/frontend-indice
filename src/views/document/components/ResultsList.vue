<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchDocuments } from '@/api/documents.js'
import DocumentsTable from '@/views/document/components/DocumentsTable.vue'
import Pagination from '@/components/common/Pagination.vue'
import PageLayout from '@/components/layout/PageLayout.vue'
import { buildDocumentQueryKey } from '@/utils/searchParams.js'

const route = useRoute()
const router = useRouter()
const documents = ref([])
const loading = ref(true)
const error = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(20)
const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50]

const totalPages = () => Math.max(1, Math.ceil(documents.value.length / itemsPerPage.value))
const paginatedDocuments = () => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return documents.value.slice(start, start + itemsPerPage.value)
}

function normalizeDocument(document) {
  return {
    ...document,
    type: document.type?.name ?? document.type?.code ?? 'Não informado',
    revision: document.revision ?? '-',
    status: document.status ?? 'vigente',
    updatedAt: document.updated_at,
    updatedBy: document.updated_by ?? 'sistema',
    action: document.action ?? 'view-details',
  }
}

async function loadDocuments() {
  loading.value = true
  error.value = ''
  currentPage.value = 1

  try {
    const response = await fetchDocuments(route.query)
    documents.value = response.documents.map(normalizeDocument)
  } catch {
    documents.value = []
    error.value = 'Não foi possível carregar os documentos.'
  } finally {
    loading.value = false
  }
}

function goToUpload() {
  router.push({ name: 'document-upload' })
}

function goToPage(page) {
  currentPage.value = Math.min(Math.max(1, page), totalPages())
}

function setItemsPerPage(value) {
  itemsPerPage.value = value
  currentPage.value = 1
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

onMounted(loadDocuments)
watch(() => buildDocumentQueryKey(route.query), loadDocuments)
</script>

<template>
  <PageLayout wide title="Resultados" subtitle="Visualize os resultados da sua busca.">
    <section class="card">
      <h2 class="section-title">Resultados</h2>

      <p v-if="loading" class="status-message">Carregando documentos...</p>
      <p v-else-if="error" class="status-message error-message">{{ error }}</p>
      <p v-else-if="!documents.length" class="status-message">Nenhum documento encontrado.</p>
      <DocumentsTable v-else :documents="paginatedDocuments()" @action="handleDocumentAction" />

      <Pagination
        :current-page="currentPage"
        :total-pages="totalPages()"
        :total-items="documents.length"
        :items-per-page="itemsPerPage"
        :items-per-page-options="ITEMS_PER_PAGE_OPTIONS"
        @change-page="goToPage"
        @change-items-per-page="setItemsPerPage"
      />
    </section>
  </PageLayout>
</template>

<style scoped>
.status-message {
  margin: 1.5rem 0;
  color: var(--color-text-muted);
}
.error-message {
  color: var(--color-warning);
}

.section-title {
  font-size: 1.1rem;
  margin-bottom: 1rem;
}
</style>
