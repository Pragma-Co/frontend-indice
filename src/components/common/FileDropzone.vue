<script setup>
import { ref } from 'vue'

const props = defineProps({
  acceptedExtensions: {
    type: Array,
    required: true,
  },
  maxSizeLabel: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['files-selected'])

const fileInput = ref(null)
const isDragging = ref(false)

const acceptAttr = props.acceptedExtensions.map((ext) => `.${ext}`).join(',')
const formatsLabel = props.acceptedExtensions.map((ext) => ext.toUpperCase()).join(', ')

function openFileDialog() {
  fileInput.value?.click()
}

function onFileInputChange(event) {
  if (event.target.files?.length) {
    emit('files-selected', event.target.files)
  }
  event.target.value = ''
}

function onDrop(event) {
  isDragging.value = false
  if (event.dataTransfer?.files?.length) {
    emit('files-selected', event.dataTransfer.files)
  }
}
</script>

<template>
  <div
    class="dropzone"
    :class="{ dragging: isDragging }"
    role="button"
    tabindex="0"
    @click="openFileDialog"
    @keydown.enter="openFileDialog"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop"
  >
    <svg class="dropzone-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 18a4 4 0 0 1-.6-7.96A5.5 5.5 0 0 1 17.4 8.02 4.5 4.5 0 0 1 17 17H7Z"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linejoin="round"
      />
      <path d="M12 11v6m0-6-2.2 2.2M12 11l2.2 2.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <p class="dropzone-title">Arraste arquivos ou clique para selecionar</p>
    <p class="dropzone-subtitle">Formatos aceitos: {{ formatsLabel }} (máximo de {{ maxSizeLabel }} por arquivo)</p>

    <input
      ref="fileInput"
      type="file"
      multiple
      class="dropzone-input"
      :accept="acceptAttr"
      @change="onFileInputChange"
    />
  </div>
</template>

<style scoped>
.dropzone {
  border: 2px dashed var(--color-primary);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  padding: 2.5rem 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.dropzone.dragging {
  background: #eef2ff;
}

.dropzone-icon {
  color: var(--color-primary);
  margin-bottom: 0.75rem;
}

.dropzone-title {
  font-weight: 600;
}

.dropzone-subtitle {
  color: var(--color-text-muted);
  font-size: 0.85rem;
  margin-top: 0.35rem;
}

.dropzone-input {
  display: none;
}
</style>
