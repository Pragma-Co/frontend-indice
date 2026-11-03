<script setup>
import { computed } from 'vue'
import Badge from '@/components/common/Badge.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { statusBadgeFor } from '@/utils/documentStatus.js'

const MAX_VISIBLE_REASONS = 3

const props = defineProps({
  document: { type: Object, required: true },
})

const statusBadge = computed(() => statusBadgeFor(props.document.status))
const category = computed(() =>
  [props.document.type, props.document.discipline].filter(Boolean).join(' · '),
)
const visibleReasons = computed(() => props.document.reasons.slice(0, MAX_VISIBLE_REASONS))
const hiddenReasons = computed(() => props.document.reasons.length - visibleReasons.value.length)
</script>

<template>
  <RouterLink
    :to="{ name: 'document-details', params: { documentId: document.id } }"
    class="recommended-card"
  >
    <span class="recommended-code">{{ document.code }}</span>
    <span class="recommended-title">{{ document.title }}</span>
    <span v-if="category" class="recommended-category">{{ category }}</span>
    <span class="recommended-badges">
      <Badge v-if="document.revision">{{ document.revision }}</Badge>
      <StatusBadge v-if="statusBadge" :status="statusBadge" />
    </span>
    <span v-if="visibleReasons.length" class="recommended-reasons">
      <span v-for="reason in visibleReasons" :key="reason" class="reason-chip">{{ reason }}</span>
      <span v-if="hiddenReasons > 0" class="reason-chip reason-more">+{{ hiddenReasons }}</span>
    </span>
  </RouterLink>
</template>

<style scoped>
.recommended-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: 100%;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  text-decoration: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.recommended-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
}

.recommended-card:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.recommended-code {
  color: var(--color-text-muted);
  font-size: 0.72rem;
  font-weight: 600;
}

.recommended-title {
  display: -webkit-box;
  overflow: hidden;
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.recommended-category {
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.recommended-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.recommended-reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: auto;
}

.reason-chip {
  padding: 0.15rem 0.5rem;
  border: 1px solid var(--color-info-border);
  border-radius: 999px;
  background: var(--color-info-bg);
  color: var(--color-primary);
  font-size: 0.68rem;
  font-weight: 600;
  white-space: nowrap;
}

.reason-more {
  border-color: var(--color-border);
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
}
</style>
