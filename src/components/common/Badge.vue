<script setup>
defineProps({
  /** neutral | public | confidential | secret */
  variant: { type: String, default: 'neutral' },
})
</script>

<template>
  <span class="badge" :class="`badge-${variant}`"><slot /></span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface-muted);
  color: var(--color-text);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.badge-public {
  background: var(--color-success-bg);
  border-color: var(--color-success-border);
  color: var(--color-success);
}

.badge-confidential {
  background: var(--color-warning-bg);
  border-color: var(--color-warning-border);
  color: var(--color-warning);
}

.badge-secret {
  background: var(--color-danger-bg);
  border-color: var(--color-danger-border);
  color: var(--color-danger);
}
</style>
