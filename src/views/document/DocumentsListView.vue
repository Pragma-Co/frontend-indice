<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { X } from '@lucide/vue'
import Button from '@/components/common/Button.vue'
import DocumentsTable from '@/views/document/components/DocumentsTable.vue'
import Pagination from '@/components/common/Pagination.vue'
import PageLayout from '@/components/layout/PageLayout.vue'
import {
  ITEMS_PER_PAGE_OPTIONS,
  useDocumentList,
} from '@/views/document/composables/useDocumentList.js'
import { useAuthStore } from '@/stores/authStore.js'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const showRevisionInfo = ref(false)

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
  goToUpload,
  handleDocumentAction,
  loadDocuments,
  setSkipFirstLoad,
} = useDocumentList()

setSkipFirstLoad(true)

onMounted(() => {
  if (authStore.currentUser?.id && !route.query.created_by_id) {
    router
      .replace({
        query: {
          ...route.query,
          created_by_id: authStore.currentUser.id,
        },
      })
      .then(() => {
        loadDocuments()
      })
  } else if (route.query.created_by_id) {
    loadDocuments()
  }
})
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

    <aside class="info-banner">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3.5A5.5 5.5 0 0 0 8.6 13a3.2 3.2 0 0 1 1.2 2.4V16h4.4v-.6c0-.9.45-1.75 1.2-2.4A5.5 5.5 0 0 0 12 3.5Z"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linejoin="round"
        />
        <path
          d="M10 19h4M10.5 21h3"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
        />
      </svg>
      <p class="info-text">
        <strong>Dica:</strong> Para editar um documento vigente, crie uma nova revisão. A revisão
        atual será mantida apenas para histórico.
      </p>
      <button type="button" class="info-link" @click="showRevisionInfo = true">
        Saiba mais sobre revisões
      </button>
    </aside>

    <Teleport to="body">
      <div v-if="showRevisionInfo" class="revision-overlay" @click.self="showRevisionInfo = false">
        <div
          class="revision-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="revision-rules-title"
          tabindex="-1"
          @keydown.esc.stop="showRevisionInfo = false"
        >
          <header class="revision-header">
            <div>
              <p class="revision-eyebrow">Documentos</p>
              <h2 id="revision-rules-title">Regras de revisão</h2>
            </div>
            <button
              type="button"
              class="revision-close"
              aria-label="Fechar regras de revisão"
              @click="showRevisionInfo = false"
            >
              <X :size="18" aria-hidden="true" />
            </button>
          </header>

          <div class="revision-body">
            <p class="revision-intro">
              As revisões ajudam a manter o documento organizado e seguro, preservando o histórico
              da versão atual e indicando quando o conteúdo precisa ser reavaliado.
            </p>

            <ul class="revision-list">
              <li>As revisões servem como um histórico para o documento.</li>
              <li>
                Os documentos de revisões anteriores ficam disponíveis para visualização na tela de
                detalhes do documento.
              </li>
              <li>Somente o colaborador pode solicitar novas revisões.</li>
              <li>Somente os gestores das áreas podem aprovar ou recusar as revisões.</li>
              <li>Caso recusado, a imagem do documento não ficará visível no histórico.</li>
              <li>
                Após solicitada uma revisão, o colaborador deve aguardar uma resposta do lado do
                gestor.
              </li>
            </ul>
          </div>

          <footer class="revision-footer">
            <Button variant="primary" @click="showRevisionInfo = false">Entendi</Button>
          </footer>
        </div>
      </div>
    </Teleport>
  </PageLayout>
</template>

<style scoped>
.documents-table,
.status-message {
  height: calc(100vh - 400px);
}

.status-message {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}
.error-message {
  color: var(--color-warning);
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
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  font: inherit;
}

.info-link:hover {
  text-decoration: underline;
}

.revision-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.55);
  padding: 1.5rem;
}

.revision-dialog {
  width: min(42rem, 100%);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.2);
  overflow: hidden;
}

.revision-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.revision-eyebrow {
  margin: 0 0 0.25rem;
  color: var(--color-primary);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.revision-header h2 {
  margin: 0;
  font-size: 1.2rem;
}

.revision-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.revision-close:focus-visible,
.info-link:focus-visible,
.revision-dialog:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.revision-body {
  padding: 1.25rem 1.5rem;
}

.revision-intro {
  margin: 0 0 1rem;
  color: var(--color-text-muted);
  line-height: 1.6;
}

.revision-list {
  margin: 0;
  padding-left: 1.1rem;
  color: var(--color-text);
  display: grid;
  gap: 0.7rem;
  line-height: 1.6;
}

.revision-list li::marker {
  color: var(--color-primary);
}

.revision-footer {
  display: flex;
  justify-content: flex-end;
  padding: 1rem 1.5rem 1.5rem;
}

@media (max-width: 640px) {
  .revision-header,
  .revision-body,
  .revision-footer {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}
</style>
