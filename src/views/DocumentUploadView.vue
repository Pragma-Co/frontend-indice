<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { METADATA_STEP, STEPS, useDocumentFormStore } from '../stores/documentFormStore'
import StepIndicator from '../components/document-upload/StepIndicator.vue'
import MetadataStep from '../components/document-upload/MetadataStep.vue'

/**
 * "Fazer upload de arquivo" flow. This view renders step 2 (Metadados);
 * steps 1 (Upload) and 3 (Confirmação) are separate tasks and will plug into
 * the same StepIndicator and store.
 */
const auth = useAuthStore()
const store = useDocumentFormStore()

onMounted(() => {
  store.setDefaultResponsavel(auth.currentUser?.nome)
  if (!store.projetos.length || !store.disciplinas.length) store.loadCatalogs()
})
</script>

<template>
  <main class="container upload-view">
    <header class="upload-view__header">
      <h1>Fazer upload de arquivo</h1>
      <p>Faça o carregamento de seus arquivos e siga as orientações para avançar.</p>
    </header>

    <StepIndicator :steps="STEPS" :current="METADATA_STEP" />

    <MetadataStep class="upload-view__step" />
  </main>
</template>

<style scoped>
.upload-view__header {
  margin-bottom: 1.5rem;
}

.upload-view__header h1 {
  font-size: 1.5rem;
}

.upload-view__header p {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

.upload-view__step {
  margin-top: 1.5rem;
}
</style>
