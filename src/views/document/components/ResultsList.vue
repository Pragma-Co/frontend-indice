<script setup>
import DocumentsTable from '@/views/document/components/DocumentsTable.vue'
import Pagination from '@/components/common/Pagination.vue'
import PageLayout from '@/components/layout/PageLayout.vue'
import {
  ITEMS_PER_PAGE_OPTIONS,
  useDocumentList,
} from '@/views/document/composables/useDocumentList.js'

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
} = useDocumentList()
</script>

<template>
  <PageLayout wide title="Resultados" subtitle="Visualize os resultados da sua busca.">
    <section class="card">
      <h2 class="section-title">Resultados</h2>

      <p v-if="loading" class="status-message">Carregando documentos...</p>
      <p v-else-if="error" class="status-message error-message">{{ error }}</p>
      <p v-else-if="!documents.length" class="status-message">Nenhum documento encontrado.</p>
      <DocumentsTable
        v-else
        class="documents-table"
        :documents="documents"
        @action="handleDocumentAction"
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
.documents-table {
  height: calc(100vh - 366px);
}

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
