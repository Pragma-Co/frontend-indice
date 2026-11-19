<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChevronDown, ChevronUp, Search, X } from '@lucide/vue'

const props = defineProps({
  url: { type: String, required: true },
})

const pages = ref(null)
const searchInput = ref(null)
const loading = ref(true)
const error = ref('')
const searchQuery = ref('')
const searchMatches = ref([])
const activeMatchIndex = ref(-1)
const searchablePages = ref([])
const searchStatus = ref('Buscar no documento')
const MAX_PIXELS = 4_000_000

function findMatches() {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  const matches = []

  if (query) {
    searchablePages.value.forEach(({ pageNumber, textDivs, texts }) => {
      texts.forEach((text, textIndex) => {
        const searchableText = text.toLocaleLowerCase()
        const textDiv = textDivs[textIndex]
        let start = 0
        let matchStart = searchableText.indexOf(query, start)

        while (matchStart !== -1) {
          matches.push({ pageNumber, textDiv, start: matchStart, end: matchStart + query.length })
          start = matchStart + query.length
          matchStart = searchableText.indexOf(query, start)
        }
      })
    })
  }

  searchMatches.value = matches
  activeMatchIndex.value = matches.length ? 0 : -1
  searchStatus.value = !query
    ? 'Buscar no documento'
    : matches.length
      ? `1 de ${matches.length}`
      : 'Nenhum resultado'
  renderSearchHighlights()
  if (matches.length) scrollToMatch(0)
}

function renderSearchHighlights() {
  pages.value?.querySelectorAll('.protected-pdf-search-highlight').forEach((highlight) => {
    highlight.remove()
  })

  searchMatches.value.forEach((match, index) => {
    const page = pages.value?.querySelector(`[data-page-number="${match.pageNumber}"]`)
    if (!page) return

    const textNode = match.textDiv.firstChild
    if (!textNode) return

    const range = document.createRange()
    range.setStart(textNode, match.start)
    range.setEnd(textNode, match.end)
    const bounds = range.getBoundingClientRect?.()
    const pageBounds = page.getBoundingClientRect()
    const highlight = document.createElement('span')
    highlight.className = 'protected-pdf-search-highlight'
    if (index === activeMatchIndex.value) highlight.classList.add('is-active')
    highlight.style.left = `${bounds?.width ? bounds.left - pageBounds.left : 0}px`
    highlight.style.top = `${bounds?.height ? bounds.top - pageBounds.top : 0}px`
    highlight.style.width = `${Math.max(bounds?.width ?? 0, 2)}px`
    highlight.style.height = `${Math.max(bounds?.height ?? 0, 8)}px`
    page.appendChild(highlight)
  })
}

function resizeTextLayers() {
  searchablePages.value.forEach(({ pageNumber, textLayer, viewportWidth }) => {
    const page = pages.value?.querySelector(`[data-page-number="${pageNumber}"]`)
    if (!page) return
    const scale = page.offsetWidth ? page.offsetWidth / viewportWidth : 1
    textLayer.style.transform = `scale(${scale})`
  })
  renderSearchHighlights()
}

function scrollToMatch(index) {
  const match = searchMatches.value[index]
  if (!match) return
  const page = pages.value?.querySelector(`[data-page-number="${match.pageNumber}"]`)
  page?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
}

function navigateMatches(direction) {
  if (!searchMatches.value.length) return
  const count = searchMatches.value.length
  activeMatchIndex.value = (activeMatchIndex.value + direction + count) % count
  searchStatus.value = `${activeMatchIndex.value + 1} de ${count}`
  renderSearchHighlights()
  scrollToMatch(activeMatchIndex.value)
}

function handleFindShortcut(event) {
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'f') return
  event.preventDefault()
  searchInput.value?.focus()
  searchInput.value?.select()
}

function clearSearch() {
  searchQuery.value = ''
  findMatches()
  searchInput.value?.focus()
}

onMounted(() => {
  window.addEventListener('keydown', handleFindShortcut, true)
  window.addEventListener('resize', resizeTextLayers)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleFindShortcut, true)
  window.removeEventListener('resize', resizeTextLayers)
})

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
    searchQuery.value = ''
    searchMatches.value = []
    searchablePages.value = []
    activeMatchIndex.value = -1
    searchStatus.value = 'Buscar no documento'
    pages.value?.replaceChildren()

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
        const textContent = await page.getTextContent?.()
        const original = page.getViewport({ scale: 1 })
        const scale = Math.min(1.5, Math.sqrt(MAX_PIXELS / (original.width * original.height)))
        const viewport = page.getViewport({ scale })
        const pageContainer = document.createElement('div')
        pageContainer.className = 'protected-pdf-page'
        pageContainer.dataset.pageNumber = String(number)
        pageContainer.style.position = 'relative'
        pageContainer.style.flex = '0 0 auto'
        pageContainer.style.width = `min(100%, ${viewport.width}px)`
        pageContainer.style.maxWidth = '100%'
        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        canvas.style.display = 'block'
        canvas.style.width = '100%'
        canvas.style.maxWidth = '100%'
        canvas.style.height = 'auto'
        canvas.style.background = 'white'
        canvas.setAttribute('aria-label', `Página ${number} de ${pdf.numPages}`)
        pageContainer.appendChild(canvas)
        const textLayerContainer = document.createElement('div')
        textLayerContainer.className = 'protected-pdf-text-layer'
        textLayerContainer.style.position = 'absolute'
        textLayerContainer.style.top = '0'
        textLayerContainer.style.left = '0'
        textLayerContainer.style.transformOrigin = 'top left'
        textLayerContainer.style.pointerEvents = 'none'
        textLayerContainer.style.setProperty('--scale-factor', String(viewport.scale))
        pageContainer.appendChild(textLayerContainer)
        pages.value.appendChild(pageContainer)
        const textLayer = new pdfjs.TextLayer({
          textContentSource: textContent,
          container: textLayerContainer,
          viewport,
        })
        await textLayer.render()
        for (const textDiv of textLayer.textDivs) {
          textDiv.style.position = 'absolute'
          textDiv.style.color = 'transparent'
          textDiv.style.whiteSpace = 'pre'
          textDiv.style.transformOrigin = '0 0'
        }
        textLayerContainer.style.transform = `scale(${pageContainer.clientWidth / viewport.width || 1})`
        searchablePages.value.push({
          pageNumber: number,
          textDivs: textLayer.textDivs,
          texts: textLayer.textContentItemsStr,
          textLayer: textLayerContainer,
          viewportWidth: viewport.width,
        })
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
      if (active) {
        loading.value = false
        findMatches()
      }
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="protected-pdf" :class="{ 'is-error': error }">
    <div class="protected-pdf-search" role="search">
      <Search :size="16" aria-hidden="true" />
      <input
        ref="searchInput"
        v-model="searchQuery"
        type="search"
        aria-label="Buscar palavra no documento"
        placeholder="Buscar no documento"
        :disabled="loading || !!error"
        @input="findMatches"
        @keydown.enter.prevent="navigateMatches($event.shiftKey ? -1 : 1)"
      />
      <span class="protected-pdf-search-status" aria-live="polite">{{ searchStatus }}</span>
      <button
        type="button"
        class="protected-pdf-search-control"
        aria-label="Resultado anterior"
        :disabled="!searchMatches.length"
        @click="navigateMatches(-1)"
      >
        <ChevronUp :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="protected-pdf-search-control"
        aria-label="Próximo resultado"
        :disabled="!searchMatches.length"
        @click="navigateMatches(1)"
      >
        <ChevronDown :size="16" aria-hidden="true" />
      </button>
      <button
        v-if="searchQuery"
        type="button"
        class="protected-pdf-search-control"
        aria-label="Limpar busca"
        @click="clearSearch"
      >
        <X :size="16" aria-hidden="true" />
      </button>
    </div>
    <p v-if="loading" class="protected-pdf-status" role="status">Carregando documento...</p>
    <p v-if="error" class="protected-pdf-status" role="alert">{{ error }}</p>
    <div v-show="!error" ref="pages" class="protected-pdf-pages" />
  </div>
</template>

<style scoped>
.protected-pdf {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--color-surface-muted);
}

.protected-pdf.is-error {
  align-items: stretch;
}

.protected-pdf-search {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.75rem;
  padding: 0.4rem 0.65rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
}

.protected-pdf-search input {
  flex: 1;
  min-width: 0;
  height: 1.9rem;
  padding: 0 0.55rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: 0.82rem;
}

.protected-pdf-search input:focus-visible,
.protected-pdf-search-control:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.protected-pdf-search-status {
  min-width: 7rem;
  font-size: 0.72rem;
  text-align: center;
}

.protected-pdf-search-control {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.85rem;
  height: 1.85rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}

.protected-pdf-search-control:hover:not(:disabled) {
  background: var(--color-surface-muted);
}

.protected-pdf-search-control:disabled {
  cursor: default;
  opacity: 0.45;
}

.protected-pdf-status {
  padding: 1rem;
  text-align: center;
  color: var(--color-text-muted);
}

.protected-pdf-pages {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  overflow: auto;
}

.protected-pdf-page {
  position: relative;
  flex-shrink: 0;
  max-width: 100%;
}

.protected-pdf-page canvas {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  background: white;
}

.protected-pdf-pages :deep(.protected-pdf-search-highlight) {
  position: absolute;
  background: rgba(250, 204, 21, 0.38);
  pointer-events: none;
}

.protected-pdf-pages :deep(.protected-pdf-search-highlight.is-active) {
  background: rgba(249, 115, 22, 0.5);
}
</style>
