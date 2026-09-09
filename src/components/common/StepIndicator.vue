<script setup>
defineProps({
  steps: {
    type: Array,
    required: true,
    // [{ title: 'Upload', subtitle: 'Arquivos do projeto' }, ...]
  },
  currentStep: {
    type: Number,
    required: true,
  },
})
</script>

<template>
  <ol class="steps">
    <template v-for="(step, index) in steps" :key="step.title">
      <li class="step">
        <span class="step-circle" :class="{ active: index + 1 === currentStep, done: index + 1 < currentStep }">
          {{ index + 1 }}
        </span>
        <span class="step-text">
          <span class="step-title">{{ step.title }}</span>
          <span class="step-subtitle">{{ step.subtitle }}</span>
        </span>
      </li>
      <li v-if="index < steps.length - 1" class="step-connector" aria-hidden="true" />
    </template>
  </ol>
</template>

<style scoped>
.steps {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  list-style: none;
  row-gap: 1rem;
}

.step {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 0 0 auto;
}

.step-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  color: var(--color-text-muted);
  font-weight: 600;
  font-size: 0.85rem;
}

.step-circle.active,
.step-circle.done {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.step-connector {
  flex: 1 1 32px;
  min-width: 24px;
  height: 0;
  align-self: center;
  border-top: 2px dashed var(--color-border);
  margin: 0 0.75rem;
}

.step-text {
  display: flex;
  flex-direction: column;
}

.step-title {
  font-weight: 600;
  font-size: 0.9rem;
  line-height: 1.3;
}

.step-subtitle {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  line-height: 1.3;
}
</style>
