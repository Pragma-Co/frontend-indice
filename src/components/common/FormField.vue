<script setup>
defineProps({
  label: { type: String, required: true },
  htmlFor: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  error: { type: String, default: '' },
  /** Icon drawn inside the control, at the left: 'search' | 'document'. */
  icon: {
    type: String,
    default: '',
    validator: (value) => ['', 'search', 'document'].includes(value),
  },
})
</script>

<template>
  <div class="field" :class="{ 'field--invalid': error, 'field--with-icon': icon }">
    <label class="field__label" :for="htmlFor">
      {{ label }}
      <span v-if="required" class="field__required" aria-hidden="true">*</span>
    </label>
    <div class="field__control">
      <span v-if="icon" class="field__icon" aria-hidden="true">
        <svg v-if="icon === 'search'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" stroke-linecap="round" />
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke-linejoin="round" />
          <path d="M14 3v5h5" stroke-linejoin="round" />
        </svg>
      </span>
      <slot />
    </div>
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
  color: var(--color-text);
}

.field__required {
  color: var(--color-danger);
  margin-left: 0.15rem;
}

.field__error {
  font-size: 0.8rem;
  color: var(--color-danger);
}

.field__control {
  position: relative;
}

.field__icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  width: 16px;
  height: 16px;
  color: var(--color-text-muted);
  pointer-events: none;
}

.field__icon svg {
  width: 100%;
  height: 100%;
}

.field :deep(input),
.field :deep(select),
.field :deep(textarea) {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.field--with-icon :deep(input),
.field--with-icon :deep(select) {
  padding-left: 2.35rem;
}

.field :deep(input:focus),
.field :deep(select:focus),
.field :deep(textarea:focus) {
  outline: 2px solid var(--color-primary-bg);
  border-color: var(--color-primary);
}

.field :deep(input[readonly]),
.field :deep(input:disabled) {
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
}

.field--invalid :deep(input),
.field--invalid :deep(select),
.field--invalid :deep(textarea),
.field--invalid :deep(.tags) {
  border-color: var(--color-danger);
}
</style>
