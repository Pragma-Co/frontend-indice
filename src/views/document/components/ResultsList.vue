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

const headline = computed(() => {
  const count = totalItems.value
  const label = count === 1 ? 'resultado' : 'resultados'
  return filters.value.q ? `${count} ${label} para "${filters.value.q}"` : `${count} ${label}`
})

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
      <aside class="results-sidebar">
        <ResultsFilterPanel
          :filters="filters"
          :options="options"
          :loading="optionsLoading"
          @apply="applyFilters"
          @clear="clearFilters"
        />
      </aside>

      <section class="card results-main" aria-live="polite">
        <h2 class="results-headline" data-testid="results-headline">{{ headline }}</h2>

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
  max-width: 1440px;
  padding: 2.5rem 1.5rem;
}

.results-layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
  margin-top: 1rem;
}

.results-sidebar {
  position: sticky;
  top: 72px;
}

.results-main {
  margin-top: 0;
  min-width: 0;
  padding: 1rem;
}

.results-main :deep(.documents-table th),
.results-main :deep(.documents-table td) {
  padding: 0.7rem 0.5rem;
}

.results-main :deep(.documents-table th) {
  white-space: normal;
}

.results-main :deep(.cell-title) {
  min-width: 12.5rem;
}

.results-main :deep(.cell-type) {
  min-width: 8rem;
}

.results-headline {
  font-size: 1rem;
  margin-bottom: 1rem;
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
    padding: 2.5rem 1rem;
  }

  .results-layout {
    grid-template-columns: 216px minmax(0, 1fr);
  }

  .results-main :deep(.documents-table th),
  .results-main :deep(.documents-table td) {
    padding: 0.7rem 0.45rem;
  }

  .results-main :deep(.cell-title) {
    min-width: 10.5rem;
  }
}

@media (max-width: 960px) {
  .results-layout {
    grid-template-columns: 1fr;
  }

  .results-sidebar {
    position: static;
  }
}
</style>
