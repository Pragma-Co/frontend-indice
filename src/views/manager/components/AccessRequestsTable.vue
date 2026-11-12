<script setup>
import Button from '@/components/common/Button.vue'
import OverflowPill from '@/views/manager/components/OverflowPill.vue'
import PendingStatusBadge from '@/views/manager/components/PendingStatusBadge.vue'
import { formatDateTime } from '@/utils/formatters.js'

defineProps({
  requests: { type: Array, required: true },
})

const emit = defineEmits(['evaluate'])
</script>

<template>
  <div class="table-scroll">
    <table class="panel-table">
      <colgroup>
        <col class="col-code" />
        <col class="col-title" />
        <col class="col-discipline" />
        <col class="col-requester" />
        <col class="col-date" />
        <col class="col-status" />
        <col class="col-actions" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">Código do documento</th>
          <th scope="col">Título do documento</th>
          <th scope="col">Disciplina</th>
          <th scope="col">Solicitante</th>
          <th scope="col">Data do pedido</th>
          <th scope="col">Status</th>
          <th scope="col">Ações</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="request in requests" :key="request.id">
          <td class="cell-code">{{ request.code }}</td>
          <td class="cell-title">{{ request.title }}</td>
          <td>
            <OverflowPill :text="request.discipline" />
          </td>
          <td>
            <span class="cell-primary">{{ request.requesterName }}</span>
            <span v-if="request.requesterArea" class="cell-secondary">
              {{ request.requesterArea }}
            </span>
          </td>
          <td class="cell-date">{{ formatDateTime(request.requestedAt) }}</td>
          <td>
            <PendingStatusBadge />
          </td>
          <td>
            <Button
              type="button"
              :aria-label="`Avaliar acesso de ${request.requesterName} para ${request.code}`"
              @click="emit('evaluate', request)"
            >
              Avaliar Acesso
            </Button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped src="./panelTable.css"></style>

<style scoped>
.col-code {
  width: 15%;
}

.col-title {
  width: 22%;
}

.col-discipline {
  width: 10%;
}

.col-requester {
  width: 12%;
}

.col-date {
  width: 13%;
}

.col-status {
  width: 9%;
}

.col-actions {
  width: 19%;
}

.cell-date {
  color: var(--color-text-muted);
  white-space: nowrap;
}

td :deep(.btn) {
  padding: 0.45rem 0.65rem;
  font-size: 0.78rem;
}

.table-scroll :deep(.panel-table) {
  min-width: 72rem;
}
</style>
