<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, ChevronLeft, ChevronRight, Info, X } from '@lucide/vue'
import Button from '@/components/common/Button.vue'
import FileViewer from '@/components/common/FileViewer.vue'
import {
  OPINION_MAX_LENGTH,
  OPINION_MIN_LENGTH,
  useRevisionReview,
} from '@/views/manager/composables/useRevisionReview.js'
import { formatDate, formatFileSize, formatTime } from '@/utils/formatters.js'

const props = defineProps({
  revision: { type: Object, required: true },
})

const emit = defineEmits(['close', 'decided', 'unavailable'])

const {
  opinion,
  opinionError,
  submitError,
  pendingDecision,
  submitting,
  opinionLength,
  opinionValid,
  opinionIncomplete,
  files,
  fileIndex,
  currentFile,
  currentFileUrl,
  showFile,
  clearOpinionError,
  approve,
  reject,
} = useRevisionReview(props.revision, {
  onDecided: (outcome) => emit('decided', outcome),
  onUnavailable: (message) => emit('unavailable', message),
})

const dialog = ref(null)
let previouslyFocused = null
let previousBodyOverflow = ''

const submittedLabel = computed(() => {
  const { authorName, createdAt } = props.revision
  if (!createdAt) return `Submetido por ${authorName}`
  return `Submetido por ${authorName} em ${formatDate(createdAt)} às ${formatTime(createdAt)}`
})

const fileLabel = computed(() => {
  if (!currentFile.value) return 'Nenhum arquivo enviado'
  const size = Number.isFinite(currentFile.value.size_bytes)
    ? ` (${formatFileSize(currentFile.value.size_bytes)})`
    : ''
  return `${currentFile.value.original_name}${size}`
})

function close() {
  if (submitting.value) return
  emit('close')
}

onMounted(() => {
  previouslyFocused = document.activeElement
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  dialog.value?.focus()
})

onBeforeUnmount(() => {
  document.body.style.overflow = previousBodyOverflow
  previouslyFocused?.focus?.()
})
</script>

<template>
  <Teleport to="body">
    <div class="review-overlay" @click.self="close">
      <div
        ref="dialog"
        class="review-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="revision-review-title"
        tabindex="-1"
        @keydown.esc.stop="close"
      >
        <header class="review-header">
          <div>
            <div class="review-heading">
              <h2 id="revision-review-title">Avaliar Solicitação de Revisão</h2>
              <span class="review-code">{{ revision.code }} ({{ revision.toRevision }})</span>
            </div>
            <p class="review-document-title">{{ revision.title }}</p>
            <p class="review-submitted">{{ submittedLabel }}</p>
          </div>
          <button
            type="button"
            class="review-close"
            aria-label="Fechar"
            :disabled="submitting"
            @click="close"
          >
            <X :size="18" aria-hidden="true" />
          </button>
        </header>

        <div class="review-body">
          <section class="review-file" aria-label="Arquivo submetido">
            <p class="review-file-name">
              <strong>Arquivo Submetido:</strong>
              {{ fileLabel }}
            </p>
            <FileViewer :file="currentFile" :url="currentFileUrl">
              <template #toolbar>
                <template v-if="files.length > 1">
                  <button
                    type="button"
                    class="file-nav"
                    aria-label="Arquivo anterior"
                    :disabled="fileIndex === 0"
                    @click="showFile(fileIndex - 1)"
                  >
                    <ChevronLeft :size="14" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    class="file-nav"
                    aria-label="Próximo arquivo"
                    :disabled="fileIndex === files.length - 1"
                    @click="showFile(fileIndex + 1)"
                  >
                    <ChevronRight :size="14" aria-hidden="true" />
                  </button>
                </template>
                <span v-if="files.length">Arquivo {{ fileIndex + 1 }} de {{ files.length }}</span>
              </template>
            </FileViewer>
          </section>

          <section class="review-details">
            <h3>Metadados da Revisão</h3>
            <dl class="review-metadata">
              <div>
                <dt>Disciplina</dt>
                <dd>{{ revision.discipline }}</dd>
              </div>
              <div>
                <dt>Programa</dt>
                <dd>{{ revision.program }}</dd>
              </div>
              <div>
                <dt>Nível</dt>
                <dd>{{ revision.confidentiality }}</dd>
              </div>
            </dl>

            <h3>Justificativa do Autor</h3>
            <p class="review-justification" :class="{ empty: !revision.changeDescription }">
              {{ revision.changeDescription || 'O autor não informou uma justificativa.' }}
            </p>

            <label class="review-opinion-label" for="revision-review-opinion">
              Parecer Técnico do Gestor
              <span aria-hidden="true">*</span>
            </label>
            <textarea
              id="revision-review-opinion"
              v-model="opinion"
              class="review-opinion"
              :class="{ invalid: opinionError }"
              rows="6"
              :maxlength="OPINION_MAX_LENGTH"
              :disabled="submitting"
              :aria-invalid="opinionError ? 'true' : undefined"
              aria-describedby="revision-review-opinion-hint"
              placeholder="Insira observações técnicas para aprovação ou o motivo mandatório em caso de reprovação..."
              @input="clearOpinionError"
            />
            <div class="review-opinion-meta">
              <p
                id="revision-review-opinion-hint"
                class="review-opinion-hint"
                :class="{ error: opinionError, met: !opinionError && opinionValid }"
                :role="opinionError ? 'alert' : undefined"
              >
                {{
                  opinionError ||
                  (opinionValid
                    ? `✓ Requisito mínimo de ${OPINION_MIN_LENGTH} caracteres atendido`
                    : `Mínimo de ${OPINION_MIN_LENGTH} caracteres (${opinionLength}/${OPINION_MIN_LENGTH})`)
                }}
              </p>
              <span class="review-opinion-counter"
                >{{ opinion.length }}/{{ OPINION_MAX_LENGTH }}</span
              >
            </div>
          </section>
        </div>

        <footer class="review-footer">
          <p v-if="submitError" class="review-footer-note error" role="alert">{{ submitError }}</p>
          <p v-else class="review-footer-note">
            <Info :size="16" aria-hidden="true" />
            A aprovação tornará esta revisão a versão vigente oficial do acervo.
          </p>
          <div class="review-actions">
            <Button
              variant="danger-outline"
              data-decision="reject"
              :loading="pendingDecision === 'REJECTED'"
              :disabled="submitting || opinionIncomplete"
              @click="reject"
            >
              Recusar Revisão
            </Button>
            <Button
              variant="success"
              data-decision="approve"
              :loading="pendingDecision === 'APPROVED'"
              :disabled="submitting || opinionIncomplete"
              @click="approve"
            >
              <Check
                v-if="pendingDecision !== 'APPROVED'"
                :size="16"
                aria-hidden="true"
                class="review-action-icon"
              />Aprovar Revisão
            </Button>
          </div>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.review-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(15, 23, 42, 0.55);
}

.review-dialog {
  display: flex;
  flex-direction: column;
  width: min(72rem, 100%);
  height: min(46rem, 100%);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.3);
  overflow: hidden;
}

.review-dialog:focus {
  outline: none;
}

.review-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.review-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.review-heading h2 {
  font-size: 1.15rem;
}

.review-code {
  padding: 0.2rem 0.6rem;
  border: 1px solid var(--color-info-border);
  border-radius: 999px;
  background: var(--color-info-bg);
  color: var(--color-primary);
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
}

.review-submitted {
  margin-top: 0.3rem;
  color: var(--color-text-muted);
  font-size: 0.82rem;
}

.review-document-title {
  margin-top: 0.35rem;
  font-size: 0.95rem;
  font-weight: 600;
}

.review-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
}

.review-close:hover:not(:disabled) {
  background: var(--color-surface-muted);
}

.review-close:disabled {
  cursor: default;
  opacity: 0.5;
}

.review-close:focus-visible,
.file-nav:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.review-body {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  gap: 1.5rem;
  flex: 1;
  min-height: 0;
  padding: 1.25rem 1.5rem;
}

.review-file {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-height: 0;
}

.review-file-name {
  font-size: 0.82rem;
  overflow-wrap: anywhere;
}

.file-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}

.file-nav:disabled {
  cursor: default;
  opacity: 0.5;
}

.review-details {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  padding: 0 0.2rem;
}

.review-details h3,
.review-opinion-label {
  margin-bottom: 0.5rem;
  font-size: 0.82rem;
  font-weight: 600;
}

.review-metadata {
  margin-bottom: 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.review-metadata div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.55rem 0.75rem;
  font-size: 0.82rem;
}

.review-metadata div + div {
  border-top: 1px solid var(--color-border);
}

.review-metadata dt {
  color: var(--color-text-muted);
}

.review-metadata dd {
  font-weight: 600;
  text-align: right;
}

.review-justification {
  margin-bottom: 1.25rem;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  font-size: 0.82rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.review-justification.empty {
  color: var(--color-text-muted);
  font-style: italic;
}

.review-opinion-label span {
  color: var(--color-danger);
}

.review-opinion {
  width: 100%;
  min-height: 7rem;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  line-height: 1.5;
  resize: vertical;
}

.review-opinion:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.review-opinion.invalid {
  border-color: var(--color-danger);
}

.review-opinion-meta {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.35rem;
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.review-opinion-hint.error {
  color: var(--color-danger);
}

.review-opinion-hint.met {
  color: var(--color-success);
}

.review-opinion-counter {
  white-space: nowrap;
}

.review-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.review-footer-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

.review-footer-note.error {
  color: var(--color-danger);
}

.review-actions {
  display: flex;
  flex-shrink: 0;
  gap: 0.75rem;
}

.review-action-icon {
  margin-right: 0.4rem;
  vertical-align: -0.2em;
}

@media (max-width: 860px) {
  .review-overlay {
    padding: 0;
  }

  .review-dialog {
    height: 100%;
    border-radius: 0;
  }

  .review-body {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .review-file {
    min-height: 24rem;
  }

  .review-details {
    overflow-y: visible;
  }

  .review-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .review-actions {
    justify-content: flex-end;
  }
}
</style>
