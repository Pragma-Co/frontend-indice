<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  // ISO date (yyyy-mm-dd) or ''
  modelValue: { type: String, default: '' },
  id: { type: String, default: undefined },
  name: { type: String, default: undefined },
  label: { type: String, default: 'Data' },
  min: { type: String, default: undefined },
  max: { type: String, default: undefined },
  disabled: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const display = ref('')
const nativeInput = ref(null)

function formatDate(iso) {
  if (!iso) return ''
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

function parseDate(text) {
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return ''
  const [, day, month, year] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return ''
  }
  return `${year}-${month}-${day}`
}

// Keeps a half-typed text from being wiped when the parent echoes back ''.
watch(
  () => props.modelValue,
  (value) => {
    if (parseDate(display.value) !== value) display.value = formatDate(value)
  },
  { immediate: true },
)

function onType(event) {
  const digits = event.target.value.replace(/\D/g, '').slice(0, 8)
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean)
  display.value = parts.join('/')
  event.target.value = display.value
  emit('update:modelValue', parseDate(display.value))
}

function onPick(event) {
  display.value = formatDate(event.target.value)
  emit('update:modelValue', event.target.value)
}

function openPicker() {
  const picker = nativeInput.value
  if (!picker || props.disabled) return
  if (typeof picker.showPicker === 'function') picker.showPicker()
  else picker.click()
}
</script>

<template>
  <span class="date-picker">
    <input
      :id="id"
      class="date-picker__text"
      :class="{ 'date-picker__text--invalid': invalid }"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      placeholder="dd/mm/yyyy"
      maxlength="10"
      :value="display"
      :disabled="disabled"
      :aria-invalid="invalid ? 'true' : undefined"
      @input="onType"
      @click="openPicker"
    />
    <input
      ref="nativeInput"
      class="date-picker__native"
      type="date"
      lang="pt-BR"
      tabindex="-1"
      :name="name"
      :aria-label="label"
      :value="modelValue"
      :min="min"
      :max="max"
      :disabled="disabled"
      @change="onPick"
    />
  </span>
</template>

<style scoped>
.date-picker {
  position: relative;
  display: block;
}

.date-picker__text {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: 0.5rem 0.6rem;
  font: inherit;
  font-size: 0.85rem;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.date-picker__text--invalid {
  border-color: var(--color-danger);
}

.date-picker__native {
  position: absolute;
  inset: 0;
  z-index: 0;
  padding: 0;
  border: 0;
  opacity: 0;
  pointer-events: none;
}
</style>
