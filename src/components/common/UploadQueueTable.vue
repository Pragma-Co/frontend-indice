<script setup>
import { formatFileSize } from '../../utils/formatters'

defineProps({
  items: {
    type: Array,
    required: true,
  },
})

const STATUS_LABELS = {
  validating: 'Validando...',
  ready: 'Pronto',
  success: 'Concluído',
  invalid: null, // uses item.error
  duplicate: 'Duplicado',
  error: 'Falha no envio',
}
</script>

<template>
  <table class="queue-table">
    <thead>
      <tr>
        <th>Nome</th>
        <th>Tipo</th>
        <th>Tamanho</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="item in items" :key="item.id">
        <td class="cell-name">{{ item.name }}</td>
        <td class="cell-muted">{{ item.typeLabel }}</td>
        <td class="cell-muted">{{ formatFileSize(item.size) }}</td>
        <td>
          <div v-if="item.status === 'uploading'" class="progress">
            <span class="progress-label">Carregando... {{ item.progress }}%</span>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: `${item.progress}%` }" />
            </div>
          </div>
          <span
            v-else
            class="badge"
            :class="{
              'badge-success': item.status === 'ready' || item.status === 'success',
              'badge-warning': item.status === 'invalid' || item.status === 'duplicate' || item.status === 'error',
              'badge-neutral': item.status === 'validating',
            }"
          >
            {{ item.status === 'invalid' ? item.error : STATUS_LABELS[item.status] }}
          </span>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.queue-table {
  width: 100%;
  border-collapse: collapse;
}

.queue-table th {
  text-align: left;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-weight: 600;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.queue-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.9rem;
}

.cell-name {
  font-weight: 600;
}

.cell-muted {
  color: var(--color-text-muted);
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  border: 1px solid transparent;
}

.badge-success {
  background: var(--color-success-bg);
  color: var(--color-success);
  border-color: var(--color-success-border);
}

.badge-warning {
  background: var(--color-warning-bg);
  color: var(--color-warning);
  border-color: var(--color-warning-border);
}

.badge-neutral {
  background: var(--color-background);
  color: var(--color-text-muted);
  border-color: var(--color-border);
}

.progress {
  min-width: 160px;
}

.progress-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-primary);
}

.progress-track {
  margin-top: 0.3rem;
  height: 6px;
  border-radius: 999px;
  background: var(--color-border);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.2s ease;
}
</style>
