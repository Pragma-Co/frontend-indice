<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  url: { type: String, required: true },
  alt: { type: String, default: '' },
})

const canvas = ref(null)
const loading = ref(true)
const error = ref('')

watch(
  () => props.url,
  async (url, _, onCleanup) => {
    let active = true
    const controller = new AbortController()
    onCleanup(() => {
      active = false
      controller.abort()
    })

    loading.value = true
    error.value = ''
    try {
      const response = await fetch(url, { credentials: 'include', signal: controller.signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const bitmap = await createImageBitmap(await response.blob())
      if (!active || !canvas.value) return
      canvas.value.width = bitmap.width
      canvas.value.height = bitmap.height
      canvas.value.getContext('2d').drawImage(bitmap, 0, 0)
      bitmap.close?.()
    } catch (failure) {
      if (!active) return
      console.error('Erro ao renderizar imagem:', failure)
      error.value = 'Não foi possível carregar a imagem protegida.'
    } finally {
      if (active) loading.value = false
    }
  },
  { immediate: true, flush: 'post' },
)
</script>

<template>
  <div class="protected-image">
    <p v-if="loading" class="protected-image-status" role="status">Carregando documento...</p>
    <p v-if="error" class="protected-image-status" role="alert">{{ error }}</p>
    <canvas v-show="!error" ref="canvas" role="img" :aria-label="alt" />
  </div>
</template>

<style scoped>
.protected-image {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  align-items: center;
  justify-content: center;
  overflow: auto;
}

.protected-image-status {
  padding: 1rem;
  color: var(--color-text-muted);
}

canvas {
  max-width: 100%;
  max-height: 100%;
  margin: auto;
  object-fit: contain;
}
</style>
