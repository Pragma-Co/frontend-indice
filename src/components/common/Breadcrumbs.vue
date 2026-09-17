<script setup>
defineProps({
  title: { type: String, required: true },
})
</script>

<template>
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <RouterLink to="/documentos">Documentos</RouterLink>
    <span aria-hidden="true">&gt;</span>
    <span class="current" aria-current="page">{{ title }}</span>
  </nav>
</template>

<style scoped>
.breadcrumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  color: var(--color-text-muted);
  font-size: 1rem;
}

.breadcrumbs a {
  color: inherit;
  text-decoration: none;
}

.breadcrumbs a:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

.breadcrumbs .current {
  color: var(--color-primary);
  font-weight: 700;
}
</style>
