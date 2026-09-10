<script setup>
import { ref } from 'vue'
import { formatUpdatedAt } from '../../utils/formatters'
import StatusBadge from './StatusBadge.vue'

defineProps({
  documents: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['action'])

const ACTION_LABELS = {
  'new-revision': 'Nova revisão',
  'view-revision': 'Ver revisão',
  'continue-editing': 'Continuar edição',
}

const MENU_ITEMS = [
  { key: 'download', label: 'Baixar documento' },
  { key: 'history', label: 'Ver histórico de revisões' },
  { key: 'delete', label: 'Excluir documento' },
]

const openMenuId = ref(null)

function toggleMenu(id) {
  openMenuId.value = openMenuId.value === id ? null : id
}

function closeMenu() {
  openMenuId.value = null
}

function handleMenuItem(document, itemKey) {
  emit('action', { document, action: itemKey })
  closeMenu()
}
</script>

<template>
  <div class="table-scroll">
  <table class="documents-table">
    <thead>
      <tr>
        <th></th>
        <th>Código do documento</th>
        <th>Título</th>
        <th>Tipo</th>
        <th>Revisão atual</th>
        <th>Status</th>
        <th>Última atualização</th>
        <th class="col-actions">Ações</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="document in documents" :key="document.id">
        <td class="cell-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7 3.5Z"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linejoin="round"
            />
            <path d="M14 3.5V7a1 1 0 0 0 1 1h3.5" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
          </svg>
        </td>
        <td class="cell-code">{{ document.code }}</td>
        <td class="cell-title">{{ document.title }}</td>
        <td class="cell-type">{{ document.type }}</td>
        <td>
          <span class="revision-badge">{{ document.revision }}</span>
        </td>
        <td>
          <StatusBadge :status="document.status" />
        </td>
        <td class="cell-updated">
          <span class="updated-date">{{ formatUpdatedAt(document.updatedAt) }}</span>
          <span class="updated-by">por {{ document.updatedBy }}</span>
        </td>
        <td class="cell-actions">
          <div class="actions-inner">
            <button type="button" class="action-button" @click="emit('action', { document, action: document.action })">
              {{ ACTION_LABELS[document.action] }}
            </button>

            <div class="menu-wrapper">
              <button
                type="button"
                class="menu-trigger"
                aria-label="Mais ações"
                @click="toggleMenu(document.id)"
              >
                ⋯
              </button>

              <template v-if="openMenuId === document.id">
                <div class="menu-overlay" @click="closeMenu" />
                <div class="menu-dropdown" role="menu">
                  <button
                    v-for="item in MENU_ITEMS"
                    :key="item.key"
                    type="button"
                    role="menuitem"
                    class="menu-item"
                    @click="handleMenuItem(document, item.key)"
                  >
                    {{ item.label }}
                  </button>
                </div>
              </template>
            </div>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
  </div>
</template>

<style scoped>
.table-scroll {
  overflow-x: auto;
}

.documents-table {
  width: 100%;
  border-collapse: collapse;
}

.documents-table th {
  text-align: left;
  font-size: 0.78rem;
  color: var(--color-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.documents-table td {
  padding: 0.75rem 0.6rem;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.88rem;
  vertical-align: middle;
}

.col-actions {
  text-align: right;
}

.cell-icon {
  width: 2rem;
  color: var(--color-primary);
}

.cell-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.cell-title {
  font-weight: 600;
  min-width: 11rem;
}

.cell-type {
  color: var(--color-text-muted);
  min-width: 9rem;
}

.cell-updated {
  white-space: nowrap;
}

.updated-date {
  display: block;
  color: var(--color-text);
}

.updated-by {
  display: block;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  margin-top: 0.1rem;
}

.revision-badge {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.78rem;
  font-weight: 600;
}

.cell-actions {
  white-space: nowrap;
}

.actions-inner {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
}

.action-button {
  background: none;
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.7rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.action-button:hover {
  background: var(--color-info-bg);
}

.menu-wrapper {
  position: relative;
}

.menu-trigger {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  padding: 0.4rem 0.5rem;
  border-radius: var(--radius-sm);
}

.menu-trigger:hover {
  background: var(--color-background);
}

.menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
}

.menu-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 0.25rem);
  z-index: 20;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  min-width: 200px;
  padding: 0.35rem;
  display: flex;
  flex-direction: column;
}

.menu-item {
  background: none;
  border: none;
  text-align: left;
  padding: 0.5rem 0.6rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  color: var(--color-text);
  cursor: pointer;
}

.menu-item:hover {
  background: var(--color-background);
}
</style>
