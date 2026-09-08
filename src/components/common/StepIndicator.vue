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
    <li v-for="(step, index) in steps" :key="step.title" class="step">
      <div class="step-marker">
        <span class="step-circle" :class="{ active: index + 1 === currentStep }">
          {{ index + 1 }}
        </span>
        <span v-if="index < steps.length - 1" class="step-line" />
      </div>
      <div class="step-text">
        <p class="step-title">{{ step.title }}</p>
        <p class="step-subtitle">{{ step.subtitle }}</p>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.steps {
  display: flex;
  list-style: none;
}

.step {
  display: flex;
  align-items: flex-start;
  flex: 1;
}

.step:last-child {
  flex: 0 0 auto;
}

.step-marker {
  display: flex;
  align-items: center;
  width: 100%;
}

.step-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  color: var(--color-text-muted);
  font-weight: 600;
  font-size: 0.85rem;
}

.step-circle.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.step-line {
  flex: 1;
  height: 0;
  border-top: 2px dashed var(--color-border);
  margin: 0 0.75rem;
}

.step-text {
  margin-left: 0.75rem;
  white-space: nowrap;
}

.step-title {
  font-weight: 600;
  font-size: 0.9rem;
}

.step-subtitle {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
</style>
