<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchDocuments } from '../api/documents'
import { buildDocumentQueryKey } from '../utils/searchParams'

const route = useRoute()
const router = useRouter()
const documents = ref([])
const loading = ref(true)
const error = ref('')

async function loadDocuments() {
  loading.value = true
  error.value = ''
  try {
    const response = await fetchDocuments(route.query)
    documents.value = response.documents
  } catch {
    documents.value = []
    error.value = 'Não foi possível carregar os documentos.'
  } finally {
    loading.value = false
  }
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value))
}

function goHome() {
  router.push({ name: 'home', query: route.query })
}

onMounted(loadDocuments)
watch(() => buildDocumentQueryKey(route.query), loadDocuments)
</script>

<template>
  <main class="list-page">
    <h1>Resultados da busca</h1>
    <p v-if="Object.keys(route.query).length">Documentos filtrados pelos critérios informados.</p>
    <p v-else>Todos os documentos disponíveis.</p>
    <p v-if="loading" class="status-message">Carregando documentos...</p>
    <p v-else-if="error" class="status-message error-message">{{ error }}</p>
    <p v-else-if="!documents.length" class="status-message">Nenhum documento encontrado.</p>
    <section v-else class="document-grid" aria-label="Documentos encontrados">
      <article v-for="document in documents" :key="document.id" class="document-card">
        <div class="document-card-header">
          <span class="document-type">{{ document.type.code }}</span>
          <span>{{ formatDate(document.updated_at) }}</span>
        </div>
        <h2>{{ document.title }}</h2>
        <p>{{ document.code }}<span v-if="document.description"> • {{ document.description }}</span></p>
        <div class="document-areas">
          <span v-for="area in document.areas" :key="area.acronym">{{ area.acronym }}</span>
        </div>
      </article>
    </section>
    <button type="button" @click="goHome">Voltar para início</button>
  </main>
</template>

<style scoped>
.list-page { max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem; }
h1 { margin: .75rem 0; }
p { color: var(--color-text-muted); }
.status-message { margin-top: 2rem; }
.error-message { color: var(--color-warning); }
.document-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 1.5rem; }
.document-card { padding: 1.15rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); }
.document-card-header { display: flex; justify-content: space-between; gap: 1rem; color: var(--color-text-muted); font-size: .75rem; }
.document-type { color: var(--color-primary); font-weight: 700; }
.document-card h2 { margin: 1rem 0 .45rem; font-size: 1rem; }
.document-card p { font-size: .85rem; line-height: 1.45; }
.document-areas { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: 1rem; }
.document-areas span { padding: .2rem .45rem; border-radius: 4px; background: var(--color-background); color: var(--color-text-muted); font-size: .72rem; }
button { margin-top: 1.5rem; padding: .7rem 1rem; border: 0; border-radius: var(--radius-sm); background: var(--color-primary); color: white; cursor: pointer; }
</style>
