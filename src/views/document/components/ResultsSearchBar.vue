<script setup>
import { ref, watch } from 'vue'
import Button from '@/components/common/Button.vue'

const props = defineProps({
  term: { type: String, default: '' },
})

const emit = defineEmits(['search'])

const draft = ref(props.term)

watch(
  () => props.term,
  (term) => {
    draft.value = term
  },
)

function submit() {
  emit('search', draft.value.trim())
}
</script>

<template>
  <form class="card results-search" role="search" @submit.prevent="submit">
    <label class="results-search-field">
      <span class="visually-hidden">Pesquisar documentos</span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" stroke-linecap="round" />
      </svg>
      <input
        v-model="draft"
        type="search"
        placeholder="Pesquisar por título, código, descrição ou termos-chave..."
      />
    </label>
    <Button variant="primary">Buscar Novamente</Button>
  </form>
</template>

<style scoped>
.results-search {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0;
  padding: 1rem 1.25rem;
}

.results-search-field {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0 0.85rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-muted);
}

.results-search-field:focus-within {
  border-color: var(--color-primary);
  outline: 2px solid var(--color-primary-bg);
}

.results-search-field svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.results-search-field input {
  flex: 1;
  min-width: 0;
  padding: 0.65rem 0;
  border: none;
  background: transparent;
}

.results-search-field input:focus {
  outline: none;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (max-width: 640px) {
  .results-search {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
