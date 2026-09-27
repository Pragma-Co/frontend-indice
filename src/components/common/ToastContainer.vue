<script setup>
import { useNotificationStore } from '../../stores/notificationStore'

const notifications = useNotificationStore()
</script>

<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="item in notifications.items"
        :key="item.id"
        class="toast"
        :class="`toast-${item.type}`"
        :role="item.type === 'error' ? 'alert' : 'status'"
      >
        <span class="toast-message">{{ item.message }}</span>
        <button
          type="button"
          class="toast-close"
          aria-label="Fechar notificação"
          @click="notifications.dismiss(item.id)"
        >
          ×
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  top: 72px;
  right: 1.5rem;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: min(24rem, calc(100vw - 2rem));
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-info-border);
  border-radius: var(--radius-sm);
  background: var(--color-info-bg);
  color: var(--color-info);
  font-size: 0.88rem;
  font-weight: 500;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  pointer-events: auto;
}

.toast-success {
  border-color: var(--color-success-border);
  background: var(--color-success-bg);
  color: var(--color-success);
}

.toast-error {
  border-color: var(--color-danger-border);
  background: var(--color-danger-bg);
  color: var(--color-danger);
}

.toast-message {
  flex: 1;
}

.toast-close {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 640px) {
  .toasts {
    right: 1rem;
  }
}
</style>
