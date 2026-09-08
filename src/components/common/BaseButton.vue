<script setup>
defineProps({
  variant: { type: String, default: 'primary' }, // primary | secondary
  type: { type: String, default: 'button' },
  disabled: { type: Boolean, default: false },
})
</script>

<template>
  <button :type="type" class="btn" :class="`btn--${variant}`" :disabled="disabled">
    <slot />
  </button>
</template>

<style scoped>
.btn {
  font-weight: 600;
  border-radius: var(--radius-sm);
  padding: 0.6rem 1.4rem;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn--primary {
  color: #fff;
  background: var(--color-primary);
}

.btn--primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.btn--secondary {
  color: var(--color-text);
  background: var(--color-surface);
  border-color: var(--color-border);
}

.btn--secondary:hover:not(:disabled) {
  background: var(--color-disabled-bg);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
