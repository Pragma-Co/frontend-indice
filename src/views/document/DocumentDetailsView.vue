<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { fetchDocumentDetail, requestDocumentAccess } from '@/api/documents.js'
import { useAuthStore } from '@/stores/authStore.js'
import { statusBadgeFor } from '@/utils/documentStatus.js'
import Breadcrumbs from '@/components/common/Breadcrumbs.vue'
import Button from '@/components/common/Button.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'

const route = useRoute()
const authStore = useAuthStore()
const document = ref(null)
const loading = ref(true)
const error = ref('')
const notFound = ref(false)
const requestingAccess = ref(false)

const canRequestAccess = computed(() => document.value?.access_status !== 'APPROVED')

async function loadDocument() {
  loading.value = true
  error.value = ''
  notFound.value = false
  try {
    document.value = await fetchDocumentDetail(route.params.documentId, authStore.user?.id)
  } catch (err) {
    if (err.status === 404) {
      notFound.value = true
    } else {
      error.value = 'Não foi possível carregar o documento.'
    }
  } finally {
    loading.value = false
  }
}

async function handleRequestAccess() {
  requestingAccess.value = true
  try {
    await requestDocumentAccess(route.params.documentId, authStore.currentUser?.id)
    await loadDocument()
  } catch {
    error.value = 'Não foi possível solicitar acesso.'
  } finally {
    requestingAccess.value = false
  }
}

onMounted(loadDocument)
</script>

<template>
  <main class="details-page">
    <div class="details-shell">
      <Breadcrumbs :title="document?.title ?? 'Documento'" />

      <p v-if="loading" class="status-message">Carregando documento...</p>
      <p v-else-if="notFound" class="status-message error-message">Documento não encontrado.</p>
      <p v-else-if="error" class="status-message error-message">{{ error }}</p>

      <template v-else-if="document">
        <div class="details-grid">
          <section class="preview-panel" aria-label="Visualização do documento">
            <div class="preview-placeholder">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5Z"
                  stroke="currentColor"
                  stroke-width="1.3"
                  stroke-linejoin="round"
                />
                <path
                  d="M14 3.5V7a1 1 0 0 0 1 1h3.5M9 12h6M9 15h6"
                  stroke="currentColor"
                  stroke-width="1.3"
                  stroke-linecap="round"
                />
              </svg>
              <p>Visualização do documento</p>
              <span>{{ document.code }}</span>
            </div>
            <div class="preview-footer">
              <button type="button">Página anterior</button>
              <strong>Página 1</strong>
              <button type="button">Próxima página</button>
            </div>
          </section>

          <aside class="document-card">
            <header class="document-card-header">
              <StatusBadge
                v-if="statusBadgeFor(document.access_status)"
                :status="statusBadgeFor(document.access_status)"
              />
              <span>Ref: {{ document.code }}</span>
            </header>

            <h1>{{ document.title }}</h1>

            <dl class="metadata-list">
              <div>
                <dt>Código</dt>
                <dd>{{ document.code }}</dd>
              </div>
              <div>
                <dt>Tipo</dt>
                <dd>{{ document.type.name }}</dd>
              </div>
              <div>
                <dt>Disciplina</dt>
                <dd>{{ document.discipline.name }}</dd>
              </div>
              <div>
                <dt>Revisão atual</dt>
                <dd>{{ document.revision ? `REV${document.revision.version}` : '-' }}</dd>
              </div>
              <div>
                <dt>Data de Emissão</dt>
                <dd>{{ document.revision?.issue_date ?? '-' }}</dd>
              </div>
              <div>
                <dt>Responsável</dt>
                <dd>{{ document.responsible.name }}</dd>
              </div>
            </dl>

            <Button
              v-if="canRequestAccess"
              class="request-access-button"
              :disabled="requestingAccess"
              @click="handleRequestAccess"
            >
              Solicitar Acesso
            </Button>

            <div v-if="document.description" class="description-block">
              <h2>Descrição</h2>
              <p>{{ document.description }}</p>
            </div>

            <div v-if="document.areas?.length" class="tag-block">
              <h2>Tags relacionadas</h2>
              <div class="tags">
                <span v-for="area in document.areas" :key="area.acronym">{{ area.acronym }}</span>
              </div>
            </div>

            <div class="revision-block">
              <h2>Histórico de versões</h2>
              <p v-if="!document.versions?.length" class="tag-block-empty">
                Nenhuma versão registrada.
              </p>
              <ul v-else class="revision-list">
                <li
                  v-for="(version, index) in document.versions"
                  :key="version.id"
                  :class="{ 'is-current': index === 0 }"
                >
                  <div class="revision-header">
                    <strong>REV{{ version.version }}</strong>
                    <span v-if="index === 0" class="current-tag">Versão atual</span>
                  </div>
                  <dl class="revision-meta">
                    <div>
                      <dt>Data de emissão</dt>
                      <dd>{{ version.issue_date ?? '-' }}</dd>
                    </div>
                    <div>
                      <dt>Autor</dt>
                      <dd>{{ version.author?.name ?? '-' }}</dd>
                    </div>
                    <div v-if="version.change_description">
                      <dt>Descrição da mudança</dt>
                      <dd>{{ version.change_description }}</dd>
                    </div>
                  </dl>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </template>
    </div>
  </main>
</template>

<style scoped>
.details-page {
  min-height: calc(100vh - 56px);
  padding: 1.25rem 2rem 1.25rem;
  background: var(--color-background);
}

.details-shell {
  width: 100%;
}

.details-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(22rem, 31rem);
  gap: 1.25rem;
  margin-top: 1rem;
}

.preview-panel,
.document-card {
  min-width: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  height: calc(100vh - 132px);
}

.preview-panel {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1rem;
}

.preview-placeholder {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.6rem;
  min-height: 24rem;
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
  text-align: center;
}

.preview-placeholder svg {
  color: var(--color-text-muted);
}

.preview-placeholder p {
  font-size: 0.9rem;
}

.preview-placeholder span {
  font-size: 0.75rem;
}

.preview-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 1rem;
  color: var(--color-text-muted);
  font-size: 0.78rem;
}

.preview-footer button {
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
}

.document-card {
  align-self: start;
  padding: 1.25rem;
  overflow: auto;
}

.document-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  color: var(--color-text-muted);
  font-size: 0.72rem;
}

.document-card h1 {
  margin: 1rem 0 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
  font-size: 1.05rem;
  line-height: 1.35;
}

.request-access-button {
  width: 100%;
  margin-top: 1rem;
}

.request-access-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.metadata-list {
  display: grid;
  gap: 0.8rem;
}

.metadata-list div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.8rem;
}

dt {
  color: var(--color-text-muted);
}

dd {
  text-align: right;
  font-weight: 600;
}

.description-block,
.tag-block,
.revision-block {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--color-border);
}

.tag-block-empty {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.document-card h2 {
  margin-bottom: 0.65rem;
  font-size: 0.72rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.description-block p,
.revision-block p {
  color: var(--color-text-muted);
  font-size: 0.8rem;
  line-height: 1.5;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.tags span {
  padding: 0.25rem 0.45rem;
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text-muted);
  font-size: 0.7rem;
}

.status-message {
  margin-top: 2rem;
  color: var(--color-text-muted);
}

.error-message {
  color: var(--color-warning);
}

.revision-list {
  display: grid;
  gap: 0.75rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

.revision-list li {
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}

.revision-list li.is-current {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface-muted));
}

.revision-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
  font-size: 0.8rem;
  color: var(--color-primary);
}

.current-tag {
  margin-left: auto;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  background: var(--color-primary);
  color: var(--color-surface);
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.revision-meta {
  display: grid;
  gap: 0.3rem;
  font-size: 0.75rem;
}

.revision-meta div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

@media (max-width: 900px) {
  .details-page {
    padding: 1rem;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }

  .preview-panel {
    min-height: 32rem;
  }
}
</style>
