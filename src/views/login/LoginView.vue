<script setup>
import { useRouter } from 'vue-router'
import logo from '@/assets/logo.svg'
import Button from '@/components/common/Button.vue'
import { PROFILES, useAuthStore } from '@/stores/authStore'

const router = useRouter()
const auth = useAuthStore()

const profileOptions = [
  {
    profile: PROFILES.COLLABORATOR,
    label: 'Entrar como Colaborador',
    description: 'Acesso às abas Início e Documentos.',
    variant: 'primary',
  },
  {
    profile: PROFILES.MANAGER,
    label: 'Entrar como Gestor',
    description: 'Acesso às abas Início, Revisões e Colaboradores.',
    variant: 'outline',
  },
]

function enterAs(profile) {
  auth.login(profile)
  router.push({ name: 'home' })
}
</script>

<template>
  <main class="login">
    <section class="login-card card" aria-labelledby="login-title">
      <img :src="logo" alt="Índice" class="login-logo" />
      <h1 id="login-title">Entrar</h1>
      <p class="login-subtitle">Acesso provisório: escolha o perfil para continuar.</p>

      <ul class="login-options">
        <li v-for="option in profileOptions" :key="option.profile" class="login-option">
          <Button
            class="login-button"
            :variant="option.variant"
            :data-profile="option.profile"
            @click="enterAs(option.profile)"
          >
            {{ option.label }}
          </Button>
          <p class="login-option-description">{{ option.description }}</p>
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.login {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1.5rem;
}

.login-card {
  width: 100%;
  max-width: 400px;
  margin-top: 0;
  padding: 2rem;
  text-align: center;
}

.login-logo {
  height: 36px;
  margin-bottom: 1.5rem;
}

.login-card h1 {
  font-size: 1.5rem;
}

.login-subtitle {
  color: var(--color-text-muted);
  margin-top: 0.35rem;
}

.login-options {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-top: 1.75rem;
  list-style: none;
}

.login-button {
  width: 100%;
}

.login-option-description {
  color: var(--color-text-muted);
  font-size: 0.82rem;
  margin-top: 0.4rem;
}
</style>
