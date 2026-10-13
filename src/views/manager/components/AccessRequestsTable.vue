<script setup>
import OverflowPill from '@/views/manager/components/OverflowPill.vue'
import PendingStatusBadge from '@/views/manager/components/PendingStatusBadge.vue'
import { formatDateTime } from '@/utils/formatters.js'

defineProps({
  requests: { type: Array, required: true },
})
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
      </colgroup>
      <thead>
        <tr>
          <th scope="col">Código do documento</th>
          <th scope="col">Título do documento</th>
          <th scope="col">Disciplina</th>
          <th scope="col">Solicitante</th>
          <th scope="col">Data do pedido</th>
          <th scope="col">Status</th>
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
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped src="./panelTable.css"></style>

<style scoped>
.col-code {
  width: 17%;
}

.col-title {
  width: 31%;
}

.col-discipline {
  width: 13%;
}

.col-requester {
  width: 15%;
}

.col-date {
  width: 14%;
}

.col-status {
  width: 10%;
}

.cell-date {
  color: var(--color-text-muted);
  white-space: nowrap;
}
</style>
