<script setup>
import { onMounted, ref, computed, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { renderAsync } from 'docx-preview'
import { fetchDocumentDetail, requestDocumentAccess } from '@/api/documents.js'
import { useAuthStore } from '@/stores/authStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { statusBadgeFor } from '@/utils/documentStatus.js'
import { formatDate } from '@/utils/formatters.js'
import Breadcrumbs from '@/components/common/Breadcrumbs.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import DocumentAccessOverlay from '@/views/document/components/DocumentAccessOverlay.vue'

const route = useRoute()
const authStore = useAuthStore()
const notifications = useNotificationStore()
const document = ref(null)
const loading = ref(true)
const error = ref('')
const notFound = ref(false)
const requestingAccess = ref(false)
const accessRequested = ref(false)
const requestError = ref('')

const docxContainer = ref(null)
const docxLoading = ref(false)

const currentFileIndex = ref(0)

const currentRevision = computed(() => document.value?.revision ?? null)

const allFiles = computed(() => currentRevision.value?.files ?? [])

const currentFile = computed(() => {
  const files = allFiles.value
  if (!files.length) return null
  const idx = Math.min(currentFileIndex.value, files.length - 1)
  return files[idx] ?? null
})

const totalFiles = computed(() => allFiles.value.length)

const currentUserId = computed(() => authStore.currentUser?.id ?? null)

const isResponsible = computed(
  () => currentUserId.value != null && document.value?.responsible?.id === currentUserId.value,
)

const hasAccess = computed(
  () => document.value?.access_status === 'APPROVED' || isResponsible.value,
)

const accessRejected = computed(() => document.value?.access_request?.status === 'REJECTED')

const canPreview = computed(() => !!currentFile.value && hasAccess.value)

const isPdf = computed(() => {
  if (!currentFile.value) return false
  if (currentFile.value.mime_type === 'application/pdf') return true
  return currentFile.value.original_name?.toLowerCase().endsWith('.pdf') ?? false
})

const isImage = computed(() => {
  if (!currentFile.value) return false
  if (currentFile.value.mime_type?.startsWith('image/')) return true
  const name = currentFile.value.original_name?.toLowerCase() ?? ''
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/.test(name)
})

const isDocx = computed(() => {
  if (!currentFile.value) return false
  const name = currentFile.value.original_name?.toLowerCase() ?? ''
  return name.endsWith('.docx') || name.endsWith('.doc')
})

function withUser(url) {
  if (!url) return null
  if (url.includes('user_id=')) return url
  if (!currentUserId.value) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}user_id=${currentUserId.value}`
}

const fileUrl = computed(() => {
  if (!currentFile.value) return null
  return withUser(currentFile.value.view_url)
})

function prevFile() {
  if (currentFileIndex.value > 0) currentFileIndex.value--
}

function nextFile() {
  if (currentFileIndex.value < totalFiles.value - 1) currentFileIndex.value++
}

async function loadDocument() {
  loading.value = true
  error.value = ''
  notFound.value = false
  try {
    document.value = await fetchDocumentDetail(route.params.documentId, currentUserId.value)
    currentFileIndex.value = 0
    accessRequested.value = document.value.access_request?.status === 'PENDING'
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
  requestError.value = ''
  try {
    const result = await requestDocumentAccess(route.params.documentId, currentUserId.value)
    if (result?.status === 'REJECTED') {
      await loadDocument()
      return
    }
    accessRequested.value = true
    notifications.success('Solicitação enviada. O responsável pelo documento foi notificado.')
  } catch (err) {
    if (err?.status === 409) {
      await loadDocument()
      return
    }
    requestError.value = 'Não foi possível enviar a solicitação. Tente novamente.'
    notifications.error(requestError.value)
  } finally {
    requestingAccess.value = false
  }
}

async function renderDocx() {
  if (!docxContainer.value) return
  if (!canPreview.value || !isDocx.value || !fileUrl.value) return

  docxLoading.value = true
  docxContainer.value.innerHTML = ''

  try {
    const res = await fetch(fileUrl.value, { credentials: 'include' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()

    await renderAsync(blob, docxContainer.value, null, {
      className: 'docx-preview',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true,
      renderHeaders: true,
      renderFooters: true,
    })
  } catch (e) {
    console.error('Erro ao renderizar DOCX:', e)
    error.value = 'Não foi possível renderizar o arquivo .docx.'
  } finally {
    docxLoading.value = false
  }
}

watch(
  [currentFile, canPreview],
  async () => {
    if (docxContainer.value) docxContainer.value.innerHTML = ''

    if (canPreview.value && isDocx.value) {
      await nextTick()
      await renderDocx()
    }
  },
  { immediate: false },
)

onMounted(loadDocument)
</script>

<template>
  <main class="details-page">
    <div class="details-shell">
      <Breadcrumbs :title="document?.title ?? 'Documento'" />

      <div v-if="loading" class="details-grid" aria-busy="true" aria-live="polite">
        <section class="preview-panel preview-panel--skeleton" aria-label="Carregando documento">
          <div class="skeleton skeleton-preview" />
          <span class="skeleton-caption">Carregando pré-visualização…</span>
        </section>

        <aside class="document-card document-card--skeleton" aria-hidden="true">
          <div class="skeleton skeleton-line skeleton-line--sm" />
          <div class="skeleton skeleton-line skeleton-line--lg" />
          <div class="skeleton skeleton-line skeleton-line--md" />

          <div class="skeleton-metadata">
            <div v-for="n in 6" :key="n" class="skeleton-metadata-row">
              <div class="skeleton skeleton-line skeleton-line--xs" />
              <div class="skeleton skeleton-line skeleton-line--sm" />
            </div>
          </div>

          <div class="skeleton skeleton-block" />
          <div class="skeleton skeleton-block" />
        </aside>
      </div>

      <p v-else-if="notFound" class="status-message error-message">Documento não encontrado.</p>
      <p v-else-if="error" class="status-message error-message">{{ error }}</p>

      <template v-else-if="document">
        <div class="details-grid">
          <section
            class="preview-panel"
            :class="{ 'is-restricted': !hasAccess }"
            aria-label="Visualização do documento"
          >
            <div class="preview-viewer">
              <div v-if="!hasAccess" class="preview-masked" aria-hidden="true">
                <span v-for="line in 9" :key="line" class="preview-masked-line" />
              </div>

              <div v-else-if="!totalFiles" class="preview-placeholder">
                <p>Nenhum arquivo disponível para esta revisão.</p>
                <span>{{ document.code }}</span>
              </div>

              <iframe
                v-else-if="isPdf"
                :key="currentFile.id"
                :src="fileUrl"
                class="preview-frame"
                title="Visualização do PDF"
                type="application/pdf"
              />

              <img
                v-else-if="isImage"
                :key="currentFile.id"
                :src="fileUrl"
                class="preview-image"
                :alt="currentFile.original_name || document.title"
              />

              <div v-else-if="isDocx" class="preview-docx-wrapper">
                <p v-if="docxLoading" class="preview-docx-loading">Carregando documento...</p>
                <div ref="docxContainer" class="preview-docx" />
              </div>

              <div v-else class="preview-placeholder">
                <p>Formato não suportado para visualização.</p>
                <span>{{ currentFile?.original_name }}</span>
              </div>
            </div>

            <div v-if="canPreview && totalFiles > 0" class="preview-footer">
              <button type="button" :disabled="currentFileIndex <= 0" @click="prevFile">
                Arquivo anterior
              </button>

              <div class="preview-footer-info">
                <strong>Arquivo {{ currentFileIndex + 1 }} de {{ totalFiles }}</strong>
                <span v-if="currentFile?.original_name" class="preview-footer-name">
                  {{ currentFile.original_name }}
                </span>
              </div>

              <button
                type="button"
                :disabled="currentFileIndex >= totalFiles - 1"
                @click="nextFile"
              >
                Próximo arquivo
              </button>
            </div>

            <DocumentAccessOverlay
              v-if="!hasAccess"
              :requesting="requestingAccess"
              :requested="accessRequested"
              :rejected="accessRejected"
              :error-message="requestError"
              @request="handleRequestAccess"
            />
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
                <dd>
                  {{
                    document.revision?.issue_date ? formatDate(document.revision.issue_date) : '-'
                  }}
                </dd>
              </div>
              <div>
                <dt>Responsável</dt>
                <dd>{{ document.responsible.name }}</dd>
              </div>
            </dl>

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
                      <dd>
                        {{ version.issue_date ? formatDate(version.issue_date) : '-' }}
                      </dd>
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
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1rem;
}

.preview-panel.is-restricted {
  overflow: hidden;
}

.preview-masked {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1.5rem 2rem;
  filter: blur(6px);
  user-select: none;
}

.preview-masked-line {
  height: 0.8rem;
  border-radius: 999px;
  background: var(--color-surface-muted);
}

.preview-masked-line:nth-child(3n) {
  width: 70%;
}

.preview-masked-line:nth-child(3n + 1) {
  width: 92%;
}

.preview-masked-line:nth-child(3n + 2) {
  width: 82%;
}

.preview-viewer {
  flex: 1;
  min-height: 0;
  display: flex;
}

.preview-frame {
  flex: 1;
  width: 100%;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  margin: auto;
  object-fit: contain;
}

.preview-docx-wrapper {
  flex: 1;
  width: 100%;
  min-height: 0;
  overflow: auto;
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
  position: relative;
}

.preview-docx {
  width: 100%;
  min-height: 100%;
}

.preview-docx :deep(.docx-wrapper) {
  background: var(--color-surface-muted);
  padding: 1rem;
}

.preview-docx :deep(.docx-wrapper > section.docx) {
  margin: 0 auto 1rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  background: #fff;
}

.preview-docx-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  pointer-events: none;
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

.preview-footer-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  min-width: 0;
  text-align: center;
}

.preview-footer-name {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  max-width: 18rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-footer button {
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
  white-space: nowrap;
}

.preview-footer button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.preview-panel--skeleton,
.document-card--skeleton {
  position: relative;
  overflow: hidden;
}

.skeleton {
  position: relative;
  overflow: hidden;
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
}

.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--color-surface) 70%, transparent),
    transparent
  );
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  100% {
    transform: translateX(100%);
  }
}

.skeleton-preview {
  flex: 1;
  width: 100%;
  min-height: 24rem;
  border-radius: var(--radius-sm);
}

.skeleton-caption {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  pointer-events: none;
}

.skeleton-line {
  height: 0.85rem;
  border-radius: 999px;
}

.skeleton-line--xs {
  width: 30%;
  height: 0.7rem;
}

.skeleton-line--sm {
  width: 45%;
  height: 0.7rem;
}

.skeleton-line--md {
  width: 70%;
  margin-top: 0.5rem;
}

.skeleton-line--lg {
  width: 85%;
  height: 1.05rem;
  margin-top: 0.85rem;
}

.skeleton-metadata {
  display: grid;
  gap: 0.8rem;
  margin-top: 1.25rem;
}

.skeleton-metadata-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.skeleton-block {
  height: 4.5rem;
  margin-top: 1.25rem;
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

@media (prefers-reduced-motion: reduce) {
  .skeleton::after {
    animation: none;
  }
}
</style>
