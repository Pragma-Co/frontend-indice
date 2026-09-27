<script setup>
import { computed, reactive, watch } from 'vue'
import Button from '@/components/common/Button.vue'
import { countActiveFilters, emptyFilters } from '@/utils/resultFilters.js'

const props = defineProps({
  filters: { type: Object, required: true },
  options: { type: Object, required: true },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['apply', 'clear'])

const draft = reactive(emptyFilters())

function resetDraft(filters) {
  Object.assign(draft, emptyFilters(), {
    ...filters,
    tipo: [...(filters.tipo ?? [])],
    area: [...(filters.area ?? [])],
    discipline: [...(filters.discipline ?? [])],
    status: [...(filters.status ?? [])],
  })
}

watch(() => props.filters, resetDraft, { immediate: true, deep: true })

const groups = computed(() => [
  {
    name: 'tipo',
    title: 'Tipo de documento',
    items: (props.options.types ?? []).map((type) => ({ value: type.code, label: type.name })),
  },
  {
    name: 'area',
    title: 'Área',
    items: (props.options.areas ?? []).map((area) => ({ value: area.acronym, label: area.name })),
  },
  {
    name: 'discipline',
    title: 'Disciplina',
    items: (props.options.disciplines ?? []).map((discipline) => ({
      value: discipline.code,
      label: discipline.name,
    })),
  },
  {
    name: 'status',
    title: 'Status',
    items: (props.options.statuses ?? []).map((status) => ({
      value: status.value,
      label: status.label,
    })),
  },
])

const activeCount = computed(() => countActiveFilters(draft))

function choosePreset(event) {
  draft.data = event.target.value
  if (draft.data) {
    draft.dateFrom = ''
    draft.dateTo = ''
  }
}

function chooseRange(field, event) {
  draft[field] = event.target.value
  if (event.target.value) draft.data = ''
}

function apply() {
  emit('apply', { ...draft })
}

function clear() {
  resetDraft({ q: draft.q })
  emit('clear')
}
</script>

<template>
  <form class="card filter-panel" aria-label="Filtros avançados" @submit.prevent="apply">
    <h2 class="filter-panel-title">Filtros Avançados</h2>

    <p v-if="loading" class="filter-panel-hint">Carregando filtros...</p>

    <div class="filter-scroll">
      <fieldset v-for="group in groups" :key="group.name" class="filter-group">
        <legend>{{ group.title }}</legend>
        <label v-for="item in group.items" :key="item.value" class="filter-option">
          <input
            v-model="draft[group.name]"
            type="checkbox"
            :name="group.name"
            :value="item.value"
          />
          <span>{{ item.label }}</span>
        </label>
        <p v-if="!loading && !group.items.length" class="filter-panel-hint">
          Sem opções disponíveis.
        </p>
      </fieldset>

      <fieldset class="filter-group">
        <legend>Data de emissão</legend>
        <label class="filter-field">
          <span>Período</span>
          <select name="data" :value="draft.data" @change="choosePreset">
            <option value="">Qualquer data</option>
            <option v-for="date in props.options.dates ?? []" :key="date.value" :value="date.value">
              {{ date.label }}
            </option>
          </select>
        </label>
        <div class="filter-range">
          <label class="filter-field">
            <span>De</span>
            <input
              type="date"
              name="date_from"
              :value="draft.dateFrom"
              :max="draft.dateTo || undefined"
              @change="chooseRange('dateFrom', $event)"
            />
          </label>
          <label class="filter-field">
            <span>Até</span>
            <input
              type="date"
              name="date_to"
              :value="draft.dateTo"
              :min="draft.dateFrom || undefined"
              @change="chooseRange('dateTo', $event)"
            />
          </label>
        </div>
      </fieldset>
    </div>

    <div class="filter-actions">
      <Button variant="primary">
        Aplicar Filtros<span v-if="activeCount"> ({{ activeCount }})</span>
      </Button>
      <Button variant="outline" type="button" @click="clear">Limpar</Button>
    </div>
  </form>
</template>

<style scoped>
.filter-panel {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  margin-top: 0;
  padding: 1.25rem;

  max-height: calc(100vh - 8rem);
  min-height: 0;
  overflow: hidden;
}

.filter-panel-title {
  flex-shrink: 0;
  font-size: 0.95rem;
}

.filter-panel-hint {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.filter-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding-right: 0.25rem;
  scrollbar-gutter: stable;
}

.filter-scroll::-webkit-scrollbar {
  width: 4px;
}

.filter-scroll::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  border: none;
  min-width: 0;
}

.filter-group legend {
  margin-bottom: 0.5rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.filter-option {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.filter-option input {
  margin-top: 0.15rem;
  accent-color: var(--color-primary);
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.filter-field select,
.filter-field input {
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  font-size: 0.82rem;
}

.filter-range {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}
</style>
