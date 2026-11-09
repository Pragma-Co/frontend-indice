<script setup>
import { Pencil } from '@lucide/vue'

defineProps({
  collaborators: { type: Array, required: true },
})

const emit = defineEmits(['edit'])
</script>

<template>
  <div class="table-scroll">
    <table class="panel-table collaborators-table">
      <colgroup>
        <col class="col-person" />
        <col class="col-groups" />
        <col class="col-actions" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">Colaborador</th>
          <th scope="col">Grupos de Acesso Atuais</th>
          <th scope="col">Ações</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="collaborator in collaborators" :key="collaborator.id">
          <td>
            <div class="person">
              <span class="person-avatar" aria-hidden="true">{{ collaborator.initials }}</span>
              <div class="person-text">
                <span class="cell-primary">{{ collaborator.name }}</span>
                <span class="cell-secondary">{{ collaborator.email }}</span>
              </div>
            </div>
          </td>
          <td>
            <ul v-if="collaborator.groups.length" class="group-chips">
              <li
                v-for="group in collaborator.groups"
                :key="group.id"
                class="group-chip"
                :class="{ inactive: !group.active }"
              >
                {{ group.active ? group.name : `${group.name} (inativo)` }}
              </li>
            </ul>
            <span v-else class="no-groups">Nenhum grupo</span>
          </td>
          <td>
            <button
              type="button"
              class="edit-button"
              :aria-label="`Gerenciar grupos de ${collaborator.name}`"
              @click="emit('edit', collaborator.id)"
            >
              <Pencil :size="15" aria-hidden="true" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped src="./panelTable.css"></style>

<style scoped>
.collaborators-table {
  min-width: 36rem;
}

.col-person {
  width: 40%;
}

.col-groups {
  width: 50%;
}

.col-actions {
  width: 10%;
}

.person {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.person-text {
  min-width: 0;
}

.person-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  font-size: 0.72rem;
  font-weight: 700;
}

.group-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.group-chip {
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  font-size: 0.74rem;
  font-weight: 500;
}

.group-chip.inactive {
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
}

.no-groups {
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

.edit-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-primary);
  cursor: pointer;
}

.edit-button:hover {
  background: var(--color-primary-bg);
}

.edit-button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

@media (max-width: 640px) {
  .collaborators-table {
    min-width: 0;
  }

  .collaborators-table colgroup,
  .collaborators-table thead {
    display: none;
  }

  .collaborators-table,
  .collaborators-table tbody,
  .collaborators-table tr,
  .collaborators-table td {
    display: block;
  }

  .collaborators-table tr {
    position: relative;
    padding: 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  .collaborators-table tbody tr:last-child {
    border-bottom: none;
  }

  .collaborators-table td,
  .collaborators-table tbody tr:last-child td {
    padding: 0;
    border-bottom: none;
  }

  .collaborators-table td:first-child {
    padding-right: 3rem;
  }

  .collaborators-table td:nth-child(2) {
    margin-top: 0.75rem;
  }

  .collaborators-table td:last-child {
    position: absolute;
    top: 1rem;
    right: 1rem;
  }
}
</style>
