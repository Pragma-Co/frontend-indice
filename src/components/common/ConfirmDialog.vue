<script setup>
import { onMounted, onUnmounted } from 'vue'
import Button from '@/components/common/Button.vue'

const props = defineProps({
  title: { type: String, required: true },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Confirmar' },
  cancelLabel: { type: String, default: 'Cancelar' },
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'danger'].includes(value),
  },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['confirm', 'cancel'])

function onKeydown(event) {
  if (event.key === 'Escape' && !props.loading) emit('cancel')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="overlay" @click.self="!loading && emit('cancel')">
    <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
      <h2 id="confirm-title" class="dialog-title">{{ title }}</h2>
      <p v-if="message" class="dialog-text">{{ message }}</p>
      <slot />
      <div class="dialog-actions">
        <Button variant="outline" :disabled="loading" @click="emit('cancel')">
          {{ cancelLabel }}
        </Button>
        <Button :variant="variant" :loading="loading" @click="emit('confirm')">
          {{ confirmLabel }}
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.dialog {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  max-width: 440px;
  width: 90%;
}

.dialog-title {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.dialog-text {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  line-height: 1.4;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}
</style>
