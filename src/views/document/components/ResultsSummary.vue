<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { fetchResultsSummary } from '@/api/documents.js'
import { buildSummaryQueryKey } from '@/utils/searchParams.js'

const props = defineProps({
  query: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['resize'])

const root = ref(null)
let observer = null

onMounted(() => {
  if (typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(() => emit('resize', root.value.offsetHeight))
  observer.observe(root.value)
})

onBeforeUnmount(() => observer?.disconnect())

const loading = ref(false)
const error = ref('')
const summary = ref('')
const expanded = ref(false)
let controller = null

const BOLD_PATTERN = /\*\*(.+?)\*\*/g

function parseInline(text) {
  const parts = []
  let last = 0
  for (const match of text.matchAll(BOLD_PATTERN)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) })
    parts.push({ text: match[1], bold: true })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}

const blocks = computed(() => {
  const result = []
  for (const chunk of summary.value.split(/\n\s*\n/)) {
    const lines = chunk
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    if (!lines.length) continue
    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      result.push({
        list: true,
        items: lines.map((line) => parseInline(line.replace(/^[-*]\s+/, ''))),
      })
    } else {
      result.push({
        list: false,
        parts: parseInline(lines.map((line) => line.replace(/^#+\s*/, '')).join(' ')),
      })
    }
  }
  return result
})

async function load() {
  controller?.abort()
  controller = new AbortController()
  const { signal } = controller
  loading.value = true
  error.value = ''
  expanded.value = false
  try {
    const data = await fetchResultsSummary(props.query, { signal })
    if (signal.aborted) return
    summary.value = String(data?.summary ?? data?.resumo ?? '').trim()
  } catch {
    if (signal.aborted) return
    summary.value = ''
    error.value = 'Não foi possível gerar o resumo no momento.'
  } finally {
    if (!signal.aborted) loading.value = false
  }
}

watch(() => buildSummaryQueryKey(props.query), load, { immediate: true })
</script>

<template>
  <section ref="root" class="results-summary" aria-live="polite" :aria-busy="loading">
    <header class="summary-header">
      <h2 class="summary-title">Resumo gerado por IA</h2>
      <button
        v-if="summary && !loading"
        type="button"
        class="summary-toggle"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'Ver menos' : 'Ver mais' }}
      </button>
    </header>

    <div v-if="loading" class="summary-loading" role="status">
      <span class="summary-spinner" aria-hidden="true"></span>
      <span>Gerando resumo dos resultados...</span>
    </div>
    <p v-else-if="error" class="summary-error">{{ error }}</p>
    <div v-else-if="summary" class="summary-body" :class="{ clamped: !expanded }">
      <template v-for="(block, index) in blocks" :key="index">
        <ul v-if="block.list">
          <li v-for="(item, i) in block.items" :key="i">
            <template v-for="(part, j) in item" :key="j">
              <strong v-if="part.bold">{{ part.text }}</strong>
              <template v-else>{{ part.text }}</template>
            </template>
          </li>
        </ul>
        <p v-else>
          <template v-for="(part, j) in block.parts" :key="j">
            <strong v-if="part.bold">{{ part.text }}</strong>
            <template v-else>{{ part.text }}</template>
          </template>
        </p>
      </template>
    </div>
  </section>
</template>

<style scoped>
.results-summary {
  margin-top: 0.75rem;
  padding: 0.6rem 1rem;
  border: 1px solid var(--color-primary-bg);
  border-radius: 8px;
  background: #f1f4fa;
  font-size: 0.85rem;
  min-height: 80px;
}

.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.summary-title {
  margin: 0;
  color: var(--color-primary);
  font-size: 0.8rem;
  font-weight: 600;
}

.summary-toggle {
  border: 0;
  background: none;
  color: var(--color-primary);
  font-size: 0.78rem;
  cursor: pointer;
}

.summary-toggle:hover {
  text-decoration: underline;
}

.summary-body {
  margin-top: 0.25rem;
  line-height: 1.45;
}

.summary-body.clamped {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.summary-body:not(.clamped) {
  max-height: 30vh;
  overflow-y: auto;
}

.summary-body p,
.summary-body ul {
  margin: 0 0 0.35rem;
}

.summary-body ul {
  padding-left: 1.2rem;
}

.summary-loading,
.summary-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.25rem 0 0;
  color: var(--color-text-muted);
}

.summary-error {
  color: var(--color-warning);
}

.summary-spinner {
  width: 0.9rem;
  height: 0.9rem;
  border: 2px solid var(--color-primary-bg);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: summary-spin 0.8s linear infinite;
}

@keyframes summary-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
