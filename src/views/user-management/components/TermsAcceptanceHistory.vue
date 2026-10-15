<script setup>
import { computed, ref } from 'vue'
import { Lock } from '@lucide/vue'
import Button from '@/components/common/Button.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useTermsAcceptanceHistory } from '@/views/user-management/composables/useTermsAcceptanceHistory.js'
import { formatDateAtTime } from '@/utils/formatters.js'

const {
  acceptances,
  loading,
  error,
  revokingId,
  reacceptingId,
  load,
  revoke,
  reaccept,
  canReaccept,
} = useTermsAcceptanceHistory()

const countLabel = computed(() => {
  const total = acceptances.value.length
  return total === 1 ? '1 registro' : `${total} registros`
})

const pendingAction = ref(null)

const busy = computed(() => revokingId.value !== null || reacceptingId.value !== null)

const dialog = computed(() => {
  if (!pendingAction.value) return null
  const { type, acceptance } = pendingAction.value
  const term = `"${acceptance.title}" (${acceptance.versionLabel})`
  if (type === 'revoke') {
    return {
      title: 'Revogar este aceite?',
      message: `O aceite de ${term} deixará de valer. O registro continua no histórico para auditoria e você poderá aceitar o termo novamente quando quiser.`,
      confirmLabel: 'Revogar aceite',
      variant: 'danger',
    }
  }
  return {
    title: 'Aceitar este termo novamente?',
    message: `Você aceitará ${term} de novo, com as mesmas escolhas de cláusulas do aceite anterior. Um novo registro será criado no histórico.`,
    confirmLabel: 'Aceitar novamente',
    variant: 'primary',
  }
})

async function confirmAction() {
  const { type, acceptance } = pendingAction.value
  if (type === 'revoke') await revoke(acceptance)
  else await reaccept(acceptance)
  pendingAction.value = null
}
</script>

<template>
  <section class="card terms-history" aria-labelledby="terms-history-title">
    <header class="terms-header">
      <div>
        <h2 id="terms-history-title">Histórico de Termos e Consentimentos</h2>
        <p class="muted">
          Confira as versões das políticas da plataforma e seus registros formais de aceite.
        </p>
      </div>
      <span v-if="!loading && !error" class="count-pill">{{ countLabel }}</span>
    </header>

    <p v-if="loading" class="terms-state muted" role="status">Carregando histórico...</p>

    <div v-else-if="error" class="terms-state terms-error" role="alert">
      <p>{{ error }}</p>
      <Button variant="outline" @click="load">Tentar novamente</Button>
    </div>

    <p v-else-if="!acceptances.length" class="terms-state muted">
      Nenhum aceite de termos registrado até o momento.
    </p>

    <div v-else class="table-scroll">
      <table class="terms-table">
        <thead>
          <tr>
            <th scope="col">Documento / Termo</th>
            <th scope="col">Versão</th>
            <th scope="col">Tipo de Condição</th>
            <th scope="col">Data do Aceite</th>
            <th scope="col">Status</th>
            <th scope="col">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="acceptance in acceptances" :key="acceptance.id">
            <td class="cell-title">{{ acceptance.title }}</td>
            <td>
              <span class="version-pill">{{ acceptance.versionLabel }}</span>
            </td>
            <td>{{ acceptance.condition }}</td>
            <td class="cell-date">{{ formatDateAtTime(acceptance.acceptedAt) }}</td>
            <td>
              <span class="status-pill" :class="{ revoked: acceptance.revoked }">
                {{ acceptance.status }}
              </span>
              <span v-if="acceptance.revokedAt" class="revoked-at">
                em {{ formatDateAtTime(acceptance.revokedAt) }}
              </span>
            </td>
            <td>
              <button
                v-if="!acceptance.revoked"
                type="button"
                class="action-button revoke-button"
                :disabled="busy"
                @click="pendingAction = { type: 'revoke', acceptance }"
              >
                Revogar aceite
              </button>
              <button
                v-else-if="canReaccept(acceptance)"
                type="button"
                class="action-button reaccept-button"
                :disabled="busy"
                @click="pendingAction = { type: 'reaccept', acceptance }"
              >
                Aceitar novamente
              </button>
              <span v-else class="muted">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="muted audit-note">
      <Lock :size="13" aria-hidden="true" />
      Registros de aceite são mantidos para fins de auditoria, rastreabilidade e conformidade
      regulatória.
    </p>

    <ConfirmDialog
      v-if="dialog"
      :title="dialog.title"
      :message="dialog.message"
      :confirm-label="dialog.confirmLabel"
      :variant="dialog.variant"
      :loading="busy"
      @confirm="confirmAction"
      @cancel="pendingAction = null"
    />
  </section>
</template>

<style scoped>
.terms-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.terms-header h2 {
  font-size: 1.05rem;
  font-weight: 700;
}

.terms-header p {
  margin-top: 0.25rem;
}

.muted {
  color: var(--color-text-muted);
}

.count-pill,
.version-pill {
  padding: 0.15rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
  font-size: 0.75rem;
  white-space: nowrap;
}

.terms-state {
  padding: 2rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 0.88rem;
  text-align: center;
}

.terms-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  color: var(--color-warning);
}

.table-scroll {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.terms-table {
  width: 100%;
  min-width: 40rem;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.terms-table th {
  padding: 0.75rem 1rem;
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
  font-size: 0.78rem;
  font-weight: 600;
  text-align: left;
}

.terms-table td {
  padding: 1rem;
  border-top: 1px solid var(--color-border);
}

.cell-title {
  font-weight: 600;
}

.cell-date {
  white-space: nowrap;
}

.status-pill {
  padding: 0.15rem 0.6rem;
  border: 1px solid var(--color-success-border);
  border-radius: 999px;
  background: var(--color-success-bg);
  color: var(--color-success);
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-pill.revoked {
  border-color: var(--color-border);
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
}

.revoked-at {
  display: block;
  margin-top: 0.3rem;
  color: var(--color-text-muted);
  font-size: 0.72rem;
  white-space: nowrap;
}

.action-button {
  padding: 0;
  border: none;
  background: none;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.revoke-button {
  color: var(--color-danger);
}

.reaccept-button {
  color: var(--color-primary);
}

.action-button:hover:not(:disabled) {
  text-decoration: underline;
}

.action-button:disabled {
  cursor: default;
  opacity: 0.5;
}

.action-button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.audit-note {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 1rem;
  font-size: 0.78rem;
}
</style>
