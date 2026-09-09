<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import StepIndicator from '../components/common/StepIndicator.vue'
import PageLayout from '../components/layout/PageLayout.vue'
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
  <PageLayout
    title="Fazer upload de arquivo"
    subtitle="Faça o carregamento de seus arquivos e siga as orientações para avançar."
  >
    <section class="card">
      <StepIndicator :steps="STEPS" :current-step="METADATA_STEP" />
    </section>

    <p v-if="uploadedFileNames.length" class="uploaded-files" data-testid="uploaded-files">
      Arquivo(s) da etapa anterior: <strong>{{ uploadedFileNames.join(', ') }}</strong>
    </p>

    <MetadataStep @back="goBackToUpload" />
  </PageLayout>
</template>

<style scoped>
.uploaded-files {
  margin-top: 1rem;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}
</style>
