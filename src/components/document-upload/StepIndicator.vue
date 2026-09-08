<script setup>
defineProps({
  steps: { type: Array, required: true }, // [{ number, title, description }]
  current: { type: Number, required: true },
})
</script>

<template>
  <ol class="steps card" aria-label="Etapas do cadastro">
    <li
      v-for="step in steps"
      :key="step.number"
      class="steps__item"
      :class="{ 'steps__item--active': step.number === current, 'steps__item--done': step.number < current }"
      :aria-current="step.number === current ? 'step' : undefined"
    >
      <span class="steps__number">{{ step.number }}</span>
      <span class="steps__text">
        <span class="steps__title">{{ step.title }}</span>
        <span class="steps__description">{{ step.description }}</span>
      </span>
    </li>
  </ol>
</template>

<style scoped>
.steps {
  display: flex;
  justify-content: space-between;
  list-style: none;
  padding: 1rem 1.5rem;
  gap: 1rem;
}

.steps__item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  color: var(--color-text-muted);
}

.steps__number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 600;
  flex-shrink: 0;
}

.steps__item--active .steps__number,
.steps__item--done .steps__number {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.steps__item--active {
  color: var(--color-primary);
}

.steps__text {
  display: flex;
  flex-direction: column;
}

.steps__title {
  font-weight: 600;
  font-size: 0.9rem;
}

.steps__description {
  font-size: 0.75rem;
}
</style>
