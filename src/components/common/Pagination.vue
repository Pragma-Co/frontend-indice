<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentPage: {
    type: Number,
    required: true,
  },
  totalPages: {
    type: Number,
    required: true,
  },
  totalItems: {
    type: Number,
    required: true,
  },
  itemsPerPage: {
    type: Number,
    required: true,
  },
  itemsPerPageOptions: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['change-page', 'change-items-per-page'])

const rangeStart = computed(() =>
  props.totalItems === 0 ? 0 : (props.currentPage - 1) * props.itemsPerPage + 1,
)
const rangeEnd = computed(() => Math.min(props.currentPage * props.itemsPerPage, props.totalItems))

function onItemsPerPageChange(event) {
  emit('change-items-per-page', Number(event.target.value))
}
</script>

<template>
  <div class="pagination">
    <p class="pagination-summary">
      Mostrando {{ rangeStart }} a {{ rangeEnd }} de {{ totalItems }} documentos
    </p>

    <div class="pagination-pages">
      <button
        type="button"
        class="page-nav"
        :disabled="currentPage === 1"
        @click="emit('change-page', currentPage - 1)"
      >
        Anterior
      </button>
      <button
        v-for="page in totalPages"
        :key="page"
        type="button"
        class="page-number"
        :class="{ active: page === currentPage }"
        @click="emit('change-page', page)"
      >
        {{ page }}
      </button>
      <button
        type="button"
        class="page-nav"
        :disabled="currentPage === totalPages"
        @click="emit('change-page', currentPage + 1)"
      >
        Próximo
      </button>
    </div>

    <label class="items-per-page">
      Itens por página:
      <select :value="itemsPerPage" @change="onItemsPerPageChange">
        <option v-for="option in itemsPerPageOptions" :key="option" :value="option">{{ option }}</option>
      </select>
    </label>
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding-top: 1rem;
  margin-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.pagination-summary {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.pagination-pages {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.page-nav,
.page-number {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.75rem;
  font-size: 0.82rem;
  color: var(--color-text);
  cursor: pointer;
}

.page-nav:disabled {
  cursor: default;
  opacity: 0.5;
}

.page-number {
  padding: 0.4rem 0.65rem;
  min-width: 2rem;
}

.page-number.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-text-inverse);
  font-weight: 600;
}

.items-per-page {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.items-per-page select {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.35rem 0.5rem;
  font-family: inherit;
  font-size: 0.85rem;
  color: var(--color-text);
  background: var(--color-surface);
}
</style>
