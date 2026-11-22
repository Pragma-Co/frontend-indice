<script setup>
import DecisionBadge from '@/views/manager/components/DecisionBadge.vue'
import { requestTypeLabel } from '@/utils/decisionHistory.js'
import { formatDateTime } from '@/utils/formatters.js'

defineProps({
  decisions: { type: Array, required: true },
})

const emit = defineEmits(['select'])
</script>

<template>
  <div class="table-scroll">
    <table class="panel-table">
      <colgroup>
        <col class="col-code" />
        <col class="col-title" />
        <col class="col-revision" />
        <col class="col-type" />
        <col class="col-requester" />
        <col class="col-decision" />
        <col class="col-user" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">Código do documento</th>
          <th scope="col">Título do documento</th>
          <th scope="col">Revisão</th>
          <th scope="col">Tipo de solicitação</th>
          <th scope="col">Solicitante</th>
          <th scope="col">Decisão</th>
          <th scope="col">Responsável &amp; Data</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in decisions" :key="item.id">
          <td class="cell-code">
            <button
              type="button"
              class="code-link"
              :aria-label="`Ver motivo da decisão sobre ${item.code}`"
              @click="emit('select', item)"
            >
              {{ item.code }}
            </button>
          </td>
          <td class="cell-title">{{ item.title || '—' }}</td>
          <td>
            <span v-if="item.revision" class="pill pill-revision">{{ item.revision }}</span>
            <span v-else class="cell-muted">—</span>
          </td>
          <td>
            <span class="pill pill-type">{{ requestTypeLabel(item.requestType) }}</span>
          </td>
          <td>{{ item.requesterName }}</td>
          <td>
            <DecisionBadge :request-type="item.requestType" :decision="item.decision" />
          </td>
          <td>
            <span class="cell-primary">{{ item.userName }}</span>
            <span class="cell-secondary">{{ formatDateTime(item.decidedAt) }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped src="./panelTable.css"></style>

<style scoped>
.col-code {
  width: 208px;
}

.col-title {
  width: auto;
  min-width: 200px;
}

.col-revision {
  width: 100px;
}

.col-type {
  width: 150px;
}

.col-requester {
  width: 160px;
}

.col-decision {
  width: 140px;
}

.col-user {
  width: 170px;
}

.code-link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-primary);
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  text-align: left;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.code-link:hover {
  text-decoration-thickness: 2px;
}

.code-link:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.cell-muted {
  color: var(--color-text-muted);
}

.pill-revision {
  white-space: nowrap;
  border-color: var(--color-info-border);
  background: var(--color-info-bg);
  color: var(--color-primary);
  font-weight: 600;
}

.pill-type {
  white-space: nowrap;
}

.table-scroll :deep(.panel-table) {
  min-width: 72rem;
}
</style>
