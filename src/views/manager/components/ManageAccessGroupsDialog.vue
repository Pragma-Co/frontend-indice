<script setup>
import { computed, ref } from 'vue'
import Button from '@/components/common/Button.vue'
import AccessGroupDialogShell from '@/views/manager/components/AccessGroupDialogShell.vue'
import { findConfidentiality } from '@/utils/documentCatalog.js'

const props = defineProps({
  collaborator: { type: Object, required: true },
  groups: { type: Array, required: true },
  areaName: { type: String, default: '' },
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['close', 'save'])

const selectedGroupIds = ref([...props.collaborator.groupIds])

const selectedLabel = computed(() => {
  const total = selectedGroupIds.value.length
  return total === 1 ? '1 selecionado' : `${total} selecionados`
})

const hasChanges = computed(() => {
  const current = props.collaborator.groupIds
  return (
    current.length !== selectedGroupIds.value.length ||
    current.some((groupId) => !selectedGroupIds.value.includes(groupId))
  )
})

function cannotBeAssigned(group) {
  return !group.active && !props.collaborator.groupIds.includes(group.id)
}

function detailFor(group) {
  if (group.description) return group.description
  const level = findConfidentiality(group.secrecyLevel)?.label
  return level ? `Nível de sigilo: ${level}` : ''
}
</script>

<template>
  <AccessGroupDialogShell
    :title="`Gerenciar Grupos de Acesso - ${collaborator.name}`"
    :subtitle="areaName ? `Área: ${areaName}` : ''"
    :busy="saving"
    @close="emit('close')"
  >
    <fieldset class="groups-fieldset">
      <div class="groups-heading">
        <legend>Selecione os grupos de acesso</legend>
        <span class="groups-counter" aria-live="polite">{{ selectedLabel }}</span>
      </div>

      <ul v-if="groups.length" class="groups-list">
        <li v-for="group in groups" :key="group.id">
          <label
            class="group-option"
            :class="{
              selected: selectedGroupIds.includes(group.id),
              locked: cannotBeAssigned(group),
            }"
          >
            <input
              v-model="selectedGroupIds"
              type="checkbox"
              :value="group.id"
              :disabled="saving || cannotBeAssigned(group)"
            />
            <span class="group-option-text">
              <span class="group-option-name">
                {{ group.name }}
                <span v-if="!group.active" class="group-option-inactive">Inativo</span>
              </span>
              <span v-if="detailFor(group)" class="group-option-detail">
                {{ detailFor(group) }}
              </span>
            </span>
          </label>
        </li>
      </ul>
      <p v-else class="groups-empty">Nenhum grupo de acesso criado nesta área.</p>
    </fieldset>

    <p class="groups-hint">Apenas os grupos da sua área estão disponíveis para atribuição.</p>
    <p v-if="error" class="groups-error" role="alert">{{ error }}</p>

    <template #footer>
      <Button variant="outline" :disabled="saving" @click="emit('close')">Cancelar</Button>
      <Button
        :loading="saving"
        :disabled="!hasChanges"
        @click="emit('save', [...selectedGroupIds])"
      >
        Salvar Alterações
      </Button>
    </template>
  </AccessGroupDialogShell>
</template>

<style scoped>
.groups-fieldset {
  min-width: 0;
  padding: 0;
  border: none;
}

.groups-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.groups-heading legend {
  padding: 0;
  font-size: 0.9rem;
  font-weight: 600;
}

.groups-counter {
  flex-shrink: 0;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  font-size: 0.72rem;
  font-weight: 600;
}

.groups-list {
  margin: 0;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  list-style: none;
  overflow: hidden;
}

.groups-list li + li {
  border-top: 1px solid var(--color-border);
}

.group-option {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.7rem 0.85rem;
  cursor: pointer;
}

.group-option:hover,
.group-option.selected {
  background: var(--color-surface-muted);
}

.group-option.locked {
  cursor: not-allowed;
  opacity: 0.6;
}

.group-option input {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
  margin-top: 0.15rem;
  accent-color: var(--color-primary);
}

.group-option-text {
  min-width: 0;
  overflow-wrap: anywhere;
}

.group-option-name {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
}

.group-option-inactive {
  margin-left: 0.35rem;
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  background: var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.68rem;
}

.group-option-detail {
  display: block;
  margin-top: 0.15rem;
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.groups-empty,
.groups-hint {
  color: var(--color-text-muted);
  font-size: 0.78rem;
}

.groups-hint {
  margin-top: 0.75rem;
}

.groups-error {
  margin-top: 0.75rem;
  color: var(--color-danger);
  font-size: 0.82rem;
}
</style>
