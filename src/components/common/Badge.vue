<template>
  <span class="badge"><slot /></span>
</template>

<style scoped>
.badge {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.78rem;
  font-weight: 600;
}
</style>
