<script setup>
import { useAuthStore } from '../../stores/authStore'

const auth = useAuthStore()
</script>

<template>
  <header class="navbar">
    <div class="navbar-brand">
      <span class="brand-icon" aria-hidden="true" />
      <span class="brand-name">Índice</span>
    </div>

    <nav class="navbar-links">
      <RouterLink to="/documentos" class="navbar-link">Início</RouterLink>
      <RouterLink to="/documentos" class="navbar-link" active-class="active">Documentos</RouterLink>
    </nav>

    <div class="navbar-user">
      <button class="icon-button" type="button" aria-label="Notificações">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 4a5 5 0 0 0-5 5v3.2c0 .5-.18 1-.5 1.4L5 15.5h14l-1.5-1.9a2.2 2.2 0 0 1-.5-1.4V9a5 5 0 0 0-5-5Z"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
          <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
      </button>
      <span class="avatar" aria-hidden="true">{{ auth.currentUser?.name.charAt(0) }}</span>
      <span class="user-name">{{ auth.currentUser?.name }}</span>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-navy);
  color: var(--color-text-inverse);
  padding: 0.85rem 1.5rem;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
}

.brand-icon {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: linear-gradient(135deg, #4d7cf7, #22c5c0);
}

.navbar-links {
  display: flex;
  gap: 2rem;
}

.navbar-link {
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  font-size: 0.92rem;
}

.navbar-link:hover,
.navbar-link.active {
  color: var(--color-text-inverse);
  font-weight: 600;
}

.navbar-user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.icon-button {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  display: flex;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-navy-light);
  font-size: 0.8rem;
  font-weight: 700;
}

.user-name {
  font-size: 0.9rem;
}
</style>
