<script setup>
import { useAuthStore } from '../../stores/authStore'

const auth = useAuthStore()
</script>

<template>
  <header class="navbar">
    <div class="navbar__inner">
      <RouterLink to="/" class="navbar__brand">Índice</RouterLink>
      <nav class="navbar__links" aria-label="Principal">
        <RouterLink to="/">Início</RouterLink>
        <RouterLink :to="{ name: 'document-upload' }">Documentos</RouterLink>
      </nav>
      <div v-if="auth.currentUser" class="navbar__user">
        <span class="navbar__avatar" aria-hidden="true">{{ auth.initials }}</span>
        <span>{{ auth.currentUser.nome }}</span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  background: var(--color-primary);
  color: #fff;
}

.navbar__inner {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 2rem;
}

.navbar__brand {
  font-weight: 700;
  font-size: 1.15rem;
}

.navbar__links {
  display: flex;
  gap: 1.25rem;
  margin-left: auto;
  font-size: 0.9rem;
}

.navbar__links a.router-link-active {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.navbar__user {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  margin-left: 1rem;
}

.navbar__avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #fff;
  color: var(--color-primary);
  font-weight: 700;
  font-size: 0.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
