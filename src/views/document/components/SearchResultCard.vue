<script setup>
import { computed } from 'vue'
import Badge from '@/components/common/Badge.vue'
import HighlightedText from '@/components/common/HighlightedText.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import {
  REVISION_BLOCK_MESSAGES,
  REVISION_BLOCK_REASONS,
  canCreateRevision,
  statusBadgeFor,
} from '@/utils/documentStatus.js'
import { formatDateAtTime } from '@/utils/formatters.js'
import { highlightSegments, resultSnippet } from '@/utils/searchHighlight.js'

const MAX_VISIBLE_TAGS = 6
const NEW_REVISION_BLOCKED_MESSAGE = REVISION_BLOCK_MESSAGES[REVISION_BLOCK_REASONS.IN_PROGRESS]

const props = defineProps({
  document: { type: Object, required: true },
  terms: { type: Array, default: () => [] },
})

const emit = defineEmits(['action'])

const titleSegments = computed(() =>
  highlightSegments(props.document.highlights?.title, props.document.title, props.terms),
)

const snippet = computed(() => resultSnippet(props.document))
const snippetSegments = computed(() =>
  highlightSegments(snippet.value.marked, snippet.value.plain, props.terms),
)

const categoryDetails = computed(() =>
  [props.document.discipline?.name, ...(props.document.areas ?? []).map((area) => area.name)]
    .filter(Boolean)
    .join(' · '),
)

const sortedTags = computed(() => {
  const matched = new Set(props.document.matchedTags)
  return [...props.document.tags]
    .sort((left, right) => Number(matched.has(right)) - Number(matched.has(left)))
    .map((name) => ({ name, matched: matched.has(name) }))
})
const visibleTags = computed(() => sortedTags.value.slice(0, MAX_VISIBLE_TAGS))
const hiddenTagsCount = computed(() => sortedTags.value.length - visibleTags.value.length)

const revisionAllowed = computed(() => canCreateRevision(props.document.status))
const statusBadge = computed(() => statusBadgeFor(props.document.status))

function openDetails() {
  emit('action', { document: props.document, action: 'view-details' })
}

function startNewRevision() {
  if (!revisionAllowed.value) return
  emit('action', { document: props.document, action: 'new-revision' })
}
</script>

<template>
  <article class="result-card">
    <header class="result-header">
      <div class="result-heading">
        <span class="result-code">{{ document.code }}</span>
        <h3 class="result-title">
          <a :href="`/documents/${document.id}`" class="result-link" @click.prevent="openDetails">
            <HighlightedText :segments="titleSegments" />
          </a>
        </h3>
      </div>
      <div class="result-badges">
        <Badge>{{ document.revision }}</Badge>
        <StatusBadge v-if="statusBadge" :status="statusBadge" />
      </div>
    </header>

    <div class="result-category">
      <span class="category-chip">{{ document.type }}</span>
      <span v-if="categoryDetails" class="category-details">{{ categoryDetails }}</span>
    </div>

    <p v-if="snippetSegments.length" class="result-snippet">
      <span v-if="snippet.fromContent" class="snippet-source">No conteúdo:</span>
      <HighlightedText :segments="snippetSegments" />
    </p>
    <p v-else class="result-snippet result-snippet-empty">Sem descrição disponível.</p>

    <footer class="result-footer">
      <ul v-if="visibleTags.length" class="result-tags" aria-label="Tags">
        <li
          v-for="tag in visibleTags"
          :key="tag.name"
          class="result-tag"
          :class="{ 'result-tag-matched': tag.matched }"
        >
          {{ tag.name }}
        </li>
        <li v-if="hiddenTagsCount > 0" class="result-tag result-tag-more">
          +{{ hiddenTagsCount }}
        </li>
      </ul>

      <div class="result-footer-end">
        <span class="result-date">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
            <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke-linecap="round" />
          </svg>
          Atualizado em {{ formatDateAtTime(document.updatedAt) }} por {{ document.updatedBy }}
        </span>
        <button
          type="button"
          class="result-action"
          :class="{ 'result-action-disabled': !revisionAllowed }"
          :aria-disabled="!revisionAllowed || undefined"
          :title="revisionAllowed ? undefined : NEW_REVISION_BLOCKED_MESSAGE"
          @click="startNewRevision"
        >
          Nova Revisão
        </button>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.result-card {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.result-card:hover,
.result-card:focus-within {
  border-color: var(--color-info-border);
  box-shadow: 0 2px 10px rgb(16 36 166 / 0.06);
}

.result-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.result-heading {
  min-width: 0;
}

.result-code {
  display: block;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.result-title {
  margin-top: 0.15rem;
  font-size: 1.05rem;
  line-height: 1.35;
}

.result-link {
  color: var(--color-primary);
  text-decoration: none;
}

.result-link:hover {
  text-decoration: underline;
}

.result-link:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 2px;
}

.result-badges {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.4rem;
}

.result-category {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.category-chip {
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  font-weight: 600;
}

.result-snippet {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
  font-size: 0.88rem;
  line-height: 1.55;
  color: var(--color-text);
}

.result-snippet-empty {
  font-style: italic;
  color: var(--color-text-muted);
}

.snippet-source {
  margin-right: 0.3rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.result-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem 1rem;
  margin-top: 0.15rem;
}

.result-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.result-tag {
  padding: 0.12rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.result-tag-matched {
  border-color: var(--color-warning-border);
  background: var(--color-highlight-bg);
  color: var(--color-highlight-text);
  font-weight: 700;
}

.result-tag-more {
  background: transparent;
}

.result-footer-end {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-left: auto;
}

.result-date {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

.result-date svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.result-action {
  background: none;
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
  border-radius: var(--radius-sm);
  padding: 0.35rem 0.65rem;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.result-action:hover {
  background: var(--color-info-bg);
}

.result-action-disabled,
.result-action-disabled:hover {
  background: var(--color-surface-muted);
  border-color: var(--color-border);
  color: var(--color-text-muted);
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .result-header {
    flex-direction: column;
    gap: 0.4rem;
  }

  .result-footer-end {
    flex-wrap: wrap;
    margin-left: 0;
  }
}
</style>
