<script setup>
defineProps({
  label: { type: String, default: 'Sugerido por IA' },
})
</script>

<template>
  <span class="ai-badge" :title="label">
    <svg class="ai-badge__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5l1.8 4.9 4.9 1.8-4.9 1.8L12 15.9l-1.8-4.9-4.9-1.8 4.9-1.8L12 2.5z" />
      <path d="M19 15l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z" />
    </svg>
    {{ label }}
  </span>
</template>

<style scoped>
.ai-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 0.4rem;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: var(--color-info-bg);
  color: var(--color-info);
  border: 1px solid var(--color-info-border);
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
  vertical-align: middle;
}

.ai-badge__icon {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
}
</style>
