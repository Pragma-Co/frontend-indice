<script setup>
defineProps({
  rows: { type: Number, default: 3 },
  columns: { type: Number, default: 7 },
  label: { type: String, default: 'Carregando' },
})
</script>

<template>
  <div class="panel-skeleton" role="status" aria-busy="true" :aria-label="label">
    <div class="skeleton-row skeleton-header">
      <span v-for="column in columns" :key="column" class="skeleton skeleton-heading" />
    </div>
    <div v-for="row in rows" :key="row" class="skeleton-row">
      <span v-for="column in columns" :key="column" class="skeleton skeleton-cell" />
    </div>
  </div>
</template>

<style scoped>
.skeleton-row {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 1.5rem;
  align-items: center;
  padding: 1.35rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.skeleton-row:last-child {
  border-bottom: none;
}

.skeleton-header {
  padding: 0.85rem 1rem;
  background: var(--color-surface-muted);
}

.skeleton {
  position: relative;
  display: block;
  overflow: hidden;
  border-radius: 999px;
  background: var(--color-surface-muted);
}

.skeleton-heading {
  width: 60%;
  height: 0.6rem;
  background: var(--color-border);
}

.skeleton-cell {
  width: 80%;
  height: 0.85rem;
}

.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--color-surface) 70%, transparent),
    transparent
  );
  animation: panel-skeleton-shimmer 1.4s ease-in-out infinite;
}

@keyframes panel-skeleton-shimmer {
  100% {
    transform: translateX(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton::after {
    animation: none;
  }
}
</style>
