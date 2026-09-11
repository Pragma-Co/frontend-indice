<script setup>
import { computed } from 'vue'
import { useDocumentFormStore } from '../../stores/documentFormStore'
import { findArea, findConfidentiality } from '../../utils/documentCatalog'
import { formatDate } from '../../utils/formatters'
import Badge from '../common/Badge.vue'
import Button from '../common/Button.vue'
import KeyValue from '../common/KeyValue.vue'

/**
 * Step 3 — Confirmação. Read-only summary of what was filled in step 2,
 * the reserved preview container and the Anterior / Publicar actions.
 * The submission itself (what happens on `publish`) is a separate task;
 * this component only emits the event and reflects `store.publishing`.
 */
const emit = defineEmits(['back', 'publish'])
const store = useDocumentFormStore()

const EMPTY = '—'
const issuedAt = new Date()

const code = computed(() => store.codePreview ?? EMPTY)
const issueDate = computed(() => formatDate(issuedAt))
const documentType = computed(() => {
  const type = store.selectedDocumentType
  return type ? `${type.code} - ${type.name}` : EMPTY
})
const discipline = computed(() => {
  const d = store.selectedDiscipline
  return d ? `${d.code} - ${d.name}` : EMPTY
})
const confidentiality = computed(() => findConfidentiality(store.form.confidentiality))
const areas = computed(() => store.form.areas.map((code) => ({ code, name: findArea(code)?.name ?? code })))
const canPublish = computed(() => store.isValid && !store.publishing)
</script>

<template>
  <section class="card confirmation" aria-labelledby="confirmation-title">
    <h2 id="confirmation-title" class="confirmation-title">Resumo do Documento</h2>

    <dl class="summary">
      <div class="summary-row summary-row-header">
        <div class="summary-cell summary-code">
          <span class="visually-hidden">Código/ID</span>
          <strong data-testid="document-code">{{ code }}</strong>
        </div>
        <div class="summary-cell summary-meta">
          <KeyValue label="Versão atual" layout="row">{{ store.revision }}</KeyValue>
          <KeyValue label="Data emissão" layout="row">{{ issueDate }}</KeyValue>
          <KeyValue label="Responsável" layout="row">{{ store.form.author || EMPTY }}</KeyValue>
        </div>
      </div>

      <div class="summary-row summary-row-three">
        <div class="summary-cell">
          <KeyValue label="Tipo de Documento">{{ documentType }}</KeyValue>
        </div>
        <div class="summary-cell">
          <KeyValue label="Disciplina">{{ discipline }}</KeyValue>
        </div>
        <div class="summary-cell">
          <KeyValue label="Confidencialidade">
            <Badge v-if="confidentiality" :variant="confidentiality.value.toLowerCase()">{{ confidentiality.label }}</Badge>
            <template v-else>{{ EMPTY }}</template>
          </KeyValue>
        </div>
      </div>

      <div class="summary-row summary-row-two">
        <div class="summary-cell">
          <KeyValue label="Tags relacionadas">
            <span v-if="areas.length" class="summary-tags">
              <Badge v-for="area in areas" :key="area.code">{{ area.name }}</Badge>
            </span>
            <template v-else>{{ EMPTY }}</template>
          </KeyValue>
        </div>
        <div class="summary-cell">
          <KeyValue label="Descrição">{{ store.form.description || EMPTY }}</KeyValue>
        </div>
      </div>
    </dl>

    <section class="preview" aria-labelledby="preview-title">
      <h3 id="preview-title" class="preview-title">Pré-visualização</h3>
      <div class="preview-body" data-testid="preview-container">
        <p class="preview-placeholder">A pré-visualização do arquivo será exibida aqui.</p>
      </div>
    </section>

    <footer class="confirmation-actions">
      <Button variant="outline" :disabled="store.publishing" @click="emit('back')">Anterior</Button>
      <Button variant="primary" :disabled="!canPublish" :loading="store.publishing" @click="emit('publish')">
        {{ store.publishing ? 'Publicando…' : 'Publicar' }}
      </Button>
    </footer>
  </section>
</template>

<style scoped>
.confirmation-title {
  font-size: 1rem;
  margin-bottom: 1rem;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.summary {
  margin: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.summary-row {
  display: grid;
}

.summary-row + .summary-row {
  border-top: 1px solid var(--color-border);
}

.summary-row-header {
  grid-template-columns: 1fr 1fr;
}

.summary-row-three {
  grid-template-columns: 1fr 1fr 1fr;
}

.summary-row-two {
  grid-template-columns: 1fr 2fr;
}

.summary-cell {
  padding: 1rem 1.25rem;
  min-height: 4.5rem;
}

.summary-cell + .summary-cell {
  border-left: 1px solid var(--color-border);
}

.summary-code {
  display: flex;
  align-items: center;
  font-size: 1.15rem;
  letter-spacing: 0.02em;
}

.summary-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.summary-tags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.preview {
  margin-top: 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1rem 1.25rem;
}

.preview-title {
  font-size: 0.95rem;
}

.preview-body {
  min-height: 6rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-placeholder {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.confirmation-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 1.5rem;
}

@media (max-width: 900px) {
  .summary-row-header,
  .summary-row-three,
  .summary-row-two {
    grid-template-columns: 1fr;
  }

  .summary-cell + .summary-cell {
    border-left: none;
    border-top: 1px solid var(--color-border);
  }
}
</style>
