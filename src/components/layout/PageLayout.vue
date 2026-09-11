<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  wide: { type: Boolean, default: false },
})
</script>

<template>
  <main class="page" :class="{ 'page-wide': wide }">
    <div class="page-header">
      <div>
        <h1>{{ title }}</h1>
        <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
      </div>
      <slot name="actions" />
    </div>
    <slot />
  </main>
</template>

<style scoped>
.page {
  max-width: 900px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem;
}

.page-wide {
  max-width: 1280px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.page-header h1 {
  font-size: 1.5rem;
}

.page-subtitle {
  color: var(--color-text-muted);
  margin-top: 0.35rem;
}
</style>
