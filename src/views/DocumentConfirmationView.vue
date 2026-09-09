<script setup>
import { useRouter } from 'vue-router'
import StepIndicator from '../components/common/StepIndicator.vue'
import PageLayout from '../components/layout/PageLayout.vue'
import ConfirmationStep from '../components/document-upload/ConfirmationStep.vue'
import { CONFIRMATION_STEP, UPLOAD_FLOW_SUBTITLE, UPLOAD_FLOW_TITLE, UPLOAD_STEPS } from '../utils/uploadFlow'

/**
 * Step 3 (Confirmação) of the "Fazer upload de arquivo" flow. Reads the
 * metadata filled in step 2 from the store; "Publicar" only emits `publish`,
 * the submission is a separate task.
 */
const router = useRouter()

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
