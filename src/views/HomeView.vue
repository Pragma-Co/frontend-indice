<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Building2, Calendar, ChevronDown, FileText, Search, Upload } from '@lucide/vue'
import { fetchSimpleFilters } from '../api/documents'
import { buildDocumentSearchQuery } from '../utils/searchParams'

const router = useRouter()
const user = { name: 'João Silva', role: 'Engenheiro', department: 'Departamento de Engenharia', area: 'Área Operacional Geral' }
const fallbackFilters = {
  datas: [
    { value: 'last_7_days', label: 'Últimos 7 dias' },
    { value: 'last_month', label: 'Último mês' },
    { value: 'last_year', label: 'Último ano' },
  ],
  areas: [],
  tipos: [],
}
const filters = reactive({ ...fallbackFilters })
const form = reactive({ query: '', date: '', dateFrom: '', dateTo: '', area: '', type: '' })
const filtersLoading = ref(true)
const dateMenuOpen = ref(false)
const filterMenuOpen = ref('')

const dateLabel = computed(() => {
  if (form.dateFrom && form.dateTo) return `${form.dateFrom} a ${form.dateTo}`
  if (form.dateFrom) return `A partir de ${form.dateFrom}`
  if (form.dateTo) return `Até ${form.dateTo}`
  if (form.date) return filters.datas.find((option) => option.value === form.date)?.label ?? form.date
  return 'Qualquer data'
})

function selectDatePreset(event) {
  form.date = event.target.value
  form.dateFrom = ''
  form.dateTo = ''
}

function toggleFilterMenu(filter) {
  dateMenuOpen.value = false
  filterMenuOpen.value = filterMenuOpen.value === filter ? '' : filter
}

function selectFilter(filter, value) {
  form[filter] = value
  filterMenuOpen.value = ''
}

function resetFilters() {
  form.query = ''
  form.date = ''
  form.dateFrom = ''
  form.dateTo = ''
  form.area = ''
  form.type = ''
  dateMenuOpen.value = false
  filterMenuOpen.value = ''
}

function search() {
  router.push({ name: 'document-list', query: buildDocumentSearchQuery(form) })
}

function viewAll() {
  router.push({ name: 'document-list' })
}

onMounted(async () => {
  try {
    Object.assign(filters, await fetchSimpleFilters())
  } catch {
    Object.assign(filters, fallbackFilters)
  } finally {
    filtersLoading.value = false
  }
})
</script>

<template>
  <main class="home-page">
    <section class="welcome">
      <h1>Bem-vindo, {{ user.name }}</h1>
      <p>{{ user.role }} • {{ user.department }} • {{ user.area }}</p>
    </section>

    <form class="search-panel" @submit.prevent="search">
      <label class="search-field">
        <span class="sr-only">Pesquisar documentos</span>
        <Search :size="18" :stroke-width="2" aria-hidden="true" />
        <input v-model="form.query" type="search" placeholder="Pesquisar por título, código, descrição ou termos-chave..." />
      </label>
      <button class="search-button" type="submit">Pesquisar</button>
      <RouterLink class="upload-button" :to="{ name: 'document-upload' }">
        <Upload :size="17" :stroke-width="2" aria-hidden="true" />
        Upload
      </RouterLink>

      <div class="quick-filters">
        <div class="filter-control date-filter">
          <button class="filter-trigger" type="button" :disabled="filtersLoading" :aria-expanded="dateMenuOpen" @click="filterMenuOpen = ''; dateMenuOpen = !dateMenuOpen">
            <Calendar :size="15" aria-hidden="true" />
            <span>Data</span>
            <small>{{ dateLabel }}</small>
            <ChevronDown :size="14" aria-hidden="true" />
          </button>
          <div v-if="dateMenuOpen" class="date-menu">
            <p>Escolha um intervalo</p>
            <label>Atalho
              <select :value="form.date" @change="selectDatePreset">
                <option value="">Personalizado</option>
                <option v-for="option in filters.datas" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </label>
            <label>De <input v-model="form.dateFrom" type="date" @change="form.date = ''" /></label>
            <label>Até <input v-model="form.dateTo" type="date" @change="form.date = ''" /></label>
            <button class="date-apply" type="button" @click="dateMenuOpen = false">Aplicar</button>
          </div>
        </div>
        <div class="filter-control select-filter">
          <button class="filter-trigger" type="button" :disabled="filtersLoading" :aria-expanded="filterMenuOpen === 'area'" aria-haspopup="listbox" @click="toggleFilterMenu('area')">
            <Building2 :size="15" aria-hidden="true" />
            <span>Área</span>
            <ChevronDown :size="14" aria-hidden="true" />
          </button>
          <div v-if="filterMenuOpen === 'area'" class="filter-menu" role="listbox" aria-label="Áreas">
            <button type="button" :class="{ selected: !form.area }" @click="selectFilter('area', '')">Todas as áreas</button>
            <button v-for="option in filters.areas" :key="option.acronym" type="button" :class="{ selected: form.area === option.acronym }" @click="selectFilter('area', option.acronym)">{{ option.acronym }} • {{ option.name }}</button>
          </div>
        </div>
        <div class="filter-control select-filter">
          <button class="filter-trigger" type="button" :disabled="filtersLoading" :aria-expanded="filterMenuOpen === 'type'" aria-haspopup="listbox" @click="toggleFilterMenu('type')">
            <FileText :size="15" aria-hidden="true" />
            <span>Tipo</span>
            <ChevronDown :size="14" aria-hidden="true" />
          </button>
          <div v-if="filterMenuOpen === 'type'" class="filter-menu" role="listbox" aria-label="Tipos de documento">
            <button type="button" :class="{ selected: !form.type }" @click="selectFilter('type', '')">Todos os tipos</button>
            <button v-for="option in filters.tipos" :key="option.code" type="button" :class="{ selected: form.type === option.code }" @click="selectFilter('type', option.code)">{{ option.code }} • {{ option.name }}</button>
          </div>
        </div>
      </div>

      <div class="search-actions">
        <button type="button" class="clear-button" @click="resetFilters">Limpar filtros</button>
        <button type="button" class="all-documents" @click="viewAll">
          Ver todos os documentos
          <ArrowRight :size="16" aria-hidden="true" />
        </button>
      </div>
    </form>
  </main>
</template>

<style scoped>
.home-page { max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem; }
.welcome { margin-bottom: 1.5rem; }
.welcome h1 { font-size: clamp(1.6rem, 3vw, 2.2rem); margin-bottom: .45rem; }
.welcome p:last-child { color: var(--color-text-muted); }
.search-panel { display: grid; grid-template-columns: 1fr auto auto; gap: 1rem; padding: 1.25rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); box-shadow: 0 8px 24px rgba(30, 42, 94, .06); }
.search-field { display: flex; align-items: center; gap: .65rem; min-width: 0; border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 0 .8rem; color: var(--color-text-muted); }
.search-field input { width: 100%; border: 0; outline: 0; padding: .75rem 0; font: inherit; }
.search-field svg, .upload-button svg { flex: 0 0 auto; margin-right: .35rem; }
.search-button, .clear-button, .all-documents { border: 0; border-radius: var(--radius-sm); cursor: pointer; font: inherit; }
.search-button, .upload-button { padding: 0 1.4rem; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; text-decoration: none; cursor: pointer; }
.search-button { background: var(--color-primary); color: white; }
.upload-button { background: var(--color-navy); color: white; border-radius: var(--radius-sm); }
.quick-filters { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: .55rem; }
.filter-control { position: relative; display: flex; align-items: center; gap: .4rem; min-width: 0; color: var(--color-text); font-size: .78rem; }
.filter-control select, .filter-trigger { height: 2.1rem; padding: 0 .65rem; border: 1px solid var(--color-border); border-radius: 999px; background: white; color: var(--color-text); font: inherit; }
.select-filter { height: 2.1rem; border-radius: 999px; }
.select-filter .filter-trigger { cursor: pointer; }
.filter-menu { position: absolute; z-index: 3; top: calc(100% + .5rem); left: 0; display: grid; min-width: 12rem; gap: .15rem; padding: .35rem; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: white; box-shadow: 0 10px 24px rgba(30, 42, 94, .14); }
.filter-menu button { width: 100%; padding: .55rem .65rem; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--color-text); cursor: pointer; text-align: left; font: inherit; font-size: .78rem; }
.filter-menu button:hover, .filter-menu button.selected { background: var(--color-background); color: var(--color-primary); font-weight: 700; }
.filter-trigger { display: inline-flex; align-items: center; gap: .4rem; cursor: pointer; }
.filter-trigger small { max-width: 10rem; overflow: hidden; color: var(--color-text-muted); text-overflow: ellipsis; white-space: nowrap; }
.date-menu { position: absolute; z-index: 2; top: calc(100% + .5rem); left: 0; display: grid; gap: .7rem; width: 17rem; padding: .85rem; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: white; box-shadow: 0 10px 24px rgba(30, 42, 94, .14); }
.date-menu p { color: var(--color-text); font-size: .8rem; font-weight: 700; }
.date-menu label { display: grid; gap: .25rem; color: var(--color-text-muted); font-size: .75rem; }
.date-menu input, .date-menu select { width: 100%; padding: .5rem; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: white; font: inherit; }
.date-apply { padding: .5rem; border: 0; border-radius: var(--radius-sm); background: var(--color-primary); color: white; cursor: pointer; font: inherit; }
.search-actions { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.clear-button { background: transparent; color: var(--color-text-muted); padding: .5rem 0; }
.all-documents { display: inline-flex; align-items: center; gap: .35rem; background: transparent; color: var(--color-primary); padding: .5rem 0; font-weight: 700; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 700px) { .search-panel { grid-template-columns: 1fr; } .search-button, .upload-button { padding: .75rem; } .filter-control, .filter-trigger { width: 100%; max-width: none; } .search-actions { align-items: flex-start; flex-direction: column; } }
</style>
