<script setup>
defineProps({
  cards: { type: Number, default: 4 },
})
</script>

<template>
  <div class="results-skeleton" role="status" aria-busy="true" aria-label="Carregando resultados">
    <div v-for="card in cards" :key="card" class="skeleton-card" aria-hidden="true">
      <div class="skeleton-header">
        <div class="skeleton-heading">
          <span class="skeleton skeleton-code" />
          <span class="skeleton skeleton-title" />
        </div>
        <span class="skeleton skeleton-badge" />
      </div>
      <span class="skeleton skeleton-category" />
      <span class="skeleton skeleton-line" />
      <span class="skeleton skeleton-line" />
      <span class="skeleton skeleton-line skeleton-line-short" />
      <div class="skeleton-footer">
        <span v-for="tag in 3" :key="tag" class="skeleton skeleton-tag" />
        <span class="skeleton skeleton-date" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.results-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.skeleton-card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.skeleton-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.skeleton-heading {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.4rem;
}

.skeleton-footer {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.2rem;
}

.skeleton {
  position: relative;
  display: block;
  overflow: hidden;
  border-radius: 999px;
  background: var(--color-surface-muted);
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
  animation: results-skeleton-shimmer 1.4s ease-in-out infinite;
}

.skeleton-code {
  width: 7rem;
  height: 0.6rem;
}

.skeleton-title {
  width: min(24rem, 70%);
  height: 1rem;
  background: var(--color-border);
}

.skeleton-badge {
  width: 4.5rem;
  height: 1.3rem;
  border-radius: var(--radius-sm);
}

.skeleton-category {
  width: 10rem;
  height: 1.2rem;
}

.skeleton-line {
  width: 100%;
  height: 0.7rem;
}

.skeleton-line-short {
  width: 60%;
}

.skeleton-tag {
  width: 4rem;
  height: 1.2rem;
  border-radius: var(--radius-sm);
}

.skeleton-date {
  width: 12rem;
  height: 0.7rem;
  margin-left: auto;
}

@keyframes results-skeleton-shimmer {
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
