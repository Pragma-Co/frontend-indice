<script setup>
defineProps({
  status: {
    type: String,
    required: true,
    validator: (value) => ['vigente', 'em_revisao', 'rascunho'].includes(value),
  },
})

const STATUS_LABELS = {
  vigente: 'Vigente',
  em_revisao: 'Em revisão',
  rascunho: 'Rascunho',
}
</script>

<template>
  <span class="status-badge" :class="`status-${status}`">
    <span class="status-dot" aria-hidden="true" />
    {{ STATUS_LABELS[status] }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  border: 1px solid transparent;
  white-space: nowrap;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-vigente {
  background: var(--color-success-bg);
  color: var(--color-success);
  border-color: var(--color-success-border);
}

.status-vigente .status-dot {
  background: var(--color-success);
}

.status-em_revisao {
  background: var(--color-warning-bg);
  color: var(--color-warning);
  border-color: var(--color-warning-border);
}

.status-em_revisao .status-dot {
  background: var(--color-warning);
}

.status-rascunho {
  background: var(--color-background);
  color: var(--color-text-muted);
  border-color: var(--color-border);
}

.status-rascunho .status-dot {
  background: var(--color-text-muted);
}
</style>
