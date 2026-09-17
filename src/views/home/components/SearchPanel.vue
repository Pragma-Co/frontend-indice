<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowRight, Building2, Calendar, ChevronDown, FileText, Search, Upload } from '@lucide/vue'
import { buildDocumentSearchQuery } from '@/utils/searchParams'

const props = defineProps({
  filters: { type: Object, required: true },
  filtersLoading: { type: Boolean, required: true },
})

const emit = defineEmits(['search', 'view-all'])
const route = useRoute()
const form = reactive({ query: '', date: '', dateFrom: '', dateTo: '', area: '', type: '' })
const dateInputs = reactive({ from: '', to: '' })
const dateMenuOpen = ref(false)
const filterMenuOpen = ref('')
const datePickerRefs = { from: null, to: null }

function formatDateForDisplay(value) {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function parseDateInput(value) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return ''

  const [, day, month, year] = match
  const parsedDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  if (
    parsedDate.getUTCFullYear() !== Number(year) ||
    parsedDate.getUTCMonth() !== Number(month) - 1 ||
    parsedDate.getUTCDate() !== Number(day)
  )
    return ''
  return `${year}-${month}-${day}`
}

function updateDateInput(field, event) {
  const value = event.target.value.replace(/[^\d/]/g, '').slice(0, 10)
  dateInputs[field] = value
  form[field === 'from' ? 'dateFrom' : 'dateTo'] = parseDateInput(value)
  form.date = ''
}

function selectNativeDate(field, event) {
  const formField = field === 'from' ? 'dateFrom' : 'dateTo'
  form[formField] = event.target.value
  dateInputs[field] = formatDateForDisplay(event.target.value)
  form.date = ''
}

function openDatePicker(field) {
  const picker = datePickerRefs[field]
  if (!picker) return
  if (typeof picker.showPicker === 'function') picker.showPicker()
  else picker.click()
}

const dateLabel = computed(() => {
  if (form.dateFrom && form.dateTo)
    return `${formatDateForDisplay(form.dateFrom)} a ${formatDateForDisplay(form.dateTo)}`
  if (form.dateFrom) return `A partir de ${formatDateForDisplay(form.dateFrom)}`
  if (form.dateTo) return `Até ${formatDateForDisplay(form.dateTo)}`
  if (form.date)
    return props.filters.dates.find((option) => option.value === form.date)?.label ?? form.date
  return 'Qualquer data'
})

const areaLabel = computed(() => (form.area ? `Área ${form.area}` : 'Área'))
const typeLabel = computed(() => (form.type ? `Tipo ${form.type}` : 'Tipo'))

function restoreFiltersFromRoute() {
  form.query = String(route.query.q ?? '')
  form.date = String(route.query.data ?? '')
  form.dateFrom = String(route.query.date_from ?? '')
  form.dateTo = String(route.query.date_to ?? '')
  dateInputs.from = formatDateForDisplay(form.dateFrom)
  dateInputs.to = formatDateForDisplay(form.dateTo)
  form.area = String(route.query.area ?? '')
  form.type = String(route.query.tipo ?? '')
}

function selectDatePreset(event) {
  form.date = event.target.value
  form.dateFrom = ''
  form.dateTo = ''
  dateInputs.from = ''
  dateInputs.to = ''
}

function toggleFilterMenu(filter) {
  dateMenuOpen.value = false
  filterMenuOpen.value = filterMenuOpen.value === filter ? '' : filter
}

function selectFilter(filter, value) {
  form[filter] = value
  filterMenuOpen.value = ''
}

function toggleDateMenu() {
  filterMenuOpen.value = ''
  dateMenuOpen.value = !dateMenuOpen.value
}

function resetFilters() {
  Object.assign(form, { query: '', date: '', dateFrom: '', dateTo: '', area: '', type: '' })
  dateInputs.from = ''
  dateInputs.to = ''
  dateMenuOpen.value = false
  filterMenuOpen.value = ''
}

function search() {
  emit('search', buildDocumentSearchQuery(form))
}

onMounted(restoreFiltersFromRoute)
</script>

<template>
  <form class="search-panel card" @submit.prevent="search">
    <label class="search-field">
      <span class="sr-only">Pesquisar documentos</span>
      <Search :size="18" :stroke-width="2" aria-hidden="true" />
      <input
        v-model="form.query"
        type="search"
        placeholder="Pesquisar por título, código, descrição ou termos-chave..."
      />
    </label>
    <button class="search-button" type="submit">Pesquisar</button>
    <RouterLink class="upload-button" :to="{ name: 'document-upload' }">
      <Upload :size="17" :stroke-width="2" aria-hidden="true" />
      Upload
    </RouterLink>

    <div class="quick-filters">
      <div class="filter-control date-filter">
        <button
          class="filter-trigger"
          type="button"
          :disabled="props.filtersLoading"
          :aria-expanded="dateMenuOpen"
          @click="toggleDateMenu"
        >
          <Calendar :size="15" aria-hidden="true" />
          <span>Data</span>
          <small>{{ dateLabel }}</small>
          <ChevronDown :size="14" aria-hidden="true" />
        </button>
        <div v-if="dateMenuOpen" class="date-menu">
          <p>Escolha um intervalo</p>
          <label
            >Atalho
            <select :value="form.date" @change="selectDatePreset">
              <option value="">Personalizado</option>
              <option
                v-for="option in props.filters.dates"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <label
            >De
            <span class="date-input">
              <input
                class="date-display"
                :value="dateInputs.from"
                type="text"
                inputmode="numeric"
                placeholder="dd/mm/yyyy"
                maxlength="10"
                @click="openDatePicker('from')"
                @input="updateDateInput('from', $event)"
              />
              <input
                :ref="(element) => (datePickerRefs.from = element)"
                class="date-picker"
                :value="form.dateFrom"
                lang="pt-BR"
                type="date"
                aria-label="Data inicial"
                @change="selectNativeDate('from', $event)"
              />
            </span>
          </label>
          <label
            >Até
            <span class="date-input">
              <input
                class="date-display"
                :value="dateInputs.to"
                type="text"
                inputmode="numeric"
                placeholder="dd/mm/yyyy"
                maxlength="10"
                @click="openDatePicker('to')"
                @input="updateDateInput('to', $event)"
              />
              <input
                :ref="(element) => (datePickerRefs.to = element)"
                class="date-picker"
                :value="form.dateTo"
                lang="pt-BR"
                type="date"
                aria-label="Data final"
                @change="selectNativeDate('to', $event)"
              />
            </span>
          </label>
          <button class="date-apply" type="button" @click="toggleDateMenu">Aplicar</button>
        </div>
      </div>
      <div class="filter-control select-filter">
        <button
          class="filter-trigger"
          type="button"
          :disabled="props.filtersLoading"
          :aria-expanded="filterMenuOpen === 'area'"
          aria-haspopup="listbox"
          @click="toggleFilterMenu('area')"
        >
          <Building2 :size="15" aria-hidden="true" />
          <span>{{ areaLabel }}</span>
          <ChevronDown :size="14" aria-hidden="true" />
        </button>
        <div v-if="filterMenuOpen === 'area'" class="filter-menu" role="listbox" aria-label="Áreas">
          <button type="button" :class="{ selected: !form.area }" @click="selectFilter('area', '')">
            Todas as áreas
          </button>
          <button
            v-for="option in props.filters.areas"
            :key="option.acronym"
            type="button"
            :class="{ selected: form.area === option.acronym }"
            @click="selectFilter('area', option.acronym)"
          >
            {{ option.acronym }} • {{ option.name }}
          </button>
        </div>
      </div>
      <div class="filter-control select-filter">
        <button
          class="filter-trigger"
          type="button"
          :disabled="props.filtersLoading"
          :aria-expanded="filterMenuOpen === 'type'"
          aria-haspopup="listbox"
          @click="toggleFilterMenu('type')"
        >
          <FileText :size="15" aria-hidden="true" />
          <span>{{ typeLabel }}</span>
          <ChevronDown :size="14" aria-hidden="true" />
        </button>
        <div
          v-if="filterMenuOpen === 'type'"
          class="filter-menu"
          role="listbox"
          aria-label="Tipos de documento"
        >
          <button type="button" :class="{ selected: !form.type }" @click="selectFilter('type', '')">
            Todos os tipos
          </button>
          <button
            v-for="option in props.filters.types"
            :key="option.code"
            type="button"
            :class="{ selected: form.type === option.code }"
            @click="selectFilter('type', option.code)"
          >
            {{ option.code }} • {{ option.name }}
          </button>
        </div>
      </div>
    </div>

    <div class="search-actions">
      <button type="button" class="clear-button" @click="resetFilters">Limpar filtros</button>
      <button type="button" class="all-documents" @click="emit('view-all')">
        Ver todos os documentos
        <ArrowRight :size="16" aria-hidden="true" />
      </button>
    </div>
  </form>
</template>

<style scoped>
.search-panel {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 1rem;
}
.search-field {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0 0.8rem;
  color: var(--color-text-muted);
}
.search-field input {
  width: 100%;
  border: 0;
  outline: 0;
  padding: 0.75rem 0;
  font: inherit;
}
.search-field svg,
.upload-button svg {
  flex: 0 0 auto;
  margin-right: 0.35rem;
}
.search-button,
.clear-button,
.all-documents {
  border: 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font: inherit;
}
.search-button,
.upload-button {
  padding: 0 1.4rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}
.search-button {
  background: var(--color-primary);
  color: white;
}
.upload-button {
  background: var(--color-navy);
  color: white;
  border-radius: var(--radius-sm);
}
.quick-filters {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}
.filter-control {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  color: var(--color-text);
  font-size: 0.78rem;
}
.filter-control select,
.filter-trigger {
  height: 2.1rem;
  padding: 0 0.65rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: white;
  color: var(--color-text);
  font: inherit;
}
.select-filter {
  height: 2.1rem;
  border-radius: 999px;
}
.select-filter .filter-trigger {
  cursor: pointer;
}
.filter-menu {
  position: absolute;
  z-index: 3;
  top: calc(100% + 0.5rem);
  left: 0;
  display: grid;
  min-width: 12rem;
  gap: 0.15rem;
  padding: 0.35rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: white;
  box-shadow: 0 10px 24px rgba(30, 42, 94, 0.14);
}
.filter-menu button {
  width: 100%;
  padding: 0.55rem 0.65rem;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
  font: inherit;
  font-size: 0.78rem;
}
.filter-menu button:hover,
.filter-menu button.selected {
  background: var(--color-background);
  color: var(--color-primary);
  font-weight: 700;
}
.filter-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
}
.filter-trigger small {
  max-width: 10rem;
  overflow: hidden;
  color: var(--color-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.date-menu {
  position: absolute;
  z-index: 2;
  top: calc(100% + 0.5rem);
  left: 0;
  display: grid;
  gap: 0.7rem;
  width: 17rem;
  padding: 0.85rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: white;
  box-shadow: 0 10px 24px rgba(30, 42, 94, 0.14);
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
.date-menu input,
.date-menu select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: white;
  font: inherit;
}
.date-input {
  position: relative;
  display: block;
}
.date-display {
  position: relative;
  z-index: 1;
}
.date-picker {
  position: absolute;
  inset: 0;
  z-index: 0;
  padding: 0 !important;
  border: 0 !important;
  opacity: 0;
  pointer-events: none;
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
.search-actions {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.clear-button {
  background: transparent;
  color: var(--color-text-muted);
  padding: 0.5rem 0;
}
.all-documents {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: transparent;
  color: var(--color-primary);
  padding: 0.5rem 0;
  font-weight: 700;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (max-width: 700px) {
  .search-panel {
    grid-template-columns: 1fr;
  }
  .search-button,
  .upload-button {
    padding: 0.75rem;
  }
  .filter-control,
  .filter-trigger {
    width: 100%;
    max-width: none;
  }
  .search-actions {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
