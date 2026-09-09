<script setup>
defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'outline'].includes(value),
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['click'])
</script>

<template>
  <button
    class="btn"
    :class="`btn-${variant}`"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<style scoped>
.btn {
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.65rem 1.5rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: 1px solid transparent;
  transition: background-color 0.15s ease;
}

.btn:disabled {
  cursor: default;
  opacity: 0.5;
}

.btn-primary {
  background: var(--color-primary);
  color: var(--color-text-inverse);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-outline {
  background: var(--color-surface);
  color: var(--color-text);
  border-color: var(--color-border);
}

.btn-outline:hover:not(:disabled) {
  background: var(--color-background);
}
</style>
