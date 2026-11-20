<script setup>
import { computed, ref, useAttrs } from 'vue'
import { Eye, EyeOff } from '@lucide/vue'

defineOptions({ inheritAttrs: false })

const model = defineModel({ type: String, default: '' })
const attrs = useAttrs()
const visible = ref(false)

const inputType = computed(() => (visible.value ? 'text' : 'password'))
const toggleLabel = computed(() => (visible.value ? 'Ocultar senha' : 'Mostrar senha'))
const isDisabled = computed(() => attrs.disabled !== undefined && attrs.disabled !== false)

function toggleVisibility() {
  visible.value = !visible.value
}
</script>

<template>
  <div class="password-input">
    <input v-bind="attrs" v-model="model" :type="inputType" class="password-input__field" />
    <button
      type="button"
      class="password-input__toggle"
      :aria-label="toggleLabel"
      :aria-pressed="String(visible)"
      :aria-controls="attrs.id"
      :disabled="isDisabled"
      @click="toggleVisibility"
    >
      <EyeOff v-if="visible" :size="18" aria-hidden="true" />
      <Eye v-else :size="18" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.password-input {
  position: relative;
  width: 100%;
}

.password-input .password-input__field {
  width: 100%;
  padding-right: 2.75rem;
}

.password-input__field::-ms-reveal,
.password-input__field::-ms-clear {
  display: none;
}

.password-input__toggle {
  position: absolute;
  top: 50%;
  right: 0.3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.1rem;
  height: 2.1rem;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transform: translateY(-50%);
  transition:
    color 0.15s ease,
    background-color 0.15s ease;
}

.password-input__toggle:hover:not(:disabled) {
  color: var(--color-text);
  background: var(--color-surface-muted);
}

.password-input__toggle:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
  color: var(--color-primary);
}

.password-input__toggle:disabled {
  cursor: default;
  opacity: 0.5;
}
</style>
