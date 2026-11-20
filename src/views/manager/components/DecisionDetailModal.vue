<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Button from '@/components/common/Button.vue'
import DecisionBadge from '@/views/manager/components/DecisionBadge.vue'
import { HISTORY_DECISIONS, requestTypeLabel } from '@/utils/decisionHistory.js'
import { formatDateTime } from '@/utils/formatters.js'

const props = defineProps({
  decision: { type: Object, required: true },
})

const emit = defineEmits(['close'])
const dialog = ref(null)
let previouslyFocused = null

const reasonTitle = computed(() =>
  props.decision.decision === HISTORY_DECISIONS.APPROVED ? 'Motivo do aceite' : 'Motivo da recusa',
)

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
      class="decision-dialog"
      aria-labelledby="decision-detail-title"
      @cancel.prevent="emit('close')"
      @click.self="emit('close')"
    >
      <header class="decision-header">
        <div>
          <h2 id="decision-detail-title">Detalhes da decisão</h2>
          <p class="document-title">
            {{ decision.code }}<template v-if="decision.title"> · {{ decision.title }}</template>
          </p>
        </div>
        <button type="button" class="close" aria-label="Fechar" @click="emit('close')">×</button>
      </header>

      <div class="decision-body">
        <dl>
          <div>
            <dt>Decisão</dt>
            <dd>
              <DecisionBadge :request-type="decision.requestType" :decision="decision.decision" />
            </dd>
          </div>
          <div>
            <dt>Tipo de solicitação</dt>
            <dd>{{ requestTypeLabel(decision.requestType) }}</dd>
          </div>
          <div v-if="decision.revision">
            <dt>Revisão</dt>
            <dd>{{ decision.revision }}</dd>
          </div>
          <div>
            <dt>Solicitante</dt>
            <dd>{{ decision.requesterName }}</dd>
          </div>
          <div>
            <dt>Decidido por</dt>
            <dd>{{ decision.userName }}</dd>
          </div>
          <div>
            <dt>Data e hora</dt>
            <dd>{{ formatDateTime(decision.decidedAt) }}</dd>
          </div>
        </dl>

        <h3>{{ reasonTitle }}</h3>
        <p class="reason" :class="{ 'is-empty': !decision.reason }">
          {{ decision.reason || 'Nenhum motivo foi registrado para esta decisão.' }}
        </p>
      </div>

      <footer class="decision-footer">
        <Button type="button" variant="outline" @click="emit('close')">Fechar</Button>
      </footer>
    </dialog>
  </Teleport>
</template>

<style scoped>
.decision-dialog {
  width: min(36rem, calc(100vw - 2rem));
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

.decision-dialog::backdrop {
  background: rgba(15, 23, 42, 0.55);
}

.decision-header,
.decision-footer {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
}

.decision-header {
  border-bottom: 1px solid var(--color-border);
}

.decision-header h2 {
  font-size: 1.1rem;
}

.document-title {
  margin-top: 0.4rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.close {
  flex-shrink: 0;
  align-self: flex-start;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  cursor: pointer;
  font-size: 1.2rem;
}

.decision-body {
  padding: 1.25rem 1.5rem;
}

.decision-body h3 {
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
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem 0.75rem;
}

dt {
  color: var(--color-text-muted);
}

dd {
  text-align: right;
}

.reason {
  padding: 0.75rem;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.reason.is-empty {
  color: var(--color-text-muted);
  font-style: italic;
}

.decision-footer {
  justify-content: flex-end;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}
</style>
