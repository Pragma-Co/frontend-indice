<script setup>
defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, required: true },
  name: { type: String, required: true },
  legend: { type: String, default: '' },
  required: { type: Boolean, default: false },
  direction: {
    type: String,
    default: 'column',
    validator: (value) => ['row', 'column'].includes(value),
  },
  disabled: { type: Boolean, default: false },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <fieldset class="radio-group" :disabled="disabled">
    <legend v-if="legend" class="radio-group__legend">
      {{ legend }}
      <span v-if="required" aria-hidden="true">*</span>
    </legend>
    <div class="radio-group__options" :class="`radio-group__options--${direction}`">
      <label v-for="option in options" :key="option.value" class="radio-group__option">
        <input
          type="radio"
          :name="name"
          :value="option.value"
          :checked="modelValue === option.value"
          @change="$emit('update:modelValue', option.value)"
        />
        {{ option.label }}
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.radio-group {
  min-width: 0;
  padding: 0;
  margin: 0;
  border: 0;
}

.radio-group__legend {
  padding: 0;
  margin-bottom: 0.3rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.radio-group__options {
  display: flex;
  gap: 0.4rem;
}

.radio-group__options--column {
  flex-direction: column;
}

.radio-group__options--row {
  flex-direction: row;
  flex-wrap: wrap;
  gap: 1.25rem;
}

.radio-group__option {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.88rem;
  cursor: pointer;
}
</style>
