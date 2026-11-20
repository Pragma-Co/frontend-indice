<script setup>
import { computed } from 'vue'

const MESSAGES = {
  loading: {
    title: 'Analisando o documento…',
    detail: 'A IA está identificando disciplina, tipo e área.',
  },
  generating: {
    title: 'Escrevendo título e descrição…',
    detail: 'Os campos são liberados assim que a IA terminar.',
  },
  success: {
    title: 'Sugestões prontas',
    detail: 'Revise e altere os campos conforme necessário.',
  },
}

const props = defineProps({
  status: {
    type: String,
    required: true,
    validator: (value) => ['loading', 'generating', 'success'].includes(value),
  },
})

defineEmits(['skip'])

const working = computed(() => props.status !== 'success')
const message = computed(() => MESSAGES[props.status])
const steps = computed(() => [
  { label: 'Classificação', state: props.status === 'loading' ? 'active' : 'done' },
  { label: 'Título e descrição', state: props.status === 'loading' ? 'pending' : 'active' },
])
</script>

<template>
  <section
    class="ai-status"
    :class="working ? 'ai-status--working' : 'ai-status--done'"
    role="status"
    aria-live="polite"
  >
    <span class="ai-status__icon" aria-hidden="true">
      <svg v-if="working" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.5l1.8 4.9 4.9 1.8-4.9 1.8L12 15.9l-1.8-4.9-4.9-1.8 4.9-1.8L12 2.5z" />
        <path d="M19 15l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z" />
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="m5 12.5 4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </span>

    <div class="ai-status__body">
      <p class="ai-status__title">{{ message.title }}</p>
      <p class="ai-status__detail">{{ message.detail }}</p>
      <ol v-if="working" class="ai-status__steps">
        <li
          v-for="step in steps"
          :key="step.label"
          class="ai-status__step"
          :class="`ai-status__step--${step.state}`"
        >
          <span class="ai-status__dot" aria-hidden="true" />
          {{ step.label }}
        </li>
      </ol>
    </div>

    <button v-if="working" type="button" class="ai-status__skip" @click="$emit('skip')">
      Preencher manualmente
    </button>

    <span v-if="working" class="ai-status__progress" aria-hidden="true" />
  </section>
</template>

<style scoped>
.ai-status {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  margin-bottom: 1.25rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--color-info-border);
  border-radius: var(--radius-md);
  background: linear-gradient(120deg, var(--color-info-bg), var(--color-surface) 85%);
  color: var(--color-text);
  overflow: hidden;
}

.ai-status--done {
  border-color: var(--color-success-border);
  background: var(--color-success-bg);
}

.ai-status__icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: var(--color-info);
  color: var(--color-text-inverse);
}

.ai-status__icon svg {
  width: 1.1rem;
  height: 1.1rem;
}

.ai-status--working .ai-status__icon svg {
  animation: ai-status-twinkle 1.6s ease-in-out infinite;
}

.ai-status--working .ai-status__icon::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid var(--color-info);
  animation: ai-status-ring 1.6s ease-out infinite;
}

.ai-status--done .ai-status__icon {
  background: var(--color-success);
}

.ai-status__body {
  flex: 1;
  min-width: 0;
}

.ai-status__title {
  font-size: 0.9rem;
  font-weight: 600;
}

.ai-status__detail {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.ai-status__steps {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1rem;
  margin: 0.45rem 0 0;
  padding: 0;
  list-style: none;
}

.ai-status__step {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.ai-status__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  border: 1.5px solid currentColor;
}

.ai-status__step--active {
  color: var(--color-info);
}

.ai-status__step--active .ai-status__dot {
  background: currentColor;
  animation: ai-status-blink 1s ease-in-out infinite;
}

.ai-status__step--done {
  color: var(--color-success);
}

.ai-status__step--done .ai-status__dot {
  background: currentColor;
}

.ai-status__skip {
  flex-shrink: 0;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--color-info-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-info);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.ai-status__skip:hover {
  background: var(--color-info-bg);
}

.ai-status__progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: var(--color-info-border);
}

.ai-status__progress::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 35%;
  border-radius: 999px;
  background: var(--color-info);
  animation: ai-status-slide 1.4s ease-in-out infinite;
}

@keyframes ai-status-slide {
  0% {
    left: -35%;
  }
  100% {
    left: 100%;
  }
}

@keyframes ai-status-ring {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}

@keyframes ai-status-twinkle {
  50% {
    transform: scale(0.8) rotate(12deg);
  }
}

@keyframes ai-status-blink {
  50% {
    opacity: 0.35;
  }
}

@media (max-width: 720px) {
  .ai-status {
    flex-wrap: wrap;
  }

  .ai-status__skip {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ai-status__icon svg,
  .ai-status__icon::after,
  .ai-status__dot,
  .ai-status__progress::after {
    animation: none;
  }

  .ai-status__progress::after {
    left: 0;
    width: 100%;
  }
}
</style>
