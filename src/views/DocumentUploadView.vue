<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Button from '../components/common/Button.vue'
import DuplicateFileDialog from '../components/common/DuplicateFileDialog.vue'
import FileDropzone from '../components/common/FileDropzone.vue'
import PageLayout from '../components/layout/PageLayout.vue'
import StepIndicator from '../components/common/StepIndicator.vue'
import UploadQueueTable from '../components/common/UploadQueueTable.vue'
import { useDocumentUpload } from '../composables/useDocumentUpload'
import { useUploadStore } from '../stores/uploadStore'
import { UPLOAD_FLOW_SUBTITLE, UPLOAD_FLOW_TITLE, UPLOAD_STEP, UPLOAD_STEPS } from '../utils/uploadFlow'

const router = useRouter()
const uploadStore = useUploadStore()

const { queue, hasSucceededFile, addFiles, resolveDuplicate, reset, restore, ACCEPTED_EXTENSIONS } =
  useDocumentUpload()

const activeDuplicate = computed(() => queue.value.find((item) => item.status === 'duplicate'))

function goToMetadataStep() {
  const uploadedDocuments = queue.value
    .filter((item) => item.status === 'success')
    .map((item) => ({ id: item.documentId, name: item.name, size: item.size, typeLabel: item.typeLabel }))

  uploadStore.setUploadedDocuments(uploadedDocuments)
  router.push({ name: 'document-metadata' })
}

function handleCancel() {
  reset()
  uploadStore.reset()
}

function handleFilesSelected(fileList) {
  addFiles(fileList)
}

// A drop that lands even slightly outside the dashed dropzone would
// otherwise fall through to the browser's default action (opening the
// file), which looks like the drag silently failed.
function preventStrayFileDrop(event) {
  if (event.dataTransfer?.types.includes('Files')) {
    event.preventDefault()
  }
}

onMounted(() => {
  // Coming back from the metadata step: show the files already sent
  if (uploadStore.uploadedDocuments.length) restore(uploadStore.uploadedDocuments)
  window.addEventListener('dragover', preventStrayFileDrop)
  window.addEventListener('drop', preventStrayFileDrop)
})

onUnmounted(() => {
  window.removeEventListener('dragover', preventStrayFileDrop)
  window.removeEventListener('drop', preventStrayFileDrop)
})
</script>

<template>
  <PageLayout :title="UPLOAD_FLOW_TITLE" :subtitle="UPLOAD_FLOW_SUBTITLE">

    <section class="card">
      <StepIndicator :steps="UPLOAD_STEPS" :current-step="UPLOAD_STEP" />
    </section>

    <section class="card">
      <FileDropzone
        :accepted-extensions="ACCEPTED_EXTENSIONS"
        max-size-label="100MB"
        @files-selected="handleFilesSelected"
      />
    </section>

    <section v-if="queue.length" class="card">
      <h2 class="queue-title">Fila de Carregamento ({{ queue.length }} arquivos)</h2>
      <UploadQueueTable :items="queue" />
    </section>

    <footer class="page-footer">
      <Button variant="outline" @click="handleCancel">Limpar</Button>
      <Button variant="primary" :disabled="!hasSucceededFile" @click="goToMetadataStep">
        Próximo Passo
      </Button>
    </footer>

    <DuplicateFileDialog
      v-if="activeDuplicate"
      :file-name="activeDuplicate.name"
      @discard="resolveDuplicate(activeDuplicate, false)"
      @save-as-revision="resolveDuplicate(activeDuplicate, true)"
    />
  </PageLayout>
</template>

<style scoped>
.queue-title {
  font-size: 1rem;
  margin-bottom: 1rem;
}

.page-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 1.5rem;
}
</style>
