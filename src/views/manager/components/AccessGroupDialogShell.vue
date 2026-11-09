<script setup>
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { X } from '@lucide/vue'

const FOCUSABLE_SELECTOR =
  'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const titleId = useId()
const dialog = ref(null)
let previouslyFocused = null
let previousBodyOverflow = ''

function close() {
  if (!props.busy) emit('close')
}

function keepFocusInside(event) {
  const focusable = [...dialog.value.querySelectorAll(FOCUSABLE_SELECTOR)]
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement
  if (event.shiftKey && (active === first || active === dialog.value)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(() => {
  previouslyFocused = document.activeElement
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  dialog.value?.focus()
})

onBeforeUnmount(() => {
  document.body.style.overflow = previousBodyOverflow
  previouslyFocused?.focus?.()
})
</script>

<template>
  <Teleport to="body">
    <div class="group-dialog-overlay" @mousedown.self="close">
      <div
        ref="dialog"
        class="group-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
        @keydown.esc.stop="close"
        @keydown.tab="keepFocusInside"
      >
        <header class="group-dialog-header">
          <div>
            <h2 :id="titleId">{{ title }}</h2>
            <p v-if="subtitle" class="group-dialog-subtitle">{{ subtitle }}</p>
          </div>
          <button
            type="button"
            class="group-dialog-close"
            aria-label="Fechar"
            :disabled="busy"
            @click="close"
          >
            <X :size="18" aria-hidden="true" />
          </button>
        </header>

        <div class="group-dialog-body">
          <slot />
        </div>

        <footer class="group-dialog-footer">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.group-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.55);
}

.group-dialog {
  display: flex;
  flex-direction: column;
  width: min(32rem, 100%);
  max-height: 100%;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.3);
  overflow: hidden;
}

.group-dialog:focus {
  outline: none;
}

.group-dialog-header {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.group-dialog-header h2 {
  font-size: 1.15rem;
  overflow-wrap: anywhere;
}

.group-dialog-subtitle {
  margin-top: 0.35rem;
  color: var(--color-text-muted);
  font-size: 0.82rem;
}

.group-dialog-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
}

.group-dialog-close:hover:not(:disabled) {
  background: var(--color-surface-muted);
}

.group-dialog-close:disabled {
  cursor: default;
  opacity: 0.5;
}

.group-dialog-body {
  flex: 1;
  min-height: 0;
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
}

.group-dialog-footer {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

@media (max-width: 480px) {
  .group-dialog-footer {
    flex-direction: column-reverse;
  }
}
</style>
