<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchSimpleFilters } from '@/api/documents'
import PageLayout from '@/components/layout/PageLayout.vue'
import SearchPanel from './components/SearchPanel.vue'

const router = useRouter()
const user = {
  name: 'João Silva',
  role: 'Engenheiro',
  department: 'Departamento de Engenharia',
  area: 'Área Operacional Geral',
}
const fallbackFilters = {
  dates: [
    { value: 'last_7_days', label: 'Últimos 7 dias' },
    { value: 'last_month', label: 'Último mês' },
    { value: 'last_year', label: 'Último ano' },
  ],
  areas: [],
  types: [],
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
  <PageLayout
    wide
    :title="`Bem-vindo, ${user.name}`"
    :subtitle="`${user.role} • ${user.department} • ${user.area}`"
  >
    <SearchPanel
      :filters="filters"
      :filters-loading="filtersLoading"
      @search="search"
      @view-all="viewAll"
    />
  </PageLayout>
</template>
