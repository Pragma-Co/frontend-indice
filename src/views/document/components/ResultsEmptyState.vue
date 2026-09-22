<script setup>
import Button from '@/components/common/Button.vue'

defineProps({
  hasFilters: { type: Boolean, default: false },
})

defineEmits(['clear'])
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
    <h3>Nenhum documento encontrado</h3>
    <p v-if="hasFilters">Tente remover algum filtro ou buscar por outro termo.</p>
    <p v-else>Ainda não há documentos para exibir.</p>
    <Button v-if="hasFilters" variant="outline" @click="$emit('clear')">Limpar filtros</Button>
  </div>
</template>

<style scoped>
.results-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 3rem 1rem;
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
}

.results-empty p {
  font-size: 0.88rem;
  margin-bottom: 0.5rem;
}
</style>
