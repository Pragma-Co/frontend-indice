<script setup>
import { Star } from '@lucide/vue'
import Button from '@/components/common/Button.vue'

defineEmits(['explore'])
</script>

<template>
  <div class="favorites-empty" role="status">
    <span class="icon-circle">
      <Star :size="28" :stroke-width="1.5" aria-hidden="true" />
    </span>

    <h3>Ainda não existem documentos nos favoritos</h3>
    <p>Favorite os documentos que consulta com frequência para encontrá-los aqui.</p>
    <Button @click="$emit('explore')">Explorar documentos</Button>
  </div>
</template>

<style scoped>
.favorites-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-align: center;
  color: var(--color-text-muted);
}

.icon-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  margin-bottom: 0.5rem;
  border-radius: 50%;
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

h3 {
  margin: 0;
  color: var(--color-text);
}

p {
  margin: 0 0 0.75rem;
}
</style>
