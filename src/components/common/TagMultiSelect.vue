<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  options: { type: Array, default: () => [] }, // [{ value, label }]
  id: { type: String, default: undefined },
  placeholder: { type: String, default: 'Adicionar...' },
})

const emit = defineEmits(['update:modelValue'])

const available = computed(() => props.options.filter((o) => !props.modelValue.includes(o.value)))
const selected = computed(() =>
  props.modelValue.map((value) => props.options.find((o) => o.value === value) ?? { value, label: value }),
)

function add(event) {
  const value = event.target.value
  if (value && !props.modelValue.includes(value)) {
    emit('update:modelValue', [...props.modelValue, value])
  }
  event.target.value = ''
}

function remove(value) {
  emit(
    'update:modelValue',
    props.modelValue.filter((v) => v !== value),
  )
}
</script>

<template>
  <div class="tags">
    <ul v-if="modelValue.length" class="tags__list" aria-label="Itens selecionados">
      <li v-for="tag in selected" :key="tag.value" class="tags__chip">
        {{ tag.label.toUpperCase() }}
        <button
          type="button"
          class="tags__remove"
          :aria-label="`Remover ${tag.label}`"
          @click="remove(tag.value)"
        >
          ×
        </button>
      </li>
    </ul>
    <select :id="id" class="tags__select" :disabled="!available.length" @change="add">
      <option value="">{{ available.length ? placeholder : 'Todas as opções selecionadas' }}</option>
      <option v-for="option in available" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
  </div>
</template>

<style scoped>
/* Looks like a single input: chips flow inline and the select fills the remaining space. */
.tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  min-height: 2.5rem;
  max-height: 6.5rem;
  overflow-y: auto;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.tags:focus-within {
  outline: 2px solid var(--color-primary-bg);
  border-color: var(--color-primary);
}

.tags__list {
  display: contents;
  list-style: none;
}

.tags__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.2rem 0.45rem;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
}

.tags__remove {
  border: none;
  background: transparent;
  cursor: pointer;
  line-height: 1;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.tags__select {
  flex: 1;
  width: auto;
  min-width: 9rem;
  padding: 0.3rem 0.25rem;
  border: none;
  background: transparent;
}

.tags__select:focus {
  outline: none;
}
</style>
