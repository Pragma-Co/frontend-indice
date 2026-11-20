<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Calendar, ChevronDown, ClipboardCheck, FileText } from '@lucide/vue'
import Button from '@/components/common/Button.vue'
import DatePicker from '@/components/common/DatePicker.vue'
import {
  HISTORY_DECISIONS,
  HISTORY_REQUEST_TYPES,
  REQUEST_TYPE_LABELS,
} from '@/utils/decisionHistory.js'

const props = defineProps({
  filters: { type: Object, required: true },
  periodInvalid: { type: Boolean, default: false },
  hasFilters: { type: Boolean, default: false },
})

const emit = defineEmits(['change', 'clear'])

const requestTypeOptions = Object.values(HISTORY_REQUEST_TYPES).map((value) => ({
  value,
  label: REQUEST_TYPE_LABELS[value],
}))

const decisionOptions = [
  { value: HISTORY_DECISIONS.APPROVED, label: 'Aprovada / Deferida' },
  { value: HISTORY_DECISIONS.REJECTED, label: 'Reprovada / Indeferida' },
]

const openMenu = ref('')
const root = ref(null)

function formatDate(value) {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

const periodLabel = computed(() => {
  const { dateFrom, dateTo } = props.filters
  if (dateFrom && dateTo) return `${formatDate(dateFrom)} a ${formatDate(dateTo)}`
  if (dateFrom) return `A partir de ${formatDate(dateFrom)}`
  if (dateTo) return `Até ${formatDate(dateTo)}`
  return 'Qualquer data'
})

const requestTypeLabel = computed(
  () =>
    requestTypeOptions.find((option) => option.value === props.filters.requestType)?.label ?? '',
)
const decisionLabel = computed(
  () => decisionOptions.find((option) => option.value === props.filters.decision)?.label ?? '',
)

function toggleMenu(menu) {
  openMenu.value = openMenu.value === menu ? '' : menu
}

function choose(name, value) {
  emit('change', name, value)
  openMenu.value = ''
}

function closeOnOutsideClick(event) {
  if (!root.value?.contains(event.target)) openMenu.value = ''
}

function closeOnEscape(event) {
  if (event.key === 'Escape') openMenu.value = ''
}

onMounted(() => {
  document.addEventListener('mousedown', closeOnOutsideClick)
  document.addEventListener('keydown', closeOnEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', closeOnOutsideClick)
  document.removeEventListener('keydown', closeOnEscape)
})
</script>

<template>
  <form
    ref="root"
    class="history-filters"
    role="search"
    aria-label="Filtrar histórico"
    @submit.prevent
  >
    <div class="filter-control">
      <button
        class="filter-trigger"
        :class="{ 'is-active': filters.dateFrom || filters.dateTo }"
        type="button"
        aria-haspopup="dialog"
        :aria-expanded="openMenu === 'period'"
        @click="toggleMenu('period')"
      >
        <Calendar :size="15" aria-hidden="true" />
        <span>Período</span>
        <small>{{ periodLabel }}</small>
        <ChevronDown :size="14" aria-hidden="true" />
      </button>
      <div v-if="openMenu === 'period'" class="date-menu" role="dialog" aria-label="Período">
        <p>Escolha um intervalo</p>
        <label>
          De
          <DatePicker
            name="date_from"
            label="Data inicial"
            :model-value="filters.dateFrom"
            :max="filters.dateTo || undefined"
            :invalid="periodInvalid"
            @update:model-value="emit('change', 'dateFrom', $event)"
          />
        </label>
        <label>
          Até
          <DatePicker
            name="date_to"
            label="Data final"
            :model-value="filters.dateTo"
            :min="filters.dateFrom || undefined"
            :invalid="periodInvalid"
            @update:model-value="emit('change', 'dateTo', $event)"
          />
        </label>
        <button class="date-apply" type="button" @click="openMenu = ''">Aplicar</button>
      </div>
    </div>

    <div class="filter-control">
      <button
        class="filter-trigger"
        :class="{ 'is-active': filters.requestType }"
        type="button"
        aria-haspopup="listbox"
        :aria-expanded="openMenu === 'requestType'"
        @click="toggleMenu('requestType')"
      >
        <FileText :size="15" aria-hidden="true" />
        <span>Tipo</span>
        <small v-if="requestTypeLabel">{{ requestTypeLabel }}</small>
        <ChevronDown :size="14" aria-hidden="true" />
      </button>
      <div
        v-if="openMenu === 'requestType'"
        class="filter-menu"
        role="listbox"
        aria-label="Tipos de solicitação"
      >
        <button
          type="button"
          role="option"
          :aria-selected="!filters.requestType"
          :class="{ selected: !filters.requestType }"
          @click="choose('requestType', '')"
        >
          Todos os tipos
        </button>
        <button
          v-for="option in requestTypeOptions"
          :key="option.value"
          type="button"
          role="option"
          :aria-selected="filters.requestType === option.value"
          :class="{ selected: filters.requestType === option.value }"
          @click="choose('requestType', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div class="filter-control">
      <button
        class="filter-trigger"
        :class="{ 'is-active': filters.decision }"
        type="button"
        aria-haspopup="listbox"
        :aria-expanded="openMenu === 'decision'"
        @click="toggleMenu('decision')"
      >
        <ClipboardCheck :size="15" aria-hidden="true" />
        <span>Decisão</span>
        <small v-if="decisionLabel">{{ decisionLabel }}</small>
        <ChevronDown :size="14" aria-hidden="true" />
      </button>
      <div v-if="openMenu === 'decision'" class="filter-menu" role="listbox" aria-label="Decisões">
        <button
          type="button"
          role="option"
          :aria-selected="!filters.decision"
          :class="{ selected: !filters.decision }"
          @click="choose('decision', '')"
        >
          Todas as decisões
        </button>
        <button
          v-for="option in decisionOptions"
          :key="option.value"
          type="button"
          role="option"
          :aria-selected="filters.decision === option.value"
          :class="{ selected: filters.decision === option.value }"
          @click="choose('decision', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <Button
      v-if="hasFilters"
      class="clear-filters"
      variant="outline"
      type="button"
      @click="emit('clear')"
    >
      Limpar filtros
    </Button>

    <p v-if="periodInvalid" class="filter-error" role="alert">
      A data final não pode ser anterior à data inicial.
    </p>
  </form>
</template>

<style scoped>
.history-filters {
  display: flex;
  flex-wrap: wrap;
  flex-shrink: 0;
  align-items: center;
  gap: 0.55rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.filter-control {
  position: relative;
  display: flex;
  min-width: 0;
  color: var(--color-text);
  font-size: 0.78rem;
}

.filter-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  height: 2.1rem;
  padding: 0 0.65rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  font: inherit;
}

.filter-trigger.is-active,
.filter-trigger[aria-expanded='true'] {
  border-color: var(--color-primary);
}

.filter-trigger small {
  max-width: 10rem;
  overflow: hidden;
  color: var(--color-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-menu,
.date-menu {
  position: absolute;
  z-index: 3;
  top: calc(100% + 0.5rem);
  left: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: 0 10px 24px rgba(30, 42, 94, 0.14);
}

.filter-menu {
  display: grid;
  min-width: 12rem;
  gap: 0.15rem;
  padding: 0.35rem;
}

.filter-menu button {
  width: 100%;
  padding: 0.55rem 0.65rem;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  text-align: left;
  white-space: nowrap;
}

.filter-menu button:hover,
.filter-menu button.selected {
  background: var(--color-background);
  color: var(--color-primary);
  font-weight: 700;
}

.date-menu {
  display: grid;
  gap: 0.7rem;
  width: 17rem;
  padding: 0.85rem;
}

.date-menu p {
  color: var(--color-text);
  font-size: 0.8rem;
  font-weight: 700;
}

.date-menu label {
  display: grid;
  gap: 0.25rem;
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.date-apply {
  padding: 0.5rem;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: white;
  cursor: pointer;
  font: inherit;
}

.clear-filters {
  height: 2.1rem;
  padding-block: 0;
  font-size: 0.78rem;
}

.filter-error {
  flex-basis: 100%;
  color: var(--color-danger);
  font-size: 0.78rem;
}

@media (max-width: 700px) {
  .filter-control,
  .filter-trigger {
    width: 100%;
  }

  .filter-trigger svg:last-child {
    margin-left: auto;
  }
}
</style>
