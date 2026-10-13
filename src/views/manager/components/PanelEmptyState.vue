<script setup>
import { Inbox } from '@lucide/vue'

defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
})
</script>

<template>
  <div class="panel-empty" role="status">
    <Inbox :size="40" :stroke-width="1.5" aria-hidden="true" class="panel-empty-icon" />
    <h3>{{ title }}</h3>
    <p v-if="description">{{ description }}</p>
  </div>
</template>

<style scoped>
.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 3.5rem 1rem;
  color: var(--color-text-muted);
  text-align: center;
}

.panel-empty-icon {
  color: var(--color-border-strong);
}

.panel-empty h3 {
  color: var(--color-text);
  font-size: 1rem;
}

.panel-empty p {
  font-size: 0.88rem;
}
</style>
