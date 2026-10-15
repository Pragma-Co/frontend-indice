<script setup>
import { computed, ref } from 'vue'
import { Lock } from '@lucide/vue'
import ActionMenu from '@/components/common/ActionMenu.vue'
import Button from '@/components/common/Button.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import LegalTermDialog from '@/views/user-management/components/LegalTermDialog.vue'
import {
  TERM_STATES,
  useTermsAcceptanceHistory,
} from '@/views/user-management/composables/useTermsAcceptanceHistory.js'
import { formatDateAtTime } from '@/utils/formatters.js'

const { rows, recordCount, loading, error, busyKey, load, revoke, accept } =
  useTermsAcceptanceHistory()

const countLabel = computed(() =>
  recordCount.value === 1 ? '1 registro' : `${recordCount.value} registros`,
)

const rowToRead = ref(null)
const rowToChange = ref(null)

function menuItemsFor(row) {
  const items = [{ id: 'read', label: 'Ler termo' }]
  if (row.state !== TERM_STATES.REVOKED) items.push({ id: 'change', label: 'Alterar aceite' })
  return items
}

function onMenuSelect(row, action) {
  if (action === 'read') rowToRead.value = row
  if (action === 'change') rowToChange.value = row
}

const changeDialog = computed(() => {
  const row = rowToChange.value
  if (!row) return null
  const term = `"${row.title}" (${row.versionLabel})`
  if (row.state === TERM_STATES.ACCEPTED) {
    return {
      title: 'Alterar aceite',
      message: `Você aceitou ${term} em ${formatDateAtTime(row.acceptedAt)}. Ao revogar, o aceite deixa de valer, o registro continua no histórico para auditoria e você pode aceitar o termo de novo quando quiser.`,
      confirmLabel: 'Revogar aceite',
      variant: 'danger',
    }
  }
  return {
    title: 'Alterar aceite',
    message: `Você ainda não aceitou ${term}. Ao aceitar, você concorda com todas as cláusulas desta versão, inclusive as opcionais. Leia o termo antes pelo menu "Ler termo".`,
    confirmLabel: 'Aceitar termo',
    variant: 'primary',
  }
})

async function confirmChange() {
  const row = rowToChange.value
  if (row.state === TERM_STATES.ACCEPTED) await revoke(row)
  else await accept(row)
  rowToChange.value = null
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

    <p v-else-if="!rows.length" class="terms-state muted">
      Nenhum termo disponível nem aceite registrado até o momento.
    </p>

    <div v-else class="table-scroll">
      <table class="terms-table">
        <thead>
          <tr>
            <th scope="col">Documento / Termo</th>
            <th scope="col">Versão</th>
            <th scope="col">Tipo de Condição</th>
            <th scope="col">Última atualização</th>
            <th scope="col">Status</th>
            <th scope="col">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.key" :class="`row-${row.state}`">
            <td class="cell-title">{{ row.title }}</td>
            <td>
              <span class="version-pill">{{ row.versionLabel }}</span>
            </td>
            <td>{{ row.condition }}</td>
            <td class="cell-date">{{ formatDateAtTime(row.updatedAt) }}</td>
            <td>
              <span class="status-pill" :class="row.state">{{ row.status }}</span>
            </td>
            <td class="cell-actions">
              <ActionMenu
                :items="menuItemsFor(row)"
                :label="`Ações para ${row.title}`"
                :disabled="busyKey !== null"
                @select="onMenuSelect(row, $event)"
              />
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

    <LegalTermDialog
      v-if="rowToRead && rowToRead.versionId"
      :version-id="rowToRead.versionId"
      :title="rowToRead.title"
      :version-label="rowToRead.versionLabel"
      :decisions="rowToRead.decisions"
      :accepted-at="rowToRead.acceptedAt"
      :revoked-at="rowToRead.revokedAt"
      @close="rowToRead = null"
    />

    <ConfirmDialog
      v-if="changeDialog"
      :title="changeDialog.title"
      :message="changeDialog.message"
      :confirm-label="changeDialog.confirmLabel"
      :variant="changeDialog.variant"
      :loading="busyKey !== null"
      @confirm="confirmChange"
      @cancel="rowToChange = null"
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

.status-pill.pending {
  border-color: var(--color-warning-border);
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.status-pill.revoked {
  border-color: var(--color-border);
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
}

.cell-actions {
  width: 3rem;
  text-align: right;
}

.audit-note {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 1rem;
  font-size: 0.78rem;
}
</style>
