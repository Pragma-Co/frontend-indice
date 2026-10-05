<script setup>
import { formatUpdatedAt } from '@/utils/formatters.js'
import { canCreateRevision, statusBadgeFor } from '@/utils/documentStatus.js'
import Badge from '@/components/common/Badge.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'

defineProps({
  documents: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['action'])

const NEW_REVISION_BLOCKED_MESSAGE =
  'Este documento já possui uma revisão em andamento. Aguarde a conclusão para criar outra.'

function openDetails(document) {
  emit('action', { document, action: 'view-details' })
}

function startNewRevision(document) {
  if (!canCreateRevision(document.status)) return
  emit('action', { document, action: 'new-revision' })
}
</script>

<template>
  <div class="table-scroll">
    <table class="documents-table">
      <thead>
        <tr>
          <th></th>
          <th>Código do documento</th>
          <th>Título</th>
          <th>Tipo / Disciplina</th>
          <th>Revisão atual</th>
          <th>Status</th>
          <th>Última atualização</th>
          <th class="col-actions">Ações</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="document in documents"
          :key="document.id"
          class="document-row"
          tabindex="0"
          @click="openDetails(document)"
          @keydown.enter="openDetails(document)"
        >
          <!-- TODO: map this icon by file extension once documents carry one. -->
          <td class="cell-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7 3.5Z"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linejoin="round"
              />
              <path
                d="M14 3.5V7a1 1 0 0 0 1 1h3.5"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linejoin="round"
              />
            </svg>
          </td>
          <td class="cell-code">{{ document.code }}</td>
          <td class="cell-title">{{ document.title }}</td>
          <td class="cell-type">
            <span>{{ document.type }}</span>
            <span v-if="document.discipline?.name" class="cell-discipline">
              {{ document.discipline.name }}
            </span>
          </td>
          <td>
            <Badge>{{ document.revision }}</Badge>
          </td>
          <td>
            <StatusBadge
              v-if="statusBadgeFor(document.status)"
              :status="statusBadgeFor(document.status)"
            />
          </td>
          <td class="cell-updated">
            <span class="updated-date">{{ formatUpdatedAt(document.updatedAt) }}</span>
            <span class="updated-by">por {{ document.updatedBy }}</span>
          </td>
          <td class="cell-actions" @click.stop @keydown.enter.stop>
            <div class="actions-inner">
              <span class="action-wrapper">
                <button
                  type="button"
                  class="action-button"
                  :class="{ 'action-button-disabled': !canCreateRevision(document.status) }"
                  :aria-disabled="!canCreateRevision(document.status) || undefined"
                  :aria-describedby="
                    canCreateRevision(document.status)
                      ? undefined
                      : `new-revision-tooltip-${document.id}`
                  "
                  @click="startNewRevision(document)"
                >
                  Nova Revisão
                </button>
                <span
                  v-if="!canCreateRevision(document.status)"
                  :id="`new-revision-tooltip-${document.id}`"
                  class="action-tooltip"
                  role="tooltip"
                >
                  {{ NEW_REVISION_BLOCKED_MESSAGE }}
                </span>
              </span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-scroll {
  overflow: auto;
}

.documents-table {
  width: 100%;
  border-collapse: collapse;
}

.documents-table th {
  text-align: left;
  font-size: 0.78rem;
  color: var(--color-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.documents-table td {
  padding: 0.75rem 0.6rem;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.88rem;
  vertical-align: middle;
}

.col-actions {
  text-align: right;
}

.cell-icon {
  width: 2rem;
  color: var(--color-primary);
}

.cell-code {
  color: var(--color-text-muted);
  white-space: nowrap;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace;
  font-size: 0.8rem;
}

.cell-title {
  font-weight: 600;
  min-width: 11rem;
}

.cell-discipline {
  display: block;
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

.cell-type {
  color: var(--color-text-muted);
  min-width: 9rem;
}

.cell-updated {
  white-space: nowrap;
}

.updated-date {
  display: block;
  color: var(--color-text);
}

.updated-by {
  display: block;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  margin-top: 0.1rem;
}

.cell-actions {
  white-space: nowrap;
}

.actions-inner {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
}

.action-button {
  background: none;
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.7rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.action-button:hover {
  background: var(--color-info-bg);
}

.action-button-disabled,
.action-button-disabled:hover {
  background: var(--color-surface-muted);
  border-color: var(--color-border);
  color: var(--color-text-muted);
  cursor: not-allowed;
}

.action-wrapper {
  position: relative;
  display: inline-flex;
}

.action-tooltip {
  display: none;
  position: absolute;
  right: 0;
  bottom: calc(100% + 0.35rem);
  z-index: 20;
  width: max-content;
  max-width: 16rem;
  white-space: normal;
  text-align: left;
  background: var(--color-text);
  color: var(--color-text-inverse);
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.6rem;
  font-size: 0.75rem;
  line-height: 1.35;
}

.action-wrapper:hover .action-tooltip,
.action-wrapper:focus-within .action-tooltip {
  display: block;
}

.document-row {
  cursor: pointer;
}

.document-row:hover {
  background: var(--color-surface-muted);
}

.document-row:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}
</style>
