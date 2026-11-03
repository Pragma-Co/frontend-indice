<script setup>
import { toRef } from 'vue'
import Button from '@/components/common/Button.vue'
import DocumentCarousel from '@/views/document/components/DocumentCarousel.vue'
import { useDocumentRecommendations } from '@/views/document/composables/useDocumentRecommendations.js'

const SKELETON_CARDS = 4

const props = defineProps({
  documentId: { type: [String, Number], required: true },
})

const { collections, activeKey, activeCollection, loading, error, load, selectCollection } =
  useDocumentRecommendations(toRef(props, 'documentId'))
</script>

<template>
  <section class="recommended" aria-labelledby="recommended-title">
    <header class="recommended-header">
      <h2 id="recommended-title">Recomendados</h2>
      <div
        v-if="!loading && collections.length > 1"
        class="recommended-tabs"
        role="tablist"
        aria-label="Coleções de documentos recomendados"
      >
        <button
          v-for="collection in collections"
          :key="collection.key"
          type="button"
          role="tab"
          class="recommended-tab"
          :class="{ active: collection.key === activeKey }"
          :aria-selected="collection.key === activeKey"
          @click="selectCollection(collection.key)"
        >
          {{ collection.title }} ({{ collection.count }})
        </button>
      </div>
      <span v-else-if="!loading && activeCollection" class="recommended-single">
        {{ activeCollection.title }} ({{ activeCollection.count }})
      </span>
    </header>

    <div
      v-if="loading"
      class="recommended-skeleton"
      role="status"
      aria-label="Carregando recomendados"
    >
      <span v-for="card in SKELETON_CARDS" :key="card" class="skeleton-card">
        <span class="skeleton skeleton-line short" />
        <span class="skeleton skeleton-line" />
        <span class="skeleton skeleton-line medium" />
        <span class="skeleton skeleton-chip" />
      </span>
    </div>

    <div v-else-if="error" class="recommended-state recommended-error" role="alert">
      <p>{{ error }}</p>
      <Button variant="outline" @click="load">Tentar novamente</Button>
    </div>

    <p v-else-if="!activeCollection" class="recommended-state">
      Nenhum documento relacionado a este por enquanto.
    </p>

    <DocumentCarousel
      v-else
      :documents="activeCollection.items"
      :label="`Documentos recomendados: ${activeCollection.title}`"
    />
  </section>
</template>

<style scoped>
.recommended {
  margin-top: 1.25rem;
  padding: 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.recommended-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.recommended-header h2 {
  font-size: 1rem;
}

.recommended-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.recommended-tab,
.recommended-single {
  padding: 0.35rem 0.8rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 0.78rem;
  font-weight: 600;
}

.recommended-tab {
  cursor: pointer;
}

.recommended-tab.active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-text-inverse);
}

.recommended-tab:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.recommended-skeleton {
  display: grid;
  grid-auto-columns: minmax(15rem, 17rem);
  grid-auto-flow: column;
  gap: 1rem;
  overflow: hidden;
  padding: 0 2.75rem;
}

.skeleton-card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  height: 9.5rem;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.skeleton {
  position: relative;
  display: block;
  overflow: hidden;
  border-radius: 999px;
  background: var(--color-surface-muted);
}

.skeleton-line {
  width: 90%;
  height: 0.8rem;
}

.skeleton-line.short {
  width: 45%;
}

.skeleton-line.medium {
  width: 65%;
}

.skeleton-chip {
  width: 35%;
  height: 1.1rem;
  margin-top: auto;
}

.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--color-surface) 70%, transparent),
    transparent
  );
  animation: recommended-shimmer 1.4s ease-in-out infinite;
}

@keyframes recommended-shimmer {
  100% {
    transform: translateX(100%);
  }
}

.recommended-state {
  padding: 1.5rem 1rem;
  color: var(--color-text-muted);
  font-size: 0.88rem;
  text-align: center;
}

.recommended-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  color: var(--color-warning);
}

@media (max-width: 640px) {
  .recommended-skeleton {
    grid-auto-columns: 80%;
    padding: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton::after {
    animation: none;
  }
}
</style>
