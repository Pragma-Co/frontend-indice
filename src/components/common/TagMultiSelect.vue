<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  options: { type: Array, default: () => [] }, // array of strings
  id: { type: String, default: undefined },
  placeholder: { type: String, default: 'Adicionar...' },
})

const emit = defineEmits(['update:modelValue'])

const available = computed(() => props.options.filter((o) => !props.modelValue.includes(o)))

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
      <li v-for="tag in modelValue" :key="tag" class="tags__chip">
        {{ tag.toUpperCase() }}
        <button
          type="button"
          class="tags__remove"
          :aria-label="`Remover ${tag}`"
          @click="remove(tag)"
        >
          ×
        </button>
      </li>
    </ul>
    <select :id="id" class="tags__select" :disabled="!available.length" @change="add">
      <option value="">{{ available.length ? placeholder : 'Todas as opções selecionadas' }}</option>
      <option v-for="option in available" :key="option" :value="option">{{ option }}</option>
    </select>
  </div>
</template>

<style scoped>
.tags {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tags__list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  list-style: none;
}

.tags__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  background: var(--color-disabled-bg);
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
</style>
