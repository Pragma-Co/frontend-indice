<script setup>
import logo from '@/assets/logo.svg'
import Button from '@/components/common/Button.vue'
import FormField from '@/components/common/FormField.vue'
import PasswordInput from '@/components/common/PasswordInput.vue'
import { useLoginForm } from './composables/useLoginForm'

const { form, errors, serverError, submitting, onBlur, clearServerError, submit } = useLoginForm()
</script>

<template>
  <main class="login">
    <section class="login-card" aria-labelledby="login-title">
      <header class="login-header">
        <img :src="logo" alt="Índice" class="login-logo" />
        <h1 id="login-title">Entrar</h1>
        <p class="login-subtitle">Acesse com seu e-mail e senha corporativos.</p>
      </header>

      <form class="login-form" novalidate @submit.prevent="submit">
        <p v-if="serverError" class="login-alert" role="alert">{{ serverError }}</p>

        <FormField
          label="E-mail"
          html-for="login-email"
          error-id="login-email-error"
          required
          :error="errors.email"
        >
          <input
            id="login-email"
            v-model="form.email"
            type="email"
            name="email"
            inputmode="email"
            autocomplete="username"
            placeholder="nome@empresa.com"
            aria-required="true"
            :aria-invalid="errors.email ? 'true' : 'false'"
            :aria-describedby="errors.email ? 'login-email-error' : undefined"
            :disabled="submitting"
            @blur="onBlur('email')"
            @input="clearServerError"
          />
        </FormField>

        <FormField
          label="Senha"
          html-for="login-password"
          error-id="login-password-error"
          required
          :error="errors.password"
        >
          <PasswordInput
            id="login-password"
            v-model="form.password"
            name="password"
            autocomplete="current-password"
            aria-required="true"
            :aria-invalid="errors.password ? 'true' : 'false'"
            :aria-describedby="errors.password ? 'login-password-error' : undefined"
            :disabled="submitting"
            @blur="onBlur('password')"
            @input="clearServerError"
          />
        </FormField>

        <Button type="submit" class="login-submit" :loading="submitting">Entrar</Button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.login {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 1.5rem;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 2.25rem 2rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 24px rgba(16, 36, 166, 0.06);
}

.login-header {
  text-align: center;
}

.login-logo {
  height: 36px;
  margin-bottom: 1.5rem;
}

.login-header h1 {
  font-size: 1.5rem;
  color: var(--color-text);
}

.login-subtitle {
  margin-top: 0.35rem;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  margin-top: 1.75rem;
}

.login-alert {
  padding: 0.65rem 0.85rem;
  border: 1px solid var(--color-danger-border);
  border-radius: var(--radius-sm);
  background: var(--color-danger-bg);
  color: var(--color-danger);
  font-size: 0.85rem;
  font-weight: 500;
}

.login-submit {
  width: 100%;
  margin-top: 0.4rem;
}

@media (max-width: 480px) {
  .login {
    align-items: flex-start;
    padding: 2.5rem 1rem 1.5rem;
  }

  .login-card {
    padding: 1.5rem 1.25rem;
    border-color: transparent;
    box-shadow: none;
  }
}
</style>
