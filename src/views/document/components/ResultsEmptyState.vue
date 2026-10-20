<script setup>
import { computed } from 'vue'
import Button from '@/components/common/Button.vue'
import { extractSearchTerms } from '@/utils/searchHighlight.js'

const props = defineProps({
  term: { type: String, default: '' },
  hasFilters: { type: Boolean, default: false },
})

defineEmits(['clear', 'search'])

const SEARCH_TIPS = [
  'Verifique se as palavras estão escritas corretamente.',
  'Use termos mais gerais ou sinônimos.',
  'Busque por menos palavras ou pelo código do documento.',
]

const singleWordSuggestions = computed(() => {
  const terms = extractSearchTerms(props.term)
  return terms.length > 1 ? terms : []
})
</script>

<template>
  <div class="results-empty" role="status">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" stroke-linecap="round" />
      <path d="M8.5 11h5" stroke-linecap="round" />
    </svg>

    <template v-if="term">
      <h3>
        Nenhum resultado para <span class="empty-term">“{{ term }}”</span>
      </h3>
      <p>Não encontramos documentos que correspondam à sua busca. Algumas sugestões:</p>
      <ul class="empty-tips">
        <li v-for="tip in SEARCH_TIPS" :key="tip">{{ tip }}</li>
        <li v-if="hasFilters">Remova alguns filtros para ampliar os resultados.</li>
      </ul>

      <div v-if="singleWordSuggestions.length" class="empty-suggestions">
        <span>Tente buscar apenas por:</span>
        <button
          v-for="word in singleWordSuggestions"
          :key="word"
          type="button"
          class="suggestion-chip"
          @click="$emit('search', word)"
        >
          {{ word }}
        </button>
      </div>
    </template>

    <template v-else>
      <h3>Nenhum documento encontrado</h3>
      <p v-if="hasFilters">Tente remover algum filtro ou buscar por outro termo.</p>
      <p v-else>Ainda não há documentos para exibir.</p>
    </template>

    <div v-if="term || hasFilters" class="empty-actions">
      <Button v-if="hasFilters" variant="outline" @click="$emit('clear')">Limpar filtros</Button>
      <Button v-if="term" variant="outline" @click="$emit('search', '')">Limpar busca</Button>
    </div>
  </div>
</template>

<style scoped>
.results-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 3rem 1rem;
  margin: auto 0;
  text-align: center;
  color: var(--color-text-muted);
}

.results-empty svg {
  width: 44px;
  height: 44px;
  color: var(--color-border-strong);
}

.results-empty h3 {
  font-size: 1rem;
  color: var(--color-text);
  overflow-wrap: anywhere;
}

.empty-term {
  color: var(--color-primary);
}

.results-empty p {
  font-size: 0.88rem;
}

.empty-tips {
  margin: 0.25rem 0 0.5rem;
  padding-left: 1.1rem;
  text-align: left;
  font-size: 0.85rem;
  line-height: 1.6;
}

.empty-suggestions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
}

.suggestion-chip {
  padding: 0.25rem 0.7rem;
  border: 1px solid var(--color-info-border);
  border-radius: 999px;
  background: var(--color-info-bg);
  color: var(--color-primary);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}

.suggestion-chip:hover {
  border-color: var(--color-primary);
}

.empty-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}
</style>
