<script setup>
import Button from '@/components/common/Button.vue'

defineProps({
  requesting: { type: Boolean, default: false },
  requested: { type: Boolean, default: false },
  rejected: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' },
})

defineEmits(['request'])
</script>

<template>
  <div class="access-overlay" role="region" aria-label="Conteúdo restrito">
    <div class="access-banner">
      <span class="access-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke-linecap="round" />
        </svg>
      </span>
      <h2>Conteúdo restrito</h2>
      <p>
        Este documento é sigiloso e você ainda não tem permissão para visualizá-lo. Solicite o
        acesso e o responsável pelo documento será notificado.
      </p>

      <p v-if="rejected" class="access-rejected" role="status">
        Sua solicitação de acesso foi recusada pelo responsável.
      </p>
      <Button
        v-else-if="!requested"
        variant="primary"
        class="access-button"
        :loading="requesting"
        :disabled="requesting"
        @click="$emit('request')"
      >
        {{ requesting ? 'Enviando solicitação…' : 'Solicitar Acesso' }}
      </Button>
      <Button v-else variant="primary" class="access-button" disabled>Solicitação enviada</Button>

      <p v-if="requested" class="access-hint" role="status">
        Você será avisado quando o responsável responder.
      </p>
      <p v-if="errorMessage" class="access-error" role="alert">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<style scoped>
.access-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(244, 246, 248, 0.55);
  border-radius: var(--radius-md);
}

.access-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  width: min(26rem, 100%);
  padding: 1.75rem 1.5rem;
  text-align: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
}

.access-icon {
  display: inline-flex;
  width: 48px;
  height: 48px;
  padding: 12px;
  border-radius: 50%;
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.access-icon svg {
  width: 100%;
  height: 100%;
}

.access-banner h2 {
  font-size: 1.05rem;
}

.access-banner p {
  font-size: 0.88rem;
  color: var(--color-text-muted);
}

.access-button {
  margin-top: 0.5rem;
  min-width: 12rem;
}

.access-rejected {
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  background: var(--color-danger-bg);
  color: var(--color-danger);
  font-size: 0.85rem;
}

.access-hint {
  font-size: 0.8rem;
}

.access-error {
  font-size: 0.85rem;
  color: var(--color-danger);
}
</style>
