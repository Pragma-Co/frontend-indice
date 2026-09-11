<script setup>
import { onBeforeMount } from 'vue'
import { useRouter } from 'vue-router'
import StepIndicator from '../components/common/StepIndicator.vue'
import PageLayout from '../components/layout/PageLayout.vue'
import ConfirmationStep from '../components/document-upload/ConfirmationStep.vue'
import { useDocumentFormStore } from '../stores/documentFormStore'
import { CONFIRMATION_STEP, UPLOAD_FLOW_SUBTITLE, UPLOAD_FLOW_TITLE, UPLOAD_STEPS } from '../utils/uploadFlow'

/**
 * Step 3 (Confirmação) of the "Fazer upload de arquivo" flow. Reads the
 * metadata filled in step 2 from the store; "Publicar" only emits `publish`,
 * the submission is a separate task.
 */
const router = useRouter()
const store = useDocumentFormStore()

// Required-field validation lives in step 2: never show step 3 with pending fields.
onBeforeMount(() => {
  if (!store.isValid) router.replace({ name: 'document-metadata' })
})

function goBackToMetadata() {
  router.push({ name: 'document-metadata' })
}
</script>

<template>
  <PageLayout :title="UPLOAD_FLOW_TITLE" :subtitle="UPLOAD_FLOW_SUBTITLE">
    <section class="card">
      <StepIndicator :steps="UPLOAD_STEPS" :current-step="CONFIRMATION_STEP" />
    </section>

    <ConfirmationStep @back="goBackToMetadata" />
  </PageLayout>
</template>
