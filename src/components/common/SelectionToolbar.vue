<script setup>
import { Trash2 } from '@lucide/vue'
import Button from './Button.vue'

defineProps({
  selectedCount: { type: Number, required: true },
  totalCount: { type: Number, required: true },
  disabled: { type: Boolean, default: false },
})

defineEmits(['toggle-all', 'remove'])
</script>

<template>
  <div class="selection-toolbar">
    <label class="selection-all">
      <input
        type="checkbox"
        :checked="totalCount > 0 && selectedCount === totalCount"
        :indeterminate="selectedCount > 0 && selectedCount < totalCount"
        :disabled="disabled || totalCount === 0"
        @change="$emit('toggle-all')"
      />
      <span>Selecionar todos</span>
    </label>
    <div class="selection-actions">
      <span class="selection-count" aria-live="polite">
        {{ selectedCount === 1 ? '1 selecionado' : `${selectedCount} selecionados` }}
      </span>
      <Button
        variant="danger-outline"
        class="selection-remove"
        :disabled="disabled || selectedCount === 0"
        @click="$emit('remove')"
      >
        <Trash2 :size="16" aria-hidden="true" class="button-icon" />Excluir selecionados
      </Button>
    </div>
  </div>
</template>

<style scoped>
.selection-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.selection-all {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.selection-all input {
  accent-color: var(--color-primary);
}

.selection-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.selection-count {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.selection-remove {
  font-size: 0.85rem;
  padding: 0.45rem 1rem;
}

.button-icon {
  vertical-align: -0.2em;
  margin-right: 0.4rem;
}
</style>
