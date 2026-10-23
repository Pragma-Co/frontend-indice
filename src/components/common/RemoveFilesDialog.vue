<script setup>
import { computed } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps({
  files: { type: Array, required: true },
})

defineEmits(['confirm', 'cancel'])

const title = computed(() =>
  props.files.length === 1 ? 'Excluir arquivo?' : `Excluir ${props.files.length} arquivos?`,
)
const message = computed(() =>
  props.files.length === 1
    ? 'O arquivo abaixo será removido desta operação.'
    : 'Os arquivos abaixo serão removidos desta operação.',
)
</script>

<template>
  <ConfirmDialog
    :title="title"
    :message="message"
    confirm-label="Excluir"
    variant="danger"
    @confirm="$emit('confirm')"
    @cancel="$emit('cancel')"
  >
    <ul class="remove-list">
      <li v-for="file in files" :key="file.id" class="remove-item">{{ file.name }}</li>
    </ul>
  </ConfirmDialog>
</template>

<style scoped>
.remove-list {
  list-style: none;
  margin-top: 0.75rem;
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.remove-item {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.45rem 0.75rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-item + .remove-item {
  border-top: 1px solid var(--color-border);
}
</style>
