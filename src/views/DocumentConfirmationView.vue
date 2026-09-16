<script setup>
import { onBeforeMount } from 'vue'
import { useRouter } from 'vue-router'
import StepIndicator from '../components/common/StepIndicator.vue'
import PageLayout from '../components/layout/PageLayout.vue'
import ConfirmationStep from '../components/document-upload/ConfirmationStep.vue'
import { useDocumentFormStore } from '../stores/documentFormStore'
import { useUploadStore } from '../stores/uploadStore'
import {
  CONFIRMATION_STEP,
  UPLOAD_FLOW_SUBTITLE,
  UPLOAD_FLOW_TITLE,
  UPLOAD_STEPS,
} from '../utils/uploadFlow'

const router = useRouter()
const store = useDocumentFormStore()
const uploadStore = useUploadStore()

onBeforeMount(() => {
  if (!store.isValid) router.replace({ name: 'document-metadata' })
})

function goBackToMetadata() {
  router.push({ name: 'document-metadata' })
}

function needsNewUpload(error) {
  return error?.status === 404 || Boolean(store.serverErrors.tempFileId)
}

async function publish() {
  const tempFileId = uploadStore.uploadedDocuments[0]?.id ?? null
  try {
    await store.publish(tempFileId)
    uploadStore.reset()
    router.push({ name: 'document-published' })
  } catch (error) {
    if (needsNewUpload(error)) {
      uploadStore.reset()
      router.push({ name: 'document-upload' })
    } else if (error?.status === 400) {
      router.push({ name: 'document-metadata' })
    }
  }
}
</script>

<template>
  <PageLayout :title="UPLOAD_FLOW_TITLE" :subtitle="UPLOAD_FLOW_SUBTITLE">
    <section class="card">
      <StepIndicator :steps="UPLOAD_STEPS" :current-step="CONFIRMATION_STEP" />
    </section>

    <ConfirmationStep @back="goBackToMetadata" @publish="publish" />
  </PageLayout>
</template>
