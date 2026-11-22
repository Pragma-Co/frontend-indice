<script setup>
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notificationStore.js'
import FavoritesEmptyState from '@/views/document/components/FavoritesEmptyState.vue'
import DocumentsTable from '@/views/document/components/DocumentsTable.vue'
import Pagination from '@/components/common/Pagination.vue'
import PageLayout from '@/components/layout/PageLayout.vue'
import { fetchFavoriteDocuments } from '@/api/documents.js'
import {
  ITEMS_PER_PAGE_OPTIONS,
  useDocumentList,
} from '@/views/document/composables/useDocumentList.js'

const router = useRouter()
const notifications = useNotificationStore()

const {
  documents,
  totalItems,
  totalPages,
  currentPage,
  itemsPerPage,
  loading,
  error,
  goToPage,
  setItemsPerPage,
  handleDocumentAction,
  loadDocuments,
} = useDocumentList({ fetchPage: fetchFavoriteDocuments })

watch(error, (message) => {
  if (message) notifications.error(message)
})

async function handleAction(event) {
  const done = await handleDocumentAction(event)
  if (event.action === 'toggle-favorite' && done) loadDocuments()
}
</script>

<template>
  <PageLayout wide title="Favoritos" subtitle="Documentos que você marcou como favoritos.">
    <section class="card">
      <p v-if="loading" class="status-message">Carregando favoritos...</p>
      <FavoritesEmptyState
        v-else-if="!documents.length"
        class="status-message"
        @explore="router.push({ name: 'results' })"
      />
      <DocumentsTable
        v-else
        class="documents-table"
        favoritable
        :documents="documents"
        @action="handleAction"
      />

      <Pagination
        :current-page="currentPage"
        :total-pages="totalPages"
        :total-items="totalItems"
        :items-per-page="itemsPerPage"
        :items-per-page-options="ITEMS_PER_PAGE_OPTIONS"
        @change-page="goToPage"
        @change-items-per-page="setItemsPerPage"
      />
    </section>
  </PageLayout>
</template>

<style scoped>
.documents-table,
.status-message {
  height: calc(100vh - 330px);
}

.status-message {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}
</style>
