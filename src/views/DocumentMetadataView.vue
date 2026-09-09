<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import StepIndicator from '../components/common/StepIndicator.vue'
import MetadataStep from '../components/document-upload/MetadataStep.vue'
import { useAuthStore } from '../stores/authStore'
import { STEPS, useDocumentFormStore } from '../stores/documentFormStore'
import { useUploadStore } from '../stores/uploadStore'

/**
 * Step 2 (Metadados) of the "Fazer upload de arquivo" flow. The upload step
 * (DocumentUploadView) redirects here; step 3 (Confirmação) is a separate task.
 */
const METADATA_STEP = 2

const router = useRouter()
const auth = useAuthStore()
const store = useDocumentFormStore()
const uploadStore = useUploadStore()

const uploadedFileNames = computed(() => uploadStore.uploadedDocuments.map((document) => document.name))

onMounted(() => {
  store.setDefaultAuthor(auth.currentUser?.name)
  if (!store.projects.length || !store.disciplines.length) store.loadCatalogs()
})

function goBackToUpload() {
  router.push({ name: 'document-upload' })
}
</script>

<template>
  <main class="page">
    <div class="page-header">
      <h1>Fazer upload de arquivo</h1>
      <p class="page-subtitle">Faça o carregamento de seus arquivos e siga as orientações para avançar.</p>
    </div>

    <section class="card">
      <StepIndicator :steps="STEPS" :current-step="METADATA_STEP" />
    </section>

    <p v-if="uploadedFileNames.length" class="uploaded-files" data-testid="uploaded-files">
      Arquivo(s) da etapa anterior: <strong>{{ uploadedFileNames.join(', ') }}</strong>
    </p>

    <MetadataStep class="step" @back="goBackToUpload" />
  </main>
</template>

<style scoped>
.page {
  max-width: 900px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem;
}

.page-header h1 {
  font-size: 1.5rem;
}

.page-subtitle {
  color: var(--color-text-muted);
  margin-top: 0.35rem;
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  margin-top: 1.5rem;
}

.uploaded-files {
  margin-top: 1rem;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.step {
  margin-top: 1.5rem;
}
</style>
