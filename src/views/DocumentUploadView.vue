<script setup>
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import Button from '../components/common/Button.vue'
import DuplicateFileDialog from '../components/common/DuplicateFileDialog.vue'
import FileDropzone from '../components/common/FileDropzone.vue'
import StepIndicator from '../components/common/StepIndicator.vue'
import UploadQueueTable from '../components/common/UploadQueueTable.vue'
import { useDocumentUpload } from '../composables/useDocumentUpload'
import { useUploadStore } from '../stores/uploadStore'

const STEPS = [
  { title: 'Upload', subtitle: 'Arquivos do projeto' },
  { title: 'Metadados', subtitle: 'Definição de atributos' },
  { title: 'Confirmação', subtitle: 'Revisão e envio final' },
]

const AUTO_ADVANCE_DELAY_MS = 1200

const router = useRouter()
const uploadStore = useUploadStore()

const { queue, hasSucceededFile, allSettled, addFiles, resolveDuplicate, reset, ACCEPTED_EXTENSIONS } =
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
}

watch(allSettled, (settled) => {
  if (settled && hasSucceededFile.value) {
    setTimeout(goToMetadataStep, AUTO_ADVANCE_DELAY_MS)
  }
})
</script>

<template>
  <main class="page">
    <div class="page-header">
      <h1>Fazer upload de arquivo</h1>
      <p class="page-subtitle">Faça o carregamento de seus arquivos e siga as orientações para avançar.</p>
    </div>

    <section class="card">
      <StepIndicator :steps="STEPS" :current-step="1" />
    </section>

    <section class="card">
      <FileDropzone
        :accepted-extensions="ACCEPTED_EXTENSIONS"
        max-size-label="100MB"
        @files-selected="addFiles"
      />
    </section>

    <section v-if="queue.length" class="card">
      <h2 class="queue-title">Fila de Carregamento ({{ queue.length }} arquivos)</h2>
      <UploadQueueTable :items="queue" />
    </section>

    <footer class="page-footer">
      <Button variant="outline" @click="handleCancel">Cancelar</Button>
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
