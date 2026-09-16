<script setup>
import { onBeforeMount } from 'vue'
import { useRouter } from 'vue-router'
import Button from '../components/common/Button.vue'
import KeyValue from '../components/common/KeyValue.vue'
import PageLayout from '../components/layout/PageLayout.vue'
import { useDocumentFormStore } from '../stores/documentFormStore'

const router = useRouter()
const store = useDocumentFormStore()

onBeforeMount(() => {
  if (!store.publishedDocument) router.replace({ name: 'document-list' })
})

function goToDocuments() {
  router.push({ name: 'document-list' })
}

function startNewUpload() {
  router.push({ name: 'document-upload' })
}
</script>

<template>
  <PageLayout
    title="Documento publicado"
    subtitle="O documento foi cadastrado e o arquivo enviado para o acervo."
  >
    <section v-if="store.publishedDocument" class="card published">
      <p class="published-label">Código do documento</p>
      <p class="published-code" data-testid="published-code">{{ store.publishedDocument.code }}</p>

      <dl class="published-details">
        <KeyValue label="Título">{{ store.publishedDocument.title }}</KeyValue>
        <KeyValue label="Revisão">{{ store.publishedDocument.revision }}</KeyValue>
      </dl>

      <footer class="published-actions">
        <Button variant="outline" @click="startNewUpload">Novo upload</Button>
        <Button variant="primary" @click="goToDocuments">Ver documentos</Button>
      </footer>
    </section>
  </PageLayout>
</template>

<style scoped>
.published-label {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.published-code {
  margin-top: 0.25rem;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.published-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin: 1.5rem 0 0;
}

.published-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 1.5rem;
}

@media (max-width: 640px) {
  .published-details {
    grid-template-columns: 1fr;
  }
}
</style>
