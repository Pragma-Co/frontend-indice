<script setup>
import { computed } from 'vue'
import { CircleCheck, CircleX } from '@lucide/vue'
import { HISTORY_DECISIONS, decisionLabel } from '@/utils/decisionHistory.js'

const props = defineProps({
  requestType: { type: String, required: true },
  decision: { type: String, required: true },
})

const approved = computed(() => props.decision === HISTORY_DECISIONS.APPROVED)
const label = computed(() => decisionLabel(props.requestType, props.decision))
</script>

<template>
  <span class="decision-badge" :class="approved ? 'is-approved' : 'is-rejected'">
    <component :is="approved ? CircleCheck : CircleX" :size="13" aria-hidden="true" />
    {{ label }}
  </span>
</template>

<style scoped>
.decision-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  border: 1px solid;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.is-approved {
  border-color: var(--color-success-border);
  background: var(--color-success-bg);
  color: var(--color-success);
}

.is-rejected {
  border-color: var(--color-danger-border);
  background: var(--color-danger-bg);
  color: var(--color-danger);
}
</style>
