<script setup>
import { Trash2 } from '@lucide/vue'
import FileTypeIcon from '@/components/common/FileTypeIcon.vue'
import { formatFileSize } from '@/utils/formatters.js'

defineProps({
  items: { type: Array, required: true },
})

defineEmits(['remove'])

const STATUS_LABELS = {
  validating: 'Validando...',
  ready: 'Aguardando envio',
  success: 'Pronto para envio',
  duplicate: 'Arquivo duplicado',
  error: 'Falha no carregamento',
}

const FAILED_STATUSES = ['invalid', 'duplicate', 'error']

function statusLabel(item) {
  if (item.status === 'uploading') return `Carregando... ${item.progress}%`
  if (item.status === 'invalid') return item.error
  return STATUS_LABELS[item.status]
}
</script>

<template>
  <ul class="file-list">
    <li v-for="item in items" :key="item.id" class="file-row">
      <FileTypeIcon :file-name="item.name" />
      <div class="file-info">
        <span class="file-name">{{ item.name }}</span>
        <span
          class="file-status"
          :class="{ 'file-status-failed': FAILED_STATUSES.includes(item.status) }"
        >
          {{ formatFileSize(item.size) }} • {{ statusLabel(item) }}
        </span>
      </div>
      <button
        type="button"
        class="file-remove"
        :aria-label="`Remover ${item.name}`"
        @click="$emit('remove', item.id)"
      >
        <Trash2 :size="16" aria-hidden="true" />
      </button>
    </li>
  </ul>
</template>

<style scoped>
.file-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.6rem 0.75rem;
}

.file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.file-name {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace;
  font-size: 0.8rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-status {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 0.15rem;
}

.file-status-failed {
  color: var(--color-danger);
}

.file-remove {
  display: inline-flex;
  background: none;
  border: none;
  color: var(--color-danger);
  cursor: pointer;
  padding: 0.35rem;
  border-radius: var(--radius-sm);
}

.file-remove:hover {
  background: var(--color-danger-bg);
}
</style>
