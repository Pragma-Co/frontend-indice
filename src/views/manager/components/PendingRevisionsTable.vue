<script setup>
import Button from '@/components/common/Button.vue'
import OverflowPill from '@/views/manager/components/OverflowPill.vue'
import PendingStatusBadge from '@/views/manager/components/PendingStatusBadge.vue'
import { formatDateTime } from '@/utils/formatters.js'

defineProps({
  revisions: { type: Array, required: true },
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
        <col class="col-transition" />
        <col class="col-author" />
        <col class="col-status" />
        <col class="col-actions" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">Código do documento</th>
          <th scope="col">Título do documento</th>
          <th scope="col">Disciplina</th>
          <th scope="col">Transição</th>
          <th scope="col">Autor &amp; Data</th>
          <th scope="col">Status</th>
          <th scope="col">Ações</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="revision in revisions" :key="revision.id">
          <td class="cell-code">{{ revision.code }}</td>
          <td class="cell-title">{{ revision.title }}</td>
          <td>
            <OverflowPill :text="revision.discipline" />
          </td>
          <td>
            <span class="pill pill-transition">
              {{ revision.fromRevision }} → {{ revision.toRevision }}
            </span>
          </td>
          <td>
            <span class="cell-primary">{{ revision.authorName }}</span>
            <span class="cell-secondary">{{ formatDateTime(revision.createdAt) }}</span>
          </td>
          <td>
            <PendingStatusBadge />
          </td>
          <td class="cell-actions">
            <Button class="evaluate-button" @click="emit('evaluate', revision)">
              Avaliar Revisão
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
  width: 26%;
}

.col-discipline {
  width: 11%;
}

.col-transition {
  width: 13%;
}

.col-author {
  width: 14%;
}

.col-status {
  width: 9%;
}

.col-actions {
  width: 12%;
}

.pill-transition {
  border-color: var(--color-info-border);
  background: var(--color-info-bg);
  color: var(--color-primary);
  font-weight: 600;
}

.cell-actions {
  text-align: right;
}

.evaluate-button {
  padding: 0.5rem 0.9rem;
  font-size: 0.8rem;
  white-space: nowrap;
}
</style>
