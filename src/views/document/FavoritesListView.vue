<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import DocumentsTable from '@/views/document/components/DocumentsTable.vue'
import Pagination from '@/components/common/Pagination.vue'
import PageLayout from '@/components/layout/PageLayout.vue'
import {
  DEFAULT_ITEMS_PER_PAGE,
  ITEMS_PER_PAGE_OPTIONS,
} from '@/views/document/composables/useDocumentList.js'
import { useFavoriteStore } from '@/stores/favoriteStore.js'

const router = useRouter()
const favorites = useFavoriteStore()
favorites.load()

const currentPage = ref(1)
const itemsPerPage = ref(DEFAULT_ITEMS_PER_PAGE)

const totalItems = computed(() => favorites.items.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / itemsPerPage.value)))
const documents = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return favorites.items.slice(start, start + itemsPerPage.value)
})

watch(totalPages, (pages) => {
  if (currentPage.value > pages) currentPage.value = pages
})

function goToPage(page) {
  currentPage.value = Math.min(Math.max(1, page), totalPages.value)
}

function setItemsPerPage(value) {
  itemsPerPage.value = value
  currentPage.value = 1
}

function handleDocumentAction({ document, action }) {
  if (action === 'toggle-favorite') {
    favorites.toggle(document)
  } else if (action === 'new-revision') {
    router.push({ name: 'document-new-revision', params: { documentId: document.id } })
  } else if (action === 'view-details') {
    router.push({ name: 'document-details', params: { documentId: document.id } })
  }
}
</script>

<template>
  <PageLayout wide title="Favoritos" subtitle="Documentos que você marcou como favoritos.">
    <section class="card">
      <p v-if="!documents.length" class="status-message">
        Nenhum documento favoritado. Use a estrela nos resultados de busca para favoritar.
      </p>
      <DocumentsTable
        v-else
        class="documents-table"
        favoritable
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
