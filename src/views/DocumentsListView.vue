<script setup>
import { useRouter } from 'vue-router'
import Button from '../components/common/Button.vue'
import DocumentsTable from '../components/common/DocumentsTable.vue'
import Pagination from '../components/common/Pagination.vue'
import PageLayout from '../components/layout/PageLayout.vue'
import { useDocuments, ITEMS_PER_PAGE_OPTIONS } from '../composables/useDocuments'

const router = useRouter()

const { documents, paginatedDocuments, currentPage, itemsPerPage, totalPages, goToPage, setItemsPerPage } =
  useDocuments()

function goToUpload() {
  router.push({ name: 'document-upload' })
}

// "Ver revisão" has no destination yet: the revision detail view isn't built.
function handleDocumentAction({ action }) {
  if (action === 'new-revision' || action === 'continue-editing') {
    goToUpload()
  }
}
</script>

<template>
  <PageLayout
    wide
    title="Documentos"
    subtitle="Visualize e gerencie os documentos que você fez upload no sistema."
  >
    <template #actions>
      <Button variant="primary" @click="goToUpload">+ Novo documento</Button>
    </template>

    <section class="card">
      <h2 class="section-title">Meus documentos</h2>

      <DocumentsTable :documents="paginatedDocuments" @action="handleDocumentAction" />

      <Pagination
        :current-page="currentPage"
        :total-pages="totalPages"
        :total-items="documents.length"
        :items-per-page="itemsPerPage"
        :items-per-page-options="ITEMS_PER_PAGE_OPTIONS"
        @change-page="goToPage"
        @change-items-per-page="setItemsPerPage"
      />
    </section>

    <aside class="info-banner">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3.5A5.5 5.5 0 0 0 8.6 13a3.2 3.2 0 0 1 1.2 2.4V16h4.4v-.6c0-.9.45-1.75 1.2-2.4A5.5 5.5 0 0 0 12 3.5Z"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linejoin="round"
        />
        <path d="M10 19h4M10.5 21h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
      </svg>
      <p class="info-text">
        <strong>Dica:</strong> Para editar um documento vigente, crie uma nova revisão. A revisão atual será mantida
        apenas para histórico.
      </p>
      <a href="#" class="info-link">Saiba mais sobre revisões</a>
    </aside>
  </PageLayout>
</template>

<style scoped>
.section-title {
  font-size: 1.1rem;
  margin-bottom: 1rem;
}

.info-banner {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  background: var(--color-info-bg);
  border: 1px solid var(--color-info-border);
  border-radius: var(--radius-md);
  color: var(--color-info);
  padding: 0.85rem 1.25rem;
  margin-top: 1.5rem;
  font-size: 0.85rem;
}

.info-text {
  flex: 1;
  color: var(--color-text);
}

.info-link {
  color: var(--color-info);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

.info-link:hover {
  text-decoration: underline;
}
</style>
