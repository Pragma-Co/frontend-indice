<script setup>
import { onMounted, onUnmounted } from 'vue'
import { ArrowLeft, ClipboardList, Files, Info, Send } from '@lucide/vue'
import Button from '@/components/common/Button.vue'
import DuplicateFileDialog from '@/components/common/DuplicateFileDialog.vue'
import FileDropzone from '@/components/common/FileDropzone.vue'
import PageLayout from '@/components/layout/PageLayout.vue'
import RevisionDocumentHeader from '@/views/document/components/RevisionDocumentHeader.vue'
import RevisionFileList from '@/views/document/components/RevisionFileList.vue'
import {
  JUSTIFICATION_MAX_LENGTH,
  JUSTIFICATION_MIN_LENGTH,
  useNewRevision,
} from '@/views/document/composables/useNewRevision.js'
import { formatFileSize } from '@/utils/formatters.js'

const {
  parentDocument,
  loading,
  loadError,
  justification,
  submitting,
  queue,
  acceptedExtensions,
  currentRevisionLabel,
  nextRevisionLabel,
  revisionBlocked,
  revisionBlockedMessage,
  activeDuplicate,
  totalSize,
  hasFile,
  justificationLength,
  justificationValid,
  formValid,
  canSubmit,
  addFiles,
  removeFile,
  resolveDuplicate,
  goToDocumentList,
  submit,
} = useNewRevision()

function preventStrayFileDrop(event) {
  if (event.dataTransfer?.types.includes('Files')) {
    event.preventDefault()
  }
}

onMounted(() => {
  window.addEventListener('dragover', preventStrayFileDrop)
  window.addEventListener('drop', preventStrayFileDrop)
})

onUnmounted(() => {
  window.removeEventListener('dragover', preventStrayFileDrop)
  window.removeEventListener('drop', preventStrayFileDrop)
})
</script>

<template>
  <PageLayout
    wide
    title="Solicitar nova revisão técnica"
    subtitle="Envie os novos arquivos do documento e justifique as alterações para a moderação técnica."
  >
    <p v-if="loading" class="card status-message">Carregando documento...</p>

    <template v-else-if="loadError || revisionBlocked">
      <p class="card status-message" role="alert">
        {{ loadError || revisionBlockedMessage }}
      </p>
      <footer class="page-footer">
        <Button variant="outline" @click="goToDocumentList">
          <ArrowLeft :size="16" aria-hidden="true" class="button-icon" />Voltar para a listagem
        </Button>
      </footer>
    </template>

    <template v-else>
      <RevisionDocumentHeader :document="parentDocument" />

      <div class="revision-layout">
        <section class="card revision-form">
          <header class="section-header">
            <h2 class="section-title">
              <Files :size="18" aria-hidden="true" />Arquivos da Nova Revisão
            </h2>
            <span v-if="queue.length" class="section-summary">
              {{ queue.length }} {{ queue.length === 1 ? 'arquivo' : 'arquivos' }} •
              {{ formatFileSize(totalSize) }}
            </span>
          </header>

          <FileDropzone
            :accepted-extensions="acceptedExtensions"
            max-size-label="100MB"
            @files-selected="addFiles"
          />

          <RevisionFileList v-if="queue.length" :items="queue" @remove="removeFile" />

          <h2 class="section-title justification-title">
            <ClipboardList :size="18" aria-hidden="true" />O que mudou nesta revisão?
          </h2>

          <label class="justification-label" for="revision-justification">
            Justificativa da Alteração
            <span class="justification-required" aria-hidden="true">*</span>
          </label>
          <textarea
            id="revision-justification"
            v-model="justification"
            class="justification-input"
            rows="5"
            required
            :maxlength="JUSTIFICATION_MAX_LENGTH"
            aria-describedby="revision-justification-hint revision-justification-note"
            placeholder="Descreva o que foi alterado em relação à revisão vigente."
          />
          <div class="justification-meta">
            <span
              id="revision-justification-hint"
              class="justification-hint"
              :class="{ 'justification-hint-met': justificationValid }"
            >
              {{
                justificationValid
                  ? `✓ Requisito mínimo de ${JUSTIFICATION_MIN_LENGTH} caracteres atendido`
                  : `Mínimo de ${JUSTIFICATION_MIN_LENGTH} caracteres (${justificationLength}/${JUSTIFICATION_MIN_LENGTH})`
              }}
            </span>
            <span class="justification-counter">
              {{ justification.length }}/{{ JUSTIFICATION_MAX_LENGTH }}
            </span>
          </div>
          <p id="revision-justification-note" class="justification-note">
            Esta justificativa será registrada permanentemente na trilha de auditoria da revisão.
          </p>
        </section>

        <aside class="revision-side">
          <section class="card availability-notice">
            <h2 class="notice-title">
              <Info :size="16" aria-hidden="true" />Aviso de Disponibilidade do Acervo
            </h2>
            <p v-if="currentRevisionLabel" class="notice-text">
              A <strong>{{ currentRevisionLabel }}</strong> permanece ativa, pesquisável e
              disponível até que a <strong>{{ nextRevisionLabel }}</strong> seja homologada pela
              moderação técnica.
            </p>
            <p v-else class="notice-text">
              Esta solicitação criará a <strong>{{ nextRevisionLabel }}</strong
              >, que ficará disponível após a homologação pela moderação técnica.
            </p>
          </section>

          <section class="card inherited-metadata">
            <h2 class="inherited-title">Metadados Herdados</h2>
            <p class="inherited-text">
              Programa, disciplina, nível de sigilo e responsáveis serão herdados da revisão
              vigente.
            </p>
          </section>
        </aside>
      </div>

      <footer class="page-footer">
        <Button variant="outline" @click="goToDocumentList">
          <ArrowLeft :size="16" aria-hidden="true" class="button-icon" />Cancelar e Voltar
        </Button>
        <div class="submit-area">
          <span class="submit-status" :class="{ 'submit-status-valid': formValid }">
            {{
              formValid
                ? '✓ Arquivo e justificativa válidos'
                : !hasFile
                  ? 'Anexe ao menos um arquivo'
                  : 'Preencha a justificativa'
            }}
          </span>
          <Button variant="primary" :disabled="!canSubmit" :loading="submitting" @click="submit">
            <Send :size="16" aria-hidden="true" class="button-icon" />Submeter análise
          </Button>
        </div>
      </footer>

      <DuplicateFileDialog
        v-if="activeDuplicate"
        :file-name="activeDuplicate.name"
        :existing-document="activeDuplicate.duplicateInfo"
        @discard="resolveDuplicate(activeDuplicate)"
      />
    </template>
  </PageLayout>
</template>

<style scoped>
.status-message {
  color: var(--color-text-muted);
  text-align: center;
}

.revision-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
}

.section-summary {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.justification-title {
  margin-top: 1.75rem;
  margin-bottom: 1rem;
}

.justification-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
}

.justification-required {
  color: var(--color-danger);
}

.justification-input {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.65rem 0.75rem;
  line-height: 1.5;
  resize: vertical;
}

.justification-input:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -1px;
}

.justification-meta {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 0.4rem;
}

.justification-hint-met {
  color: var(--color-success);
}

.justification-note {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 0.35rem;
}

.availability-notice {
  background: var(--color-info-bg);
  border-color: var(--color-info-border);
}

.notice-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.9rem;
  color: var(--color-info);
}

.notice-text,
.inherited-text {
  font-size: 0.8rem;
  line-height: 1.5;
  margin-top: 0.5rem;
}

.inherited-title {
  font-size: 0.95rem;
}

.inherited-text {
  color: var(--color-text-muted);
}

.page-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1.5rem;
}

.submit-area {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.submit-status {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.submit-status-valid {
  color: var(--color-success);
}

.button-icon {
  vertical-align: -0.2em;
  margin-right: 0.4rem;
}

@media (max-width: 860px) {
  .revision-layout {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
