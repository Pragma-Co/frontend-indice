<script setup>
import { useRoute } from 'vue-router'
import logo from '../../assets/logo.svg'
import bellIcon from '../../assets/icons/bell.svg'
import { useAuthStore } from '../../stores/authStore'

const route = useRoute()
const auth = useAuthStore()

const links = [
  { label: 'Início', to: '/home' },
  { label: 'Documentos', to: '/documentos' },
]

function isActive(to) {
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <header class="navbar">
    <RouterLink to="/home" class="navbar-brand" aria-label="Índice - Início">
      <img :src="logo" alt="Índice" class="navbar-logo" />
    </RouterLink>

    <nav class="navbar-links" aria-label="Navegação principal">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        :class="['navbar-link', { active: isActive(link.to) }]"
      >
        {{ link.label }}
      </RouterLink>
    </nav>

    <div class="navbar-user">
      <button class="navbar-notifications" type="button" aria-label="Notificações">
        <img :src="bellIcon" alt="" class="navbar-bell" />
      </button>
      <span class="navbar-avatar" aria-hidden="true">{{ auth.initials }}</span>
      <span class="navbar-user-name">{{ auth.currentUser?.name }}</span>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
  height: 56px;
  padding: 0 1.5rem;
  background: var(--color-navy);
  color: var(--color-text-inverse);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.navbar-brand {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  border-radius: var(--radius-sm);
}

.navbar-logo {
  display: block;
  height: 28px;
  filter: brightness(0) invert(1);
}

.navbar-links {
  display: flex;
  gap: 0.5rem;
}

.navbar-link {
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  font-size: 0.92rem;
  font-weight: 500;
  padding: 0.4rem 0.9rem;
  border-radius: var(--radius-sm);
  transition:
    color 0.15s ease,
    background-color 0.15s ease;
}

.navbar-link:hover {
  color: var(--color-text-inverse);
  background: rgba(255, 255, 255, 0.1);
}

.navbar-link.active {
  color: var(--color-text-inverse);
  font-weight: 600;
  background: rgba(255, 255, 255, 0.18);
}

.navbar-user {
  display: flex;
  align-items: center;
  justify-self: end;
  gap: 0.75rem;
}

.navbar-notifications {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-navy-light);
  cursor: pointer;
}

.navbar-notifications:hover {
  filter: brightness(1.15);
}

.navbar-bell {
  width: 18px;
  height: 18px;
  filter: brightness(0) invert(1);
}

.navbar-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-navy-light);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.navbar-user-name {
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
}

.navbar-brand:focus-visible,
.navbar-link:focus-visible,
.navbar-notifications:focus-visible {
  outline: 2px solid var(--color-text-inverse);
  outline-offset: 2px;
}

@media (max-width: 640px) {
  .navbar {
    padding: 0 1rem;
    gap: 0.75rem;
  }

  .navbar-logo {
    height: 24px;
  }

  .navbar-link {
    padding: 0.35rem 0.6rem;
  }

  .navbar-user-name {
    display: none;
  }
}
</style>
