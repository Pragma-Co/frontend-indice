<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { X } from '@lucide/vue'
import Button from '@/components/common/Button.vue'
import { fetchLegalVersion } from '@/api/legal.js'
import { formatDateAtTime } from '@/utils/formatters.js'

const props = defineProps({
  versionId: { type: Number, required: true },
  title: { type: String, required: true },
  versionLabel: { type: String, default: '' },
  decisions: { type: Array, default: () => [] },
  accepted: { type: Boolean, default: true },
  acceptedAt: { type: String, default: null },
  revokedAt: { type: String, default: null },
  blocking: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  actionError: { type: String, default: '' },
})

const emit = defineEmits(['close', 'accept', 'leave'])

function requestClose() {
  if (!props.blocking) emit('close')
}

function trapFocus(event) {
  if (!props.blocking || event.key !== 'Tab' || !dialog.value) return
  const focusable = [
    ...dialog.value.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), [tabindex="0"]',
    ),
  ]
  if (!focusable.length) {
    event.preventDefault()
    dialog.value.focus()
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!dialog.value.contains(document.activeElement)) {
    event.preventDefault()
    first.focus()
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

const dialog = ref(null)
const version = ref(null)
const loading = ref(true)
const error = ref('')
let previouslyFocused = null

const clauses = computed(() =>
  [...(version.value?.clauses ?? [])].sort((first, second) => first.position - second.position),
)

const agreements = reactive({})

const requiredClauses = computed(() => clauses.value.filter((clause) => clause.is_required))
const agreedRequiredCount = computed(
  () => requiredClauses.value.filter((clause) => agreements[clause.id]).length,
)
const allRequiredAgreed = computed(() => agreedRequiredCount.value === requiredClauses.value.length)
const allAgreed = computed(
  () => clauses.value.length > 0 && clauses.value.every((clause) => agreements[clause.id]),
)

function toggleAll(event) {
  for (const clause of clauses.value) agreements[clause.id] = event.target.checked
}

function accept() {
  if (!allRequiredAgreed.value) return
  emit(
    'accept',
    clauses.value.map((clause) => ({
      clause_id: clause.id,
      accepted: Boolean(agreements[clause.id]),
    })),
  )
}

const timeline = computed(() =>
  [
    props.acceptedAt &&
      `${props.accepted ? 'Aceito' : 'Discordado'} em ${formatDateAtTime(props.acceptedAt)}`,
    props.revokedAt && `Revogado em ${formatDateAtTime(props.revokedAt)}`,
  ]
    .filter(Boolean)
    .join(' · '),
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
    for (const clause of version.value?.clauses ?? []) agreements[clause.id] = false
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
    <div class="term-overlay" @click.self="requestClose">
      <div
        ref="dialog"
        class="term-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-term-title"
        tabindex="-1"
        @keydown.esc.stop="requestClose"
        @keydown="trapFocus"
      >
        <header class="term-dialog-header">
          <div>
            <h2 id="legal-term-title">{{ title }}</h2>
            <p v-if="versionLabel" class="term-dialog-version">Versão {{ versionLabel }}</p>
            <p v-if="timeline" class="term-dialog-timeline">{{ timeline }}</p>
          </div>
          <button
            v-if="!blocking"
            type="button"
            class="term-close"
            aria-label="Fechar"
            @click="emit('close')"
          >
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
            <label v-if="blocking && clauses.length" class="term-agree-all">
              <input type="checkbox" :checked="allAgreed" :disabled="busy" @change="toggleAll" />
              Concordo com todas as cláusulas
            </label>
            <ol class="term-clauses">
              <li
                v-for="clause in clauses"
                :key="clause.id"
                class="term-clause"
                :class="clause.is_required ? 'required' : 'optional'"
              >
                <div class="term-clause-header">
                  <h3>{{ clause.title }}</h3>
                  <span class="term-tag" :class="clause.is_required ? 'required' : 'optional'">{{
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
                <label v-if="blocking" class="term-clause-agree">
                  <input
                    v-model="agreements[clause.id]"
                    type="checkbox"
                    :disabled="busy"
                    :aria-describedby="`clause-requirement-${clause.id}`"
                  />
                  Concordo com esta cláusula
                  <span :id="`clause-requirement-${clause.id}`" class="term-clause-requirement">
                    {{
                      clause.is_required
                        ? '(obrigatória para continuar)'
                        : '(opcional, você pode continuar sem marcar)'
                    }}
                  </span>
                </label>
              </li>
            </ol>
          </template>
        </div>

        <footer class="term-dialog-footer">
          <template v-if="blocking">
            <p v-if="actionError" class="term-action-error" role="alert">{{ actionError }}</p>
            <p
              v-else-if="!loading && !error && !allRequiredAgreed"
              class="term-required-hint"
              role="status"
            >
              Marque as cláusulas obrigatórias para continuar ({{ agreedRequiredCount }}/{{
                requiredClauses.length
              }})
            </p>
            <Button variant="outline" :disabled="busy" @click="emit('leave')">Sair</Button>
            <Button :disabled="busy || loading || !!error || !allRequiredAgreed" @click="accept">
              {{ busy ? 'Registrando...' : 'Li e aceito' }}
            </Button>
          </template>
          <Button v-else variant="outline" @click="emit('close')">Fechar</Button>
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

.term-dialog-timeline {
  margin-top: 0.2rem;
  color: var(--color-text-muted);
  font-size: 0.78rem;
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
  padding: 0.85rem 1rem;
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--color-primary);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.term-clause.optional {
  border-style: dashed;
  border-left: 4px dashed var(--color-text-muted);
  background: var(--color-surface-muted);
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

.term-tag.required {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.term-tag.optional {
  border-style: dashed;
  border-color: var(--color-text-muted);
  background: var(--color-surface);
  color: var(--color-text-muted);
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
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.term-agree-all,
.term-clause-agree {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.term-agree-all {
  margin-bottom: 1rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  font-weight: 600;
}

.term-clause-agree {
  margin-top: 0.6rem;
  font-weight: 500;
}

.term-agree-all input,
.term-clause-agree input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--color-primary);
}

.term-clause-requirement {
  color: var(--color-text-muted);
  font-size: 0.78rem;
  font-weight: 400;
}

.term-clause.required .term-clause-requirement {
  color: var(--color-primary);
  font-weight: 600;
}

.term-required-hint {
  margin-right: auto;
  color: var(--color-text-muted);
  font-size: 0.82rem;
}

.term-action-error {
  margin-right: auto;
  color: var(--color-warning);
  font-size: 0.82rem;
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
