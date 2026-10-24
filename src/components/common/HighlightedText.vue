<script setup>
defineProps({
  segments: { type: Array, required: true },
  tag: { type: String, default: 'span' },
})
</script>

<template>
  <component :is="tag" class="highlighted-text">
    <template v-for="(segment, index) in segments" :key="index">
      <mark v-if="segment.match" class="highlight-match">{{ segment.text }}</mark>
      <template v-else>{{ segment.text }}</template>
    </template>
  </component>
</template>

<style scoped>
.highlight-match {
  padding: 0 0.1em;
  border-radius: 3px;
  background: var(--color-highlight-bg);
  color: var(--color-highlight-text);
  font-weight: 700;
}
</style>
