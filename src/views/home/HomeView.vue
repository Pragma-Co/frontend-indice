<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchSimpleFilters } from '../../api/documents'
import SearchPanel from './components/SearchPanel.vue'

const router = useRouter()
const user = {
  name: 'João Silva',
  role: 'Engenheiro',
  department: 'Departamento de Engenharia',
  area: 'Área Operacional Geral',
}
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
const filtersLoading = ref(true)

function search(query) {
  router.push({ name: 'document-list', query })
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

    <SearchPanel
      :filters="filters"
      :filters-loading="filtersLoading"
      @search="search"
      @view-all="viewAll"
    />
  </main>
</template>

<style scoped>
.home-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}
.welcome {
  margin-bottom: 1.5rem;
}
.welcome h1 {
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  margin-bottom: 0.45rem;
}
.welcome p:last-child {
  color: var(--color-text-muted);
}
</style>
