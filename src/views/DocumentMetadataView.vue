<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import StepIndicator from '../components/common/StepIndicator.vue'
import PageLayout from '../components/layout/PageLayout.vue'
import MetadataStep from '../components/document-upload/MetadataStep.vue'
import { useAuthStore } from '../stores/authStore'
import { useDocumentFormStore } from '../stores/documentFormStore'
import { useUploadStore } from '../stores/uploadStore'
import { METADATA_STEP, UPLOAD_FLOW_SUBTITLE, UPLOAD_FLOW_TITLE, UPLOAD_STEPS } from '../utils/uploadFlow'

/**
 * Step 2 (Metadados) of the "Fazer upload de arquivo" flow. The upload step
 * (DocumentUploadView) leads here and "Próximo Passo" leads to the confirmation.
 */
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

function goToConfirmation() {
  router.push({ name: 'document-confirmation' })
}
</script>

<template>
  <PageLayout :title="UPLOAD_FLOW_TITLE" :subtitle="UPLOAD_FLOW_SUBTITLE">
    <section class="card">
      <StepIndicator :steps="UPLOAD_STEPS" :current-step="METADATA_STEP" />
    </section>

    <p v-if="uploadedFileNames.length" class="uploaded-files" data-testid="uploaded-files">
      Arquivo(s) da etapa anterior: <strong>{{ uploadedFileNames.join(', ') }}</strong>
    </p>

    <MetadataStep @back="goBackToUpload" @next="goToConfirmation" />
  </PageLayout>
</template>

<style scoped>
.uploaded-files {
  margin-top: 1rem;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}
</style>
