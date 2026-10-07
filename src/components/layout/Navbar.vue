<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import logo from '@/assets/logo.svg'
import bellIcon from '@/assets/icons/bell.svg'
import { useAuthStore } from '@/stores/authStore'

const route = useRoute()
const auth = useAuthStore()

const collaboratorLinks = [
  { label: 'Início', to: '/home' },
  { label: 'Documentos', to: '/documents', preserveQuery: true },
]

const managerLinks = [
  { label: 'Início', to: '/home' },
  { label: 'Revisões', to: '/revisions' },
  { label: 'Colaboradores', to: '/collaborators' },
]

const links = computed(() => (auth.isManager ? managerLinks : collaboratorLinks))

const resolvedLinks = computed(() =>
  links.value.map((link) => ({
    ...link,
    to: {
      path: link.to,
      query: link.preserveQuery ? { ...route.query } : {},
    },
  })),
)

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
        v-for="link in resolvedLinks"
        :key="link.to.path"
        :to="link.to"
        :class="['navbar-link', { active: isActive(link.to.path) }]"
      >
        {{ link.label }}
      </RouterLink>
    </nav>

    <div class="navbar-user">
      <button class="navbar-notifications" type="button" aria-label="Notificações">
        <img :src="bellIcon" alt="" class="navbar-bell" />
      </button>
      <RouterLink
        to="/profile"
        :class="['navbar-profile', { active: isActive('/profile') }]"
        aria-label="Perfil - Gestão do Titular"
      >
        <span class="navbar-avatar" aria-hidden="true">{{ auth.initials }}</span>
        <span class="navbar-user-name">{{ auth.currentUser?.name }}</span>
      </RouterLink>
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

.navbar-profile {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.25rem 0.6rem 0.25rem 0.25rem;
  border-radius: var(--radius-sm);
  color: inherit;
  text-decoration: none;
  transition: background-color 0.15s ease;
}

.navbar-profile:hover {
  background: rgba(255, 255, 255, 0.1);
}

.navbar-profile.active {
  background: rgba(255, 255, 255, 0.18);
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
.navbar-profile:focus-visible,
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

  .navbar-profile {
    padding: 0.25rem;
  }

  .navbar-user-name {
    display: none;
  }
}
</style>
