<script setup>
defineProps({
  label: { type: String, required: true },
  /** stack: label above the value; row: label and value side by side */
  layout: { type: String, default: 'stack' },
})
</script>

<template>
  <div class="kv" :class="`kv-${layout}`">
    <dt class="kv-label">{{ label }}</dt>
    <dd class="kv-value"><slot /></dd>
  </div>
</template>

<style scoped>
.kv {
  display: flex;
  gap: 0.25rem;
  margin: 0;
}

.kv-stack {
  flex-direction: column;
}

.kv-row {
  flex-direction: row;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
}

.kv-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.kv-value {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  word-break: break-word;
}

.kv-row .kv-value {
  text-align: right;
}
</style>
