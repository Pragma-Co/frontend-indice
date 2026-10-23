<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchDocuments, fetchSimpleFilters, searchDocuments } from '@/api/documents.js'
import Pagination from '@/components/common/Pagination.vue'
import PageLayout from '@/components/layout/PageLayout.vue'
import ResultsEmptyState from '@/views/document/components/ResultsEmptyState.vue'
import ResultsFilterPanel from '@/views/document/components/ResultsFilterPanel.vue'
import ResultsSearchBar from '@/views/document/components/ResultsSearchBar.vue'
import ResultsSkeleton from '@/views/document/components/ResultsSkeleton.vue'
import SearchResultCard from '@/views/document/components/SearchResultCard.vue'
import {
  countActiveFilters,
  emptyFilters,
  filtersFromQuery,
  filtersToQuery,
  keepPageSize,
} from '@/utils/resultFilters.js'
import { extractSearchTerms } from '@/utils/searchHighlight.js'
import {
  ITEMS_PER_PAGE_OPTIONS,
  useDocumentList,
} from '@/views/document/composables/useDocumentList.js'

const route = useRoute()
const router = useRouter()

function fetchResultsPage(query) {
  return String(query.q ?? '').trim() ? searchDocuments(query) : fetchDocuments(query)
}

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
} = useDocumentList({ fetchPage: fetchResultsPage })

const filters = computed(() => filtersFromQuery(route.query))
const hasFilters = computed(() => countActiveFilters(filters.value) > 0)
const searchTerms = computed(() => extractSearchTerms(filters.value.q))
const resultsSummary = computed(() => {
  const label = totalItems.value === 1 ? 'resultado' : 'resultados'
  return `${totalItems.value} ${label}`
})
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
        <ResultsSkeleton v-if="loading" class="results-scroll" />
        <p v-else-if="error" class="status-message error-message">{{ error }}</p>
        <ResultsEmptyState
          v-else-if="showEmptyState"
          :term="filters.q"
          :has-filters="hasFilters"
          @clear="clearFilters"
          @search="searchAgain"
        />
        <template v-else>
          <p class="results-summary">
            {{ resultsSummary }}
            <template v-if="filters.q">
              para <strong class="results-term">“{{ filters.q }}”</strong>
            </template>
          </p>
          <div class="results-scroll">
            <SearchResultCard
              v-for="document in documents"
              :key="document.id"
              :document="document"
              :terms="searchTerms"
              @action="handleDocumentAction"
            />
          </div>
        </template>

        <Pagination
          v-if="documents.length && !loading"
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
  max-height: calc(100vh - 252px);
}

.results-main {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  margin-top: 0;
  padding: 1rem;
}

.results-scroll {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
  overflow: auto;
  padding-right: 0.25rem;
}

.results-summary {
  flex-shrink: 0;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.results-term {
  color: var(--color-text);
  overflow-wrap: anywhere;
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
}

@media (max-width: 960px) {
  .results-page {
    height: auto;
  }

  .results-layout {
    grid-template-columns: 1fr;
  }

  .results-scroll {
    max-height: 60vh;
  }
}
</style>
