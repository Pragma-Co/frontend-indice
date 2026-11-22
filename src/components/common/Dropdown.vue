<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  label: { type: String, default: 'Abrir' },
  width: { type: String, default: '22rem' },
})

const emit = defineEmits(['open', 'close'])

const open = ref(false)
const root = ref(null)

function onOutsideClick(event) {
  if (!root.value?.contains(event.target)) close()
}

function onKeydown(event) {
  if (event.key === 'Escape') close()
}

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('mousedown', onOutsideClick)
    document.addEventListener('keydown', onKeydown)
    emit('open')
  } else {
    document.removeEventListener('mousedown', onOutsideClick)
    document.removeEventListener('keydown', onKeydown)
    emit('close')
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onOutsideClick)
  document.removeEventListener('keydown', onKeydown)
})

defineExpose({ close })
</script>

<template>
  <div ref="root" class="dropdown">
    <slot name="trigger" :open="open" :toggle="toggle" :label="props.label" />
    <div v-if="open" class="dropdown-panel" role="dialog" :aria-label="label" :style="{ width }">
      <slot :close="close" />
    </div>
  </div>
</template>

<style scoped>
.dropdown {
  position: relative;
  display: inline-flex;
}

.dropdown-panel {
  position: absolute;
  top: calc(100% + 0.6rem);
  right: 0;
  z-index: 150;
  max-width: calc(100vw - 2rem);
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.15);
}
</style>
