<script setup>
defineProps({
  label: { type: String, required: true },
  htmlFor: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  error: { type: String, default: '' },
})
</script>

<template>
  <div class="field" :class="{ 'field--invalid': error }">
    <label class="field__label" :for="htmlFor">
      {{ label }}
      <span v-if="required" class="field__required" aria-hidden="true">*</span>
    </label>
    <slot />
    <p v-if="error" class="field__error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field__label {
  font-size: 0.85rem;
  font-weight: 600;
}

.field__required {
  color: var(--color-danger);
  margin-left: 0.15rem;
}

.field__error {
  font-size: 0.8rem;
  color: var(--color-danger);
}

.field :deep(input),
.field :deep(select),
.field :deep(textarea) {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.field :deep(input:focus),
.field :deep(select:focus),
.field :deep(textarea:focus) {
  outline: 2px solid var(--color-primary-soft);
  border-color: var(--color-primary);
}

.field :deep(input[readonly]),
.field :deep(input:disabled) {
  background: var(--color-disabled-bg);
  color: var(--color-text-muted);
}

.field--invalid :deep(input),
.field--invalid :deep(select) {
  border-color: var(--color-danger);
}
</style>
