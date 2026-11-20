<script setup>
import { computed, ref, useId, watch } from 'vue'
import { useSearchStore } from '@/stores/searchStore.js'
import Button from '@/components/common/Button.vue'
import RecentSearchesPopover from '@/components/common/RecentSearchesPopover.vue'
import { useRecentSearches } from '@/composables/useRecentSearches.js'

const props = defineProps({
  term: { type: String, default: '' },
})

const emit = defineEmits(['search'])
const searchStore = useSearchStore()

const draft = ref(props.term)
const recentSearchesId = `recent-searches-${useId()}`
const recentSearches = useRecentSearches({ onSelect: searchRecentTerm })
const activeRecentSearchId = computed(() =>
  recentSearches.isVisible.value && recentSearches.activeIndex.value >= 0
    ? `${recentSearchesId}-option-${recentSearches.activeIndex.value}`
    : undefined,
)

watch(
  () => props.term,
  (term) => {
    draft.value = term
  },
)

function searchRecentTerm(term) {
  draft.value = term
  submit()
}

function submit() {
  recentSearches.close()
  const trimmed = draft.value.trim()
  searchStore.setCurrentTerm(trimmed)
  emit('search', trimmed)
}
</script>

<template>
  <form class="card results-search" role="search" @submit.prevent="submit">
    <div class="results-search-box">
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
          role="combobox"
          autocomplete="off"
          aria-autocomplete="list"
          :aria-expanded="recentSearches.isVisible.value"
          :aria-controls="recentSearchesId"
          :aria-activedescendant="activeRecentSearchId"
          placeholder="Pesquisar por título, código, descrição ou termos-chave..."
          @focus="recentSearches.open"
          @click="recentSearches.open"
          @input="recentSearches.filterBy($event.target.value)"
          @blur="recentSearches.close"
          @keydown="recentSearches.handleKeydown"
        />
      </label>
      <RecentSearchesPopover
        v-if="recentSearches.isVisible.value"
        :id="recentSearchesId"
        :terms="recentSearches.visibleTerms.value"
        :active-index="recentSearches.activeIndex.value"
        @select="recentSearches.select"
        @remove="recentSearches.remove"
        @clear="recentSearches.clear"
        @activate="recentSearches.setActive"
      />
    </div>
    <Button variant="primary">Buscar Novamente</Button>
  </form>
</template>

<style scoped>
.results-search {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  padding: 0.75rem 1rem;
}

.results-search-box {
  position: relative;
  flex: 1;
  display: flex;
  min-width: 0;
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
