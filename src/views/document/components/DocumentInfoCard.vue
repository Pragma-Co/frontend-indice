<script setup>
import { computed } from 'vue'
import { REVISION_BLOCK_MESSAGES, statusBadgeFor } from '@/utils/documentStatus.js'
import { formatDate } from '@/utils/formatters.js'
import StatusBadge from '@/components/common/StatusBadge.vue'

const props = defineProps({
  document: { type: Object, required: true },
  currentRevision: { type: Object, default: null },
  hasAccess: { type: Boolean, default: false },
  newRevisionBlockReason: { type: [String, null], default: null },
  newRevisionRoute: { type: Object, required: true },
})

defineEmits(['select-revision'])

const NO_ACCESS_MESSAGE =
  'Conteúdo restrito: você ainda não tem acesso aprovado a este documento. Solicite acesso para visualizá-lo.'

const newRevisionHint = computed(() => REVISION_BLOCK_MESSAGES[props.newRevisionBlockReason] ?? '')

const auditorComment = computed(() => props.currentRevision?.auditor_comment?.trim() || '')

const documentStatusBadge = computed(() => statusBadgeFor(props.document.revision?.status))

const managersLabel = computed(() =>
  (props.document.managers ?? []).map((manager) => manager.name).join(', '),
)

const auditSectionTitle = computed(() => {
  const status = props.currentRevision?.status
  if (status === 'APPROVED') return 'Motivo da aprovação'
  if (status === 'REJECTED') return 'Motivo da recusa'
  return 'Parecer do auditor'
})

const emptyAuditMessage = computed(() =>
  props.currentRevision?.status === 'PENDING'
    ? 'Esta revisão ainda aguarda análise do auditor.'
    : 'O auditor não registrou justificativa para esta revisão.',
)
</script>

<template>
  <aside class="document-card">
    <header class="document-card-header">
      <StatusBadge v-if="documentStatusBadge" :status="documentStatusBadge" />
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
          {{ document.revision?.issue_date ? formatDate(document.revision.issue_date) : '-' }}
        </dd>
      </div>
      <div v-if="managersLabel">
        <dt>{{ document.managers.length > 1 ? 'Gestores' : 'Gestor' }}</dt>
        <dd>{{ managersLabel }}</dd>
      </div>
      <div>
        <dt>Responsável</dt>
        <dd>{{ document.responsible.name }}</dd>
      </div>
    </dl>

    <div class="description-block">
      <h2>Descrição</h2>
      <p v-if="!hasAccess" class="block-empty">{{ NO_ACCESS_MESSAGE }}</p>
      <p v-else-if="document.description">{{ document.description }}</p>
      <p v-else class="block-empty">Nenhuma descrição foi cadastrada para este documento.</p>
    </div>

    <div class="description-block audit-block">
      <h2>{{ auditSectionTitle }}</h2>
      <p v-if="!hasAccess" class="block-empty">{{ NO_ACCESS_MESSAGE }}</p>
      <template v-else-if="auditorComment">
        <p>{{ auditorComment }}</p>
        <p v-if="currentRevision?.auditor?.name" class="audit-author">
          {{ currentRevision.auditor.name }}
          <template v-if="currentRevision.audited_at">
            · {{ formatDate(currentRevision.audited_at) }}
          </template>
        </p>
      </template>
      <p v-else class="block-empty">{{ emptyAuditMessage }}</p>
    </div>

    <div v-if="document.areas?.length" class="tag-block">
      <h2>Tags relacionadas</h2>
      <div class="tags">
        <span v-for="area in document.areas" :key="area.acronym">{{ area.acronym }}</span>
      </div>
    </div>

    <div class="revision-block">
      <h2>Histórico de versões</h2>
      <div v-if="hasAccess && document.revision" class="revision-action">
        <RouterLink
          v-if="!newRevisionBlockReason"
          :to="newRevisionRoute"
          class="revision-action-link"
        >
          Nova Revisão
        </RouterLink>
        <span v-else class="revision-action-link is-disabled" aria-disabled="true">
          Nova Revisão
        </span>
        <p v-if="newRevisionHint" class="revision-action-hint">
          {{ newRevisionHint }}
        </p>
      </div>
      <p v-if="!document.versions?.length" class="tag-block-empty">Nenhuma versão registrada.</p>
      <ul v-else class="revision-list">
        <li
          v-for="version in document.versions"
          :key="version.id"
          role="button"
          tabindex="0"
          :aria-pressed="version.id === currentRevision?.id"
          :class="{
            'is-current': version.id === document.revision?.id,
            'is-selected': version.id === currentRevision?.id,
            'is-rejected': version.status === 'REJECTED',
          }"
          @click="$emit('select-revision', version)"
          @keydown.enter.space.prevent="$emit('select-revision', version)"
        >
          <div class="revision-header">
            <strong class="revision-select"> REV{{ version.version }} </strong>
            <span v-if="version.id === document.revision?.id" class="current-tag">
              Versão atual
            </span>
          </div>
          <p class="revision-file-count">{{ version.files?.length ?? 0 }} arquivo(s)</p>
          <dl class="revision-meta">
            <div>
              <dt>Data de emissão</dt>
              <dd>{{ version.issue_date ? formatDate(version.issue_date) : '-' }}</dd>
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
</template>

<style scoped>
.document-card {
  min-width: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  height: calc(100vh - 462px);
  min-height: 600px;
  align-self: start;
  padding: 1.25rem;
  overflow: auto;
}

.revision-action {
  margin: 0.5rem 0 0.85rem;
}

.revision-action-link {
  display: block;
  width: 100%;
  text-align: center;
  text-decoration: none;
  padding: 0.7rem 1rem;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: var(--color-on-primary, #fff);
  font-weight: 600;
  cursor: pointer;
}

.revision-action-link:hover:not(.is-disabled) {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

.revision-action-link:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.revision-action-link.is-disabled {
  background: var(--color-surface-muted);
  border-color: var(--color-border);
  color: var(--color-text-muted);
  cursor: not-allowed;
}

.revision-block .revision-action-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 0.4rem;
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

.audit-block .audit-author {
  margin-top: 0.4rem;
  font-size: 0.72rem;
}

.description-block p.block-empty {
  font-style: italic;
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
  cursor: pointer;
}

.revision-list li:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.revision-list li.is-current {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface-muted));
}

.revision-list li.is-rejected {
  border-color: rgba(220, 38, 38, 0.4);
  background: rgba(220, 38, 38, 0.06);
}

.revision-list li.is-selected {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.revision-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
  font-size: 0.8rem;
  color: var(--color-primary);
}

.revision-select {
  color: var(--color-primary);
}

.revision-file-count {
  margin: 0.35rem 0;
  color: var(--color-text-muted);
  font-size: 0.75rem;
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
</style>
