<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { X } from '@lucide/vue'
import Button from '@/components/common/Button.vue'
import { fetchLegalVersion } from '@/api/legal.js'

const props = defineProps({
  versionId: { type: Number, required: true },
  title: { type: String, required: true },
  versionLabel: { type: String, default: '' },
  decisions: { type: Array, default: () => [] },
})

const emit = defineEmits(['close'])

const dialog = ref(null)
const version = ref(null)
const loading = ref(true)
const error = ref('')
let previouslyFocused = null

const clauses = computed(() =>
  [...(version.value?.clauses ?? [])].sort((first, second) => first.position - second.position),
)

function decisionOf(clauseId) {
  const decision = props.decisions.find((item) => item.clause_id === clauseId)
  if (!decision) return null
  return decision.accepted ? 'Aceita' : 'Recusada'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    version.value = await fetchLegalVersion(props.versionId)
  } catch {
    error.value = 'Não foi possível carregar o texto do termo.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  previouslyFocused = document.activeElement
  dialog.value?.focus()
  load()
})

onBeforeUnmount(() => {
  previouslyFocused?.focus?.()
})
</script>

<template>
  <Teleport to="body">
    <div class="term-overlay" @click.self="emit('close')">
      <div
        ref="dialog"
        class="term-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-term-title"
        tabindex="-1"
        @keydown.esc.stop="emit('close')"
      >
        <header class="term-dialog-header">
          <div>
            <h2 id="legal-term-title">{{ title }}</h2>
            <p v-if="versionLabel" class="term-dialog-version">Versão {{ versionLabel }}</p>
          </div>
          <button type="button" class="term-close" aria-label="Fechar" @click="emit('close')">
            <X :size="18" aria-hidden="true" />
          </button>
        </header>

        <div class="term-dialog-body">
          <p v-if="loading" class="term-state" role="status">Carregando termo...</p>
          <div v-else-if="error" class="term-state term-error" role="alert">
            <p>{{ error }}</p>
            <Button variant="outline" @click="load">Tentar novamente</Button>
          </div>
          <template v-else>
            <p v-if="version.summary" class="term-summary">{{ version.summary }}</p>
            <ol class="term-clauses">
              <li v-for="clause in clauses" :key="clause.id" class="term-clause">
                <div class="term-clause-header">
                  <h3>{{ clause.title }}</h3>
                  <span class="term-tag">{{
                    clause.is_required ? 'Obrigatória' : 'Opcional'
                  }}</span>
                  <span
                    v-if="decisionOf(clause.id)"
                    class="term-tag"
                    :class="decisionOf(clause.id) === 'Aceita' ? 'accepted' : 'declined'"
                  >
                    {{ decisionOf(clause.id) }}
                  </span>
                </div>
                <p class="term-clause-body">{{ clause.body }}</p>
              </li>
            </ol>
          </template>
        </div>

        <footer class="term-dialog-footer">
          <Button variant="outline" @click="emit('close')">Fechar</Button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.term-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(15, 23, 42, 0.55);
}

.term-dialog {
  display: flex;
  flex-direction: column;
  width: min(48rem, 100%);
  max-height: 100%;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.3);
  overflow: hidden;
}

.term-dialog:focus {
  outline: none;
}

.term-dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.term-dialog-header h2 {
  font-size: 1.1rem;
}

.term-dialog-version {
  margin-top: 0.25rem;
  color: var(--color-text-muted);
  font-size: 0.82rem;
}

.term-close {
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

.term-close:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.term-dialog-body {
  flex: 1;
  min-height: 0;
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
}

.term-state {
  padding: 2rem 1rem;
  color: var(--color-text-muted);
  text-align: center;
}

.term-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  color: var(--color-warning);
}

.term-summary {
  margin-bottom: 1.25rem;
  color: var(--color-text-muted);
  font-size: 0.88rem;
  line-height: 1.5;
}

.term-clauses {
  display: grid;
  gap: 1rem;
  padding: 0;
  list-style: none;
}

.term-clause {
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.term-clause:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.term-clause-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.term-clause-header h3 {
  font-size: 0.9rem;
}

.term-tag {
  padding: 0.1rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
  font-size: 0.7rem;
  font-weight: 600;
}

.term-tag.accepted {
  border-color: var(--color-success-border);
  background: var(--color-success-bg);
  color: var(--color-success);
}

.term-tag.declined {
  border-color: var(--color-warning-border);
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.term-clause-body {
  font-size: 0.85rem;
  line-height: 1.55;
  white-space: pre-line;
}

.term-dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

@media (max-width: 640px) {
  .term-overlay {
    padding: 0;
  }

  .term-dialog {
    height: 100%;
    border-radius: 0;
  }
}
</style>
