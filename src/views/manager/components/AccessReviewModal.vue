<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Button from '@/components/common/Button.vue'
import { formatDateTime } from '@/utils/formatters.js'
import {
  OPINION_MAX_LENGTH,
  OPINION_MIN_LENGTH,
} from '@/views/manager/composables/useRevisionReview.js'

const props = defineProps({
  request: { type: Object, required: true },
  pendingDecision: { type: String, default: null },
})

const decisions = [
  { value: 'REJECTED', label: 'Recusar Acesso', variant: 'danger-outline' },
  { value: 'APPROVED', label: 'Aprovar Acesso', variant: 'success' },
]
const emit = defineEmits(['close', 'decide'])
const dialog = ref(null)
const opinion = ref('')
const opinionLength = computed(() => opinion.value.trim().length)
const valid = computed(
  () => opinionLength.value >= OPINION_MIN_LENGTH && opinion.value.length <= OPINION_MAX_LENGTH,
)
const submitting = computed(() => props.pendingDecision !== null)
let previouslyFocused = null

function close() {
  if (!submitting.value) emit('close')
}

function decide(decision) {
  if (!valid.value || submitting.value) return
  emit('decide', { request: props.request, decision, opinion: opinion.value.trim() })
}

onMounted(() => {
  previouslyFocused = document.activeElement
  dialog.value.showModal()
})

onBeforeUnmount(() => {
  dialog.value.close()
  if (previouslyFocused?.isConnected) previouslyFocused.focus()
})
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="access-dialog"
      aria-labelledby="access-review-title"
      @cancel.prevent="close"
    >
      <header class="access-header">
        <div>
          <h2 id="access-review-title">Avaliar Solicitação de Acesso</h2>
          <p class="document-title">{{ request.title }} · {{ request.code }}</p>
          <p class="submitted">
            Solicitado por {{ request.requesterName }} em {{ formatDateTime(request.requestedAt) }}
          </p>
        </div>
        <button
          type="button"
          class="close"
          aria-label="Fechar"
          :disabled="submitting"
          @click="close"
        >
          ×
        </button>
      </header>

      <div class="access-body">
        <h3>Dados do pedido</h3>
        <dl>
          <div>
            <dt>Disciplina</dt>
            <dd>{{ request.discipline }}</dd>
          </div>
          <div>
            <dt>Área do solicitante</dt>
            <dd>{{ request.requesterArea || '—' }}</dd>
          </div>
          <div>
            <dt>Tipo de acesso</dt>
            <dd>{{ request.source?.access_type === 'TEMPORARY' ? 'Temporário' : 'Permanente' }}</dd>
          </div>
          <div v-if="request.source?.expires_on">
            <dt>Válido até</dt>
            <dd>{{ request.source.expires_on.split('-').reverse().join('/') }}</dd>
          </div>
        </dl>
        <h3>Justificativa do solicitante</h3>
        <p class="justification">{{ request.justification || 'Não informada.' }}</p>
        <label for="access-opinion">Parecer do gestor <span aria-hidden="true">*</span></label>
        <textarea
          id="access-opinion"
          v-model="opinion"
          :maxlength="OPINION_MAX_LENGTH"
          :disabled="submitting"
          aria-describedby="access-opinion-hint"
          rows="5"
          placeholder="Informe o parecer para aprovação ou o motivo da recusa."
        />
        <p id="access-opinion-hint" class="hint">
          Mínimo de {{ OPINION_MIN_LENGTH }} caracteres ({{ opinionLength }}/{{
            OPINION_MIN_LENGTH
          }}) · {{ opinion.length }}/{{ OPINION_MAX_LENGTH }}
        </p>
      </div>

      <footer class="access-footer">
        <p>A aprovação concederá ao solicitante acesso ao documento nos termos solicitados.</p>
        <div class="actions">
          <Button
            v-for="decision in decisions"
            :key="decision.value"
            type="button"
            :variant="decision.variant"
            :disabled="!valid || submitting"
            :loading="pendingDecision === decision.value"
            @click="decide(decision.value)"
            >{{ decision.label }}</Button
          >
        </div>
      </footer>
    </dialog>
  </Teleport>
</template>

<style scoped>
.access-dialog {
  width: min(48rem, calc(100vw - 2rem));
  max-width: none;
  max-height: 90vh;
  margin: auto;
  padding: 0;
  overflow: auto;
  border: 0;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
}
.access-dialog::backdrop {
  background: rgba(15, 23, 42, 0.55);
}
.access-header,
.access-footer {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
}
.access-header {
  border-bottom: 1px solid var(--color-border);
}
.access-header h2 {
  font-size: 1.1rem;
}
.document-title {
  margin-top: 0.4rem;
  font-weight: 600;
}
.submitted,
.hint,
.access-footer p {
  color: var(--color-text-muted);
  font-size: 0.8rem;
}
.close {
  align-self: flex-start;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 1.2rem;
}
.access-body {
  padding: 1.25rem 1.5rem;
}
.access-body h3,
.access-body label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
}
dl {
  margin-bottom: 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}
dl div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem;
}
dt {
  color: var(--color-text-muted);
}
dd {
  text-align: right;
}
.justification {
  margin-bottom: 1.25rem;
  padding: 0.75rem;
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font: inherit;
  resize: vertical;
}
.hint {
  margin-top: 0.35rem;
}
.access-footer {
  align-items: center;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}
.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
@media (max-width: 640px) {
  .access-footer {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
