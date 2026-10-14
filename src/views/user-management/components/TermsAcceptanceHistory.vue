<script setup>
import { computed } from 'vue'
import { Lock } from '@lucide/vue'
import Button from '@/components/common/Button.vue'
import { useTermsAcceptanceHistory } from '@/views/user-management/composables/useTermsAcceptanceHistory.js'
import { formatDateAtTime } from '@/utils/formatters.js'

const { acceptances, loading, error, load } = useTermsAcceptanceHistory()

const countLabel = computed(() => {
  const total = acceptances.value.length
  return total === 1 ? '1 registro' : `${total} registros`
})
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

.audit-note {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 1rem;
  font-size: 0.78rem;
}
</style>
