<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { Minus, Plus } from '@lucide/vue'
import { renderAsync } from 'docx-preview'

const props = defineProps({
  file: { type: Object, default: null },
  url: { type: String, default: null },
})

const ZOOM_LEVELS = [50, 75, 100, 125, 150, 200]
const FIT = 'fit'
const FIT_BASELINE = 100

const zoom = ref(FIT)
const docxContainer = ref(null)
const docxLoading = ref(false)
const docxError = ref('')

const fileName = computed(() => props.file?.original_name?.toLowerCase() ?? '')

const kind = computed(() => {
  if (!props.file || !props.url) return 'empty'
  const mimeType = props.file.mime_type ?? ''
  if (mimeType === 'application/pdf' || fileName.value.endsWith('.pdf')) return 'pdf'
  if (mimeType.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/.test(fileName.value)) {
    return 'image'
  }
  if (fileName.value.endsWith('.docx')) return 'docx'
  return 'unsupported'
})

const zoomable = computed(() => ['pdf', 'image', 'docx'].includes(kind.value))
const zoomValue = computed(() => (zoom.value === FIT ? FIT_BASELINE : zoom.value))
const zoomLabel = computed(() => (zoom.value === FIT ? 'Ajustado' : `${zoom.value}%`))
const canZoomOut = computed(() => zoomable.value && zoomValue.value > ZOOM_LEVELS[0])
const canZoomIn = computed(() => zoomable.value && zoomValue.value < ZOOM_LEVELS.at(-1))

const pdfUrl = computed(() => {
  const zoomParam = zoom.value === FIT ? 'page-width' : zoom.value
  return `${props.url}#toolbar=0&navpanes=0&zoom=${zoomParam}`
})

const scaledWidth = computed(() => (zoom.value === FIT ? null : `${zoom.value}%`))
const docxZoom = computed(() => (zoom.value === FIT ? null : zoom.value / 100))

function zoomOut() {
  if (!canZoomOut.value) return
  zoom.value = ZOOM_LEVELS.findLast((level) => level < zoomValue.value)
}

function zoomIn() {
  if (!canZoomIn.value) return
  zoom.value = ZOOM_LEVELS.find((level) => level > zoomValue.value)
}

function fitToWidth() {
  zoom.value = FIT
}

async function renderDocx() {
  await nextTick()
  if (kind.value !== 'docx' || !docxContainer.value) return

  docxLoading.value = true
  docxError.value = ''
  docxContainer.value.innerHTML = ''
  try {
    const response = await fetch(props.url, { credentials: 'include' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    await renderAsync(await response.blob(), docxContainer.value, null, {
      className: 'docx-preview',
      inWrapper: true,
      breakPages: true,
      renderHeaders: true,
      renderFooters: true,
    })
  } catch {
    docxError.value = 'Não foi possível carregar o arquivo.'
  } finally {
    docxLoading.value = false
  }
}

watch(
  () => [props.file?.id, props.url],
  () => {
    zoom.value = FIT
    renderDocx()
  },
  { immediate: true },
)
</script>

<template>
  <div class="file-viewer">
    <div class="viewer-toolbar">
      <div class="viewer-toolbar-info">
        <slot name="toolbar" />
      </div>
      <div class="viewer-zoom">
        <button
          type="button"
          class="viewer-control"
          aria-label="Diminuir zoom"
          :disabled="!canZoomOut"
          @click="zoomOut"
        >
          <Minus :size="14" aria-hidden="true" />
        </button>
        <span class="viewer-zoom-label" aria-live="polite">{{ zoomLabel }}</span>
        <button
          type="button"
          class="viewer-control"
          aria-label="Aumentar zoom"
          :disabled="!canZoomIn"
          @click="zoomIn"
        >
          <Plus :size="14" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="viewer-control viewer-fit"
          :disabled="!zoomable || zoom === FIT"
          @click="fitToWidth"
        >
          Ajustar
        </button>
      </div>
    </div>

    <div class="viewer-stage" :class="`viewer-stage-${kind}`">
      <p v-if="kind === 'empty'" class="viewer-message">
        Nenhum arquivo disponível para esta revisão.
      </p>

      <iframe
        v-else-if="kind === 'pdf'"
        :key="`${file.id}-${zoom}`"
        :src="pdfUrl"
        class="viewer-frame"
        :title="`Visualização de ${file.original_name}`"
      />

      <img
        v-else-if="kind === 'image'"
        :src="url"
        class="viewer-image"
        :class="{ 'viewer-image-fit': zoom === FIT }"
        :style="{ width: scaledWidth }"
        :alt="file.original_name"
      />

      <div v-else-if="kind === 'docx'" class="viewer-docx">
        <p v-if="docxLoading" class="viewer-message">Carregando documento...</p>
        <p v-else-if="docxError" class="viewer-message" role="alert">{{ docxError }}</p>
        <div ref="docxContainer" class="viewer-docx-pages" :style="{ zoom: docxZoom }" />
      </div>

      <p v-else class="viewer-message">
        Formato não suportado para visualização.
        <span>{{ file.original_name }}</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.file-viewer {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  overflow: hidden;
}

.viewer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 0.78rem;
}

.viewer-toolbar-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.viewer-zoom {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.viewer-zoom-label {
  min-width: 4rem;
  text-align: center;
}

.viewer-control {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.75rem;
  height: 1.75rem;
  padding: 0 0.4rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.75rem;
  cursor: pointer;
}

.viewer-control:hover:not(:disabled) {
  background: var(--color-surface-muted);
}

.viewer-control:disabled {
  cursor: default;
  opacity: 0.5;
}

.viewer-control:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.viewer-fit {
  padding: 0 0.6rem;
}

.viewer-stage {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.viewer-frame {
  flex: 1;
  width: 100%;
  border: 0;
  background: var(--color-surface-muted);
}

.viewer-image {
  flex-shrink: 0;
  margin: auto;
}

.viewer-image-fit {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.viewer-docx {
  position: relative;
  flex: 1;
  min-width: 0;
}

.viewer-docx-pages :deep(.docx-wrapper) {
  padding: 1rem;
  background: var(--color-surface-muted);
}

.viewer-docx-pages :deep(.docx-wrapper > section.docx) {
  margin: 0 auto 1rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.viewer-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  margin: auto;
  padding: 2rem 1rem;
  color: var(--color-text-muted);
  font-size: 0.88rem;
  text-align: center;
}

.viewer-message span {
  font-size: 0.75rem;
}
</style>
