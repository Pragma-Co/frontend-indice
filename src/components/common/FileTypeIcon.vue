<script setup>
import { computed } from 'vue'
import { getFileExtension } from '../../utils/validators'

const props = defineProps({
  fileName: { type: String, required: true },
})

const KINDS = {
  pdf: { label: 'PDF', kind: 'pdf' },
  doc: { label: 'DOC', kind: 'doc' },
  docx: { label: 'DOC', kind: 'doc' },
  jpeg: { label: 'IMG', kind: 'image' },
  jpg: { label: 'IMG', kind: 'image' },
  png: { label: 'IMG', kind: 'image' },
}

const type = computed(() => KINDS[getFileExtension(props.fileName)] ?? { label: 'FILE', kind: 'file' })
</script>

<template>
  <span class="file-icon" :class="`file-icon-${type.kind}`" :data-kind="type.kind" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke-linejoin="round" />
      <path d="M14 3v5h5" stroke-linejoin="round" />
    </svg>
    <span class="file-icon-label"><span class="file-icon-text">{{ type.label }}</span></span>
  </span>
</template>

<style scoped>
.file-icon {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  color: var(--color-text-muted);
}

.file-icon svg {
  width: 100%;
  height: 100%;
}

.file-icon-label {
  position: absolute;
  left: 50%;
  bottom: 3px;
  transform: translateX(-50%);
  padding: 0 2px;
  border-radius: 2px;
  background: currentColor;
  font-size: 0.5rem;
  font-weight: 700;
  line-height: 1.3;
}

.file-icon-text {
  color: var(--color-text-inverse);
}

.file-icon-pdf {
  color: var(--color-danger);
}

.file-icon-doc {
  color: var(--color-primary);
}

.file-icon-image {
  color: var(--color-success);
}
</style>
