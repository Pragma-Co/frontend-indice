<script setup>
import { History, X } from '@lucide/vue'
import { useMediaQuery } from '@/composables/useMediaQuery.js'

const COMPACT_QUERY = '(max-width: 640px)'

const props = defineProps({
  id: { type: String, required: true },
  terms: { type: Array, required: true },
  activeIndex: { type: Number, default: -1 },
})

const emit = defineEmits(['select', 'remove', 'clear', 'activate'])

const isCompact = useMediaQuery(COMPACT_QUERY)

function optionId(index) {
  return `${props.id}-option-${index}`
}
</script>

<template>
  <div class="recent-searches" :class="{ 'is-compact': isCompact }" @mousedown.prevent>
    <div class="recent-searches-header">
      <span :id="`${id}-title`" class="recent-searches-title">Buscas recentes</span>
      <button type="button" class="recent-searches-clear" tabindex="-1" @click="emit('clear')">
        Limpar histórico
      </button>
    </div>
    <ul :id="id" class="recent-searches-list" role="listbox" :aria-labelledby="`${id}-title`">
      <li
        v-for="(term, index) in props.terms"
        :id="optionId(index)"
        :key="term"
        class="recent-search"
        :class="{ active: index === props.activeIndex }"
        role="option"
        :aria-selected="index === props.activeIndex"
        @mouseenter="emit('activate', index)"
      >
        <button
          type="button"
          class="recent-search-term"
          tabindex="-1"
          @click="emit('select', term)"
        >
          <History :size="16" :stroke-width="2" aria-hidden="true" />
          <span class="recent-search-text">{{ term }}</span>
        </button>
        <button
          type="button"
          class="recent-search-remove"
          tabindex="-1"
          :aria-label="`Remover ${term} do histórico`"
          @click="emit('remove', term)"
        >
          <X :size="15" :stroke-width="2" aria-hidden="true" />
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.recent-searches {
  position: absolute;
  z-index: 20;
  top: calc(100% + 0.4rem);
  left: 0;
  right: 0;
  display: grid;
  gap: 0.25rem;
  padding: 0.6rem 0.4rem 0.4rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: 0 10px 24px rgba(30, 42, 94, 0.14);
  color: var(--color-text);
  text-align: left;
}

.recent-searches-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 0.6rem 0.25rem;
}

.recent-searches-title {
  font-size: 0.78rem;
  font-weight: 700;
}

.recent-searches-clear {
  padding: 0.25rem 0;
  border: 0;
  background: transparent;
  color: var(--color-primary);
  cursor: pointer;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
}

.recent-searches-clear:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
}

.recent-searches-list {
  display: grid;
  gap: 0.1rem;
  max-height: min(22rem, 60vh);
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.recent-search {
  display: flex;
  align-items: center;
  border-radius: var(--radius-sm);
}

.recent-search.active {
  background: var(--color-surface-muted);
}

.recent-search-term {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  padding: 0.7rem 0.6rem;
  border: 0;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
  text-align: left;
}

.recent-search-term svg {
  flex: 0 0 auto;
  color: var(--color-text-muted);
}

.recent-search-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-search-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 2rem;
  height: 2rem;
  margin-right: 0.3rem;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  visibility: hidden;
}

.recent-search.active .recent-search-remove {
  visibility: visible;
}

.recent-search-remove:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.recent-searches.is-compact {
  padding: 0.5rem 0.25rem 0.25rem;
}

.recent-searches.is-compact .recent-search-term {
  min-height: 2.75rem;
}

.recent-searches.is-compact .recent-search-remove {
  width: 2.75rem;
  height: 2.75rem;
  visibility: visible;
}

.recent-searches.is-compact .recent-searches-clear {
  padding: 0.6rem 0;
}
</style>
