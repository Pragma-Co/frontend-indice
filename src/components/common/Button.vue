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
  loading: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['click'])
</script>

<template>
  <button
    class="btn"
    :class="[`btn-${variant}`, { 'btn-loading': loading }]"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="btn-spinner" aria-hidden="true" />
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

.btn-loading:disabled {
  cursor: progress;
  opacity: 0.8;
}

.btn-spinner {
  display: inline-block;
  width: 0.9em;
  height: 0.9em;
  margin-right: 0.5rem;
  vertical-align: -0.1em;
  border-radius: 50%;
  border: 2px solid currentColor;
  border-right-color: transparent;
  animation: btn-spin 0.7s linear infinite;
}

@keyframes btn-spin {
  to {
    transform: rotate(360deg);
  }
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
