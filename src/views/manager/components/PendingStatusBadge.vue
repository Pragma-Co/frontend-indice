<script setup>
import { Clock } from '@lucide/vue'
</script>

<template>
  <span class="pending-badge">
    <Clock :size="13" aria-hidden="true" />
    Pendente
  </span>
</template>

<style scoped>
.pending-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  border: 1px solid var(--color-warning-border);
  border-radius: 999px;
  background: var(--color-warning-bg);
  color: var(--color-warning);
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}
</style>
