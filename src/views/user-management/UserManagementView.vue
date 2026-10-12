<script setup>
import { computed, reactive, ref } from 'vue'
import { ExternalLink, Info, Lock, Save, ShieldCheck, Trash2, User } from '@lucide/vue'
import Button from '@/components/common/Button.vue'
import FormField from '@/components/common/FormField.vue'
import PageLayout from '@/components/layout/PageLayout.vue'
import { useAuthStore } from '@/stores/authStore.js'

const authStore = useAuthStore()
const user = computed(() => authStore.currentUser ?? {})

function splitName(fullName = '') {
  const [first = '', ...rest] = fullName.trim().split(/\s+/)
  return { firstName: first, lastName: rest.join(' ') }
}

const saved = ref({ ...splitName(user.value.name), email: user.value.email ?? '' })
const form = reactive({ ...saved.value })

const isDirty = computed(() => Object.keys(form).some((key) => form[key] !== saved.value[key]))
const lastUpdate = ref('')

// TODO: replace with API data once the consent endpoints exist.
const consents = [
  {
    id: 1,
    name: 'Termos de Uso e Política de Privacidade - Versão Geral',
    version: 'v1.2',
    type: 'Obrigatório',
    acceptedAt: '24/09/2026 às 14:32',
    status: 'Aceito',
  },
  {
    id: 2,
    name: 'Termo de Consentimento para Uso de Dados Pessoais',
    version: 'v1.0',
    type: 'Opcional',
    acceptedAt: '12/03/2026 às 09:15',
    status: 'Aceito',
  },
]

function cancel() {
  Object.assign(form, saved.value)
}

function save() {
  // TODO: persist through the API once available.
  saved.value = { ...form }
  lastUpdate.value = new Date().toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function requestAccountDeletion() {
  // TODO: call the account deletion request endpoint.
}
</script>

<template>
  <PageLayout title="Gestão do Titular e Perfil" wide>
    <section class="card">
      <header class="section-header">
        <span class="section-icon" aria-hidden="true">
          <User :size="18" />
        </span>
        <div class="section-header-text">
          <h2>Informações Pessoais</h2>
          <p class="muted">Mantenha seus dados de contato e identificação atualizados.</p>
        </div>
      </header>

      <form class="form-grid" @submit.prevent="save">
        <FormField label="Nome" html-for="first-name">
          <input id="first-name" v-model="form.firstName" class="input" type="text" />
        </FormField>
        <FormField label="Sobrenome" html-for="last-name">
          <input id="last-name" v-model="form.lastName" class="input" type="text" />
        </FormField>

        <div>
          <FormField label="E-mail Corporativo" html-for="email">
            <input id="email" v-model="form.email" class="input" type="email" />
          </FormField>
          <p class="hint">Usado para login e notificações</p>
        </div>
        <FormField label="Cargo / Função" html-for="role">
          <input id="role" class="input" type="text" :value="user.role" readonly />
          <span class="readonly-tag">Somente leitura</span>
        </FormField>

        <FormField label="Departamento / Área" html-for="department">
          <input
            id="department"
            class="input"
            type="text"
            :value="[user.department, user.area].filter(Boolean).join(' - ')"
            readonly
          />
          <span class="readonly-tag">Somente leitura</span>
        </FormField>
        <aside class="protected-box">
          <ShieldCheck :size="16" aria-hidden="true" />
          <div class="protected-box-text">
            <strong>Dados organizacionais protegidos</strong>
            <p class="muted">Cargo e área são sincronizados pelo administrador da organização.</p>
          </div>
        </aside>

        <footer class="form-footer">
          <button type="button" class="btn-danger" @click="requestAccountDeletion">
            <Trash2 :size="14" aria-hidden="true" />
            Solicitar Exclusão da Conta
          </button>
          <p v-if="lastUpdate" class="muted last-update">
            <Info :size="14" aria-hidden="true" />
            Última atualização: {{ lastUpdate }}
          </p>
          <div class="form-actions">
            <Button variant="outline" :disabled="!isDirty" @click="cancel">Cancelar</Button>
            <Button variant="primary" :disabled="!isDirty" @click="save">
              <Save :size="14" aria-hidden="true" />
              Salvar Alterações
            </Button>
          </div>
        </footer>
      </form>
    </section>

    <section class="card">
      <header class="section-header section-header--between">
        <div>
          <h2>Histórico de Termos e Consentimentos</h2>
          <p class="muted">
            Confira as versões das políticas da plataforma e seus registros formais de aceite.
          </p>
        </div>
        <span class="count-pill">{{ consents.length }} registros</span>
      </header>

      <div class="table-scroll">
        <table class="consents-table">
          <thead>
            <tr>
              <th>Documento / Termo</th>
              <th>Versão</th>
              <th>Tipo de Condição</th>
              <th>Data do Aceite</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="consent in consents" :key="consent.id">
              <td class="cell-name">{{ consent.name }}</td>
              <td>
                <span class="version-pill">{{ consent.version }}</span>
              </td>
              <td>{{ consent.type }}</td>
              <td>{{ consent.acceptedAt }}</td>
              <td>
                <span class="status-pill">{{ consent.status }}</span>
              </td>
              <td>
                <a href="#" class="link" @click.prevent>
                  Visualizar Termo Completo
                  <ExternalLink :size="13" aria-hidden="true" />
                </a>
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
  </PageLayout>
</template>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-bottom: 1.25rem;
}

.section-header--between {
  justify-content: space-between;
  align-items: flex-start;
}

.section-header h2 {
  font-size: 1.05rem;
  font-weight: 700;
}

.section-header-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.section-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.muted {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem 1.5rem;
}

.input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font: inherit;
  font-size: 0.9rem;
  color: var(--color-text);
  background: var(--color-surface);
}

.input:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.input[readonly] {
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
}

.hint {
  margin-top: 0.35rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.readonly-tag {
  position: absolute;
  top: -1.65rem;
  right: 0;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.protected-box {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0.9rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  color: var(--color-primary);
  font-size: 0.85rem;
}

.protected-box strong {
  color: var(--color-text);
}

.protected-box-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-footer {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding-top: 1.25rem;
  border-top: 1px solid var(--color-border);
}

.last-update {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.btn-danger,
.link,
.audit-note {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-danger {
  padding: 0.55rem 1rem;
  border: 1px solid var(--color-danger-border);
  border-radius: var(--radius-sm);
  background: var(--color-danger-bg);
  color: var(--color-danger);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-danger:hover {
  filter: brightness(0.97);
}

.count-pill,
.version-pill {
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  font-size: 0.75rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.table-scroll {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.consents-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.consents-table th {
  text-align: left;
  padding: 0.75rem 1rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
}

.consents-table td {
  padding: 1rem;
  border-top: 1px solid var(--color-border);
}

.cell-name {
  font-weight: 600;
}

.status-pill {
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  background: var(--color-success-bg);
  border: 1px solid var(--color-success-border);
  color: var(--color-success);
  font-size: 0.75rem;
  font-weight: 600;
}

.link {
  color: var(--color-primary);
  font-weight: 600;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.audit-note {
  margin-top: 1rem;
  font-size: 0.78rem;
}

@media (max-width: 720px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
