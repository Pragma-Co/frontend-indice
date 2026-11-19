<script setup>
import { onBeforeUnmount } from 'vue'
import Button from '@/components/common/Button.vue'
import OverflowPill from '@/views/manager/components/OverflowPill.vue'
import PendingStatusBadge from '@/views/manager/components/PendingStatusBadge.vue'
import { formatDateTime } from '@/utils/formatters.js'

defineProps({
  revisions: { type: Array, required: true },
})

const emit = defineEmits(['evaluate'])

function hasTextSelectedIn(element) {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed) return false
  return element.contains(selection.anchorNode) || element.contains(selection.focusNode)
}

const DOUBLE_CLICK_WINDOW_MS = 250

let pendingRowClick = null

function cancelPendingRowClick() {
  clearTimeout(pendingRowClick)
  pendingRowClick = null
}

function onRowClick(event, revision) {
  cancelPendingRowClick()
  if (event.detail > 1) return
  const row = event.currentTarget
  pendingRowClick = setTimeout(() => {
    pendingRowClick = null
    if (hasTextSelectedIn(row)) return
    emit('evaluate', revision)
  }, DOUBLE_CLICK_WINDOW_MS)
}

onBeforeUnmount(cancelPendingRowClick)
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
        <tr
          v-for="revision in revisions"
          :key="revision.id"
          class="revision-row"
          tabindex="0"
          @click="onRowClick($event, revision)"
          @keydown.enter="emit('evaluate', revision)"
        >
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
          <td class="cell-actions" @click.stop @keydown.enter.stop>
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
  width: 208px;
}

.col-title {
  width: auto;
  min-width: 200px;
}

.col-discipline {
  width: 130px;
}

.col-transition {
  width: 148px;
}

.col-author {
  width: 170px;
}

.col-status {
  width: 127px;
}

.col-actions {
  width: 157px;
}

.revision-row {
  cursor: pointer;
}

.revision-row:hover {
  background: var(--color-surface-muted);
}

.revision-row:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

.pill-transition {
  white-space: nowrap;
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
