<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchSimpleFilters } from '@/api/documents.js'
import Pagination from '@/components/common/Pagination.vue'
import PageLayout from '@/components/layout/PageLayout.vue'
import DocumentsTable from '@/views/document/components/DocumentsTable.vue'
import ResultsEmptyState from '@/views/document/components/ResultsEmptyState.vue'
import ResultsFilterPanel from '@/views/document/components/ResultsFilterPanel.vue'
import ResultsSearchBar from '@/views/document/components/ResultsSearchBar.vue'
import {
  countActiveFilters,
  emptyFilters,
  filtersFromQuery,
  filtersToQuery,
  keepPageSize,
} from '@/utils/resultFilters.js'
import {
  ITEMS_PER_PAGE_OPTIONS,
  useDocumentList,
} from '@/views/document/composables/useDocumentList.js'

const route = useRoute()
const router = useRouter()

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

const filters = computed(() => filtersFromQuery(route.query))
const hasFilters = computed(() => Boolean(filters.value.q) || countActiveFilters(filters.value) > 0)
const showEmptyState = computed(
  () => !loading.value && !error.value && documents.value.length === 0,
)

const options = ref({})
const optionsLoading = ref(true)

function applyFilters(nextFilters) {
  router.replace({ query: { ...filtersToQuery(nextFilters), ...keepPageSize(route.query) } })
}

function clearFilters() {
  applyFilters({ ...emptyFilters(), q: filters.value.q })
}

function searchAgain(term) {
  applyFilters({ ...filters.value, q: term })
}

onMounted(async () => {
  try {
    options.value = await fetchSimpleFilters()
  } catch {
    options.value = {}
  } finally {
    optionsLoading.value = false
  }
})
</script>

<template>
  <PageLayout
    wide
    class="results-page"
    title="Resultados"
    subtitle="Refine a busca pelos filtros ao lado."
  >
    <ResultsSearchBar :term="filters.q" @search="searchAgain" />

    <div class="results-layout">
      <ResultsFilterPanel
        class="results-content"
        :filters="filters"
        :options="options"
        :loading="optionsLoading"
        @apply="applyFilters"
        @clear="clearFilters"
      />

      <section class="card results-main results-content" aria-live="polite">
        <p v-if="loading" class="status-message">Carregando documentos...</p>
        <p v-else-if="error" class="status-message error-message">{{ error }}</p>
        <ResultsEmptyState
          v-else-if="showEmptyState"
          :has-filters="hasFilters"
          @clear="clearFilters"
        />
        <DocumentsTable
          v-else
          class="documents-table"
          :documents="documents"
          @action="handleDocumentAction"
        />

        <Pagination
          v-if="documents.length"
          :current-page="currentPage"
          :total-pages="totalPages"
          :total-items="totalItems"
          :items-per-page="itemsPerPage"
          :items-per-page-options="ITEMS_PER_PAGE_OPTIONS"
          @change-page="goToPage"
          @change-items-per-page="setItemsPerPage"
        />
      </section>
    </div>
  </PageLayout>
</template>

<style scoped>
.results-page {
  display: flex;
  flex-direction: column;
  max-width: 1440px;
  padding: 1.5rem 1.5rem 1.25rem;
}

.results-layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 1rem;
  flex: 1;
  margin-top: 0.75rem;
}

.results-content {
  max-height: calc(100vh - 250px);
}

.results-main {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  margin-top: 0;
  padding: 1rem;
}

.results-main :deep(.table-scroll) {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.results-main :deep(.documents-table th) {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--color-surface);
  white-space: normal;
}

.results-main :deep(.documents-table th),
.results-main :deep(.documents-table td) {
  padding: 0.55rem 0.5rem;
}

.results-main :deep(.cell-title) {
  min-width: 12.5rem;
}

.results-main :deep(.cell-type) {
  min-width: 8rem;
}

.results-main :deep(.pagination) {
  flex-shrink: 0;
}

.status-message {
  margin: 1.5rem 0;
  color: var(--color-text-muted);
}

.error-message {
  color: var(--color-warning);
}

@media (max-width: 1320px) {
  .results-page {
    padding: 1.5rem 1rem 1.25rem;
  }

  .results-layout {
    grid-template-columns: 216px minmax(0, 1fr);
  }

  .results-main :deep(.documents-table th),
  .results-main :deep(.documents-table td) {
    padding: 0.55rem 0.45rem;
  }

  .results-main :deep(.cell-title) {
    min-width: 10.5rem;
  }
}

@media (max-width: 960px) {
  .results-page {
    height: auto;
  }

  .results-layout {
    grid-template-columns: 1fr;
  }

  .results-main :deep(.table-scroll) {
    max-height: 60vh;
  }
}
</style>
