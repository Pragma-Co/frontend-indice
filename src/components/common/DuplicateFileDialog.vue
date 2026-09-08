<script setup>
import Button from './Button.vue'

defineProps({
  fileName: {
    type: String,
    required: true,
  },
})

defineEmits(['discard', 'save-as-revision'])
</script>

<template>
  <div class="overlay">
    <div class="dialog" role="dialog" aria-modal="true">
      <h2 class="dialog-title">Arquivo já existe</h2>
      <p class="dialog-text">
        O arquivo <strong>{{ fileName }}</strong> já existe no sistema. Deseja salvá-lo como uma
        nova revisão?
      </p>
      <div class="dialog-actions">
        <Button variant="outline" @click="$emit('discard')">Cancelar</Button>
        <Button variant="primary" @click="$emit('save-as-revision')">Salvar como nova revisão</Button>
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
  z-index: 100;
}

.dialog {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  max-width: 420px;
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
