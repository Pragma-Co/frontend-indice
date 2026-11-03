<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import RecommendedDocumentCard from '@/views/document/components/RecommendedDocumentCard.vue'

const props = defineProps({
  documents: { type: Array, required: true },
  label: { type: String, required: true },
})

const track = ref(null)
const canScrollBack = ref(false)
const canScrollForward = ref(false)
let resizeObserver = null

function updateScrollState() {
  const element = track.value
  if (!element) return
  const maxScroll = element.scrollWidth - element.clientWidth
  canScrollBack.value = element.scrollLeft > 1
  canScrollForward.value = element.scrollLeft < maxScroll - 1
}

function scrollByPage(direction) {
  const element = track.value
  if (!element) return
  element.scrollBy({ left: direction * element.clientWidth * 0.9, behavior: 'smooth' })
}

watch(
  () => props.documents,
  async () => {
    await nextTick()
    if (track.value) track.value.scrollLeft = 0
    updateScrollState()
  },
)

onMounted(() => {
  updateScrollState()
  if (typeof ResizeObserver === 'function' && track.value) {
    resizeObserver = new ResizeObserver(updateScrollState)
    resizeObserver.observe(track.value)
  } else {
    window.addEventListener('resize', updateScrollState)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', updateScrollState)
})
</script>

<template>
  <div class="carousel">
    <button
      type="button"
      class="carousel-nav carousel-nav-back"
      aria-label="Ver documentos anteriores"
      :disabled="!canScrollBack"
      @click="scrollByPage(-1)"
    >
      <ChevronLeft :size="18" aria-hidden="true" />
    </button>

    <ul
      ref="track"
      class="carousel-track"
      role="list"
      :aria-label="label"
      tabindex="0"
      @scroll.passive="updateScrollState"
      @keydown.right.prevent="scrollByPage(1)"
      @keydown.left.prevent="scrollByPage(-1)"
    >
      <li v-for="document in documents" :key="document.id" class="carousel-item">
        <RecommendedDocumentCard :document="document" />
      </li>
    </ul>

    <button
      type="button"
      class="carousel-nav carousel-nav-forward"
      aria-label="Ver próximos documentos"
      :disabled="!canScrollForward"
      @click="scrollByPage(1)"
    >
      <ChevronRight :size="18" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.carousel {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.carousel-track {
  display: grid;
  flex: 1;
  grid-auto-columns: minmax(15rem, 17rem);
  grid-auto-flow: column;
  gap: 1rem;
  min-width: 0;
  margin: 0;
  padding: 0.25rem 0.25rem 0.75rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
  list-style: none;
}

.carousel-track:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.carousel-item {
  scroll-snap-align: start;
}

.carousel-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}

.carousel-nav:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.carousel-nav:disabled {
  cursor: default;
  opacity: 0.35;
}

.carousel-nav:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

@media (max-width: 640px) {
  .carousel-nav {
    display: none;
  }

  .carousel-track {
    grid-auto-columns: 80%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .carousel-track {
    scroll-behavior: auto;
  }
}
</style>
