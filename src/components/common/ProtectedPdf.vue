<script setup>
import { nextTick, ref, watch } from 'vue'

const props = defineProps({
  url: { type: String, required: true },
})

const pages = ref(null)
const loading = ref(true)
const error = ref('')
const MAX_PIXELS = 4_000_000

watch(
  () => props.url,
  async (url, _, onCleanup) => {
    let active = true
    let loadingTask
    let renderTask
    const controller = new AbortController()

    onCleanup(() => {
      active = false
      controller.abort()
      renderTask?.cancel()
      if (loadingTask) {
        loadingTask.destroy().catch((failure) => console.error('Erro ao liberar PDF:', failure))
      }
    })

    loading.value = true
    error.value = ''
    await nextTick()
    if (!active || !pages.value) return
    pages.value.replaceChildren()

    try {
      const [pdfjs, worker, response] = await Promise.all([
        import('pdfjs-dist'),
        import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
        fetch(url, { credentials: 'include', signal: controller.signal }),
      ])
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.arrayBuffer()
      if (!active) return
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default
      loadingTask = pdfjs.getDocument({ data })
      const pdf = await loadingTask.promise

      for (let number = 1; number <= pdf.numPages && active; number += 1) {
        const page = await pdf.getPage(number)
        if (!active) return
        const original = page.getViewport({ scale: 1 })
        const scale = Math.min(1.5, Math.sqrt(MAX_PIXELS / (original.width * original.height)))
        const viewport = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        canvas.setAttribute('aria-label', `Página ${number} de ${pdf.numPages}`)
        pages.value.appendChild(canvas)
        renderTask = page.render({ canvasContext: canvas.getContext('2d'), viewport })
        await renderTask.promise
        renderTask = null
        page.cleanup()
      }
    } catch (failure) {
      if (!active) return
      console.error('Erro ao renderizar PDF:', failure)
      error.value = 'Não foi possível carregar o PDF protegido.'
    } finally {
      if (active) loading.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="protected-pdf">
    <p v-if="loading" class="protected-pdf-status" role="status">Carregando documento...</p>
    <p v-if="error" class="protected-pdf-status" role="alert">{{ error }}</p>
    <div ref="pages" class="protected-pdf-pages" />
  </div>
</template>

<style scoped>
.protected-pdf {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  background: var(--color-surface-muted);
}

.protected-pdf-status {
  padding: 1rem;
  text-align: center;
  color: var(--color-text-muted);
}

.protected-pdf-pages {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
}

.protected-pdf-pages :deep(canvas) {
  display: block;
  width: 100%;
  max-width: max-content;
  height: auto;
  background: white;
}
</style>
