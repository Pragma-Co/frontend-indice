<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Info, Save, ShieldCheck, Trash2, User } from '@lucide/vue'
import Button from '@/components/common/Button.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import FormField from '@/components/common/FormField.vue'
import PageLayout from '@/components/layout/PageLayout.vue'
import TermsAcceptanceHistory from '@/views/user-management/components/TermsAcceptanceHistory.vue'
import {
  fetchCurrentUser,
  requestAccountDeletion as requestAccountDeletionApi,
  updateCurrentUser,
} from '@/api/users.js'
import { useAuthStore } from '@/stores/authStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'

const router = useRouter()
const authStore = useAuthStore()
const notifications = useNotificationStore()

const user = ref({})
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const confirmingDeletion = ref(false)
const deleting = ref(false)
const fieldErrors = reactive({ name: '', email: '' })

const saved = ref({ firstName: '', lastName: '', email: '' })
const form = reactive({ ...saved.value })

const isDirty = computed(() => Object.keys(form).some((key) => form[key] !== saved.value[key]))
const lastUpdate = ref('')

function splitName(fullName = '') {
  const [first = '', ...rest] = fullName.trim().split(/\s+/)
  return { firstName: first, lastName: rest.join(' ') }
}

function applyUser(data) {
  user.value = data
  saved.value = { ...splitName(data.name), email: data.email ?? '' }
  Object.assign(form, saved.value)
}

onMounted(async () => {
  try {
    applyUser(await fetchCurrentUser())
  } catch (error) {
    loadError.value = error.message
  } finally {
    loading.value = false
  }
})

function cancel() {
  Object.assign(form, saved.value)
  fieldErrors.name = ''
  fieldErrors.email = ''
}

async function save() {
  if (!isDirty.value || saving.value) return
  fieldErrors.name = ''
  fieldErrors.email = ''
  saving.value = true
  try {
    const name = [form.firstName, form.lastName].filter(Boolean).join(' ')
    const updated = await updateCurrentUser({ name, email: form.email })
    applyUser(updated)
    authStore.applyAccount(updated)
    lastUpdate.value = new Date().toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
    notifications.success('Dados atualizados com sucesso.')
  } catch (error) {
    const errors = error.details?.errors
    if (errors?.name || errors?.email) {
      fieldErrors.name = errors.name ?? ''
      fieldErrors.email = errors.email ?? ''
    } else {
      notifications.error(error.message)
    }
  } finally {
    saving.value = false
  }
}

async function requestAccountDeletion() {
  deleting.value = true
  try {
    await requestAccountDeletionApi()
    confirmingDeletion.value = false
    authStore.logout()
    await router.replace({ name: 'login' })
    notifications.success('Solicitação de exclusão da conta enviada com sucesso.')
  } catch (error) {
    confirmingDeletion.value = false
    notifications.error(error.message)
  } finally {
    deleting.value = false
  }
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

      <p v-if="loading" class="muted">Carregando dados...</p>
      <p v-else-if="loadError" class="muted load-error">{{ loadError }}</p>
      <form v-else class="form-grid" novalidate @submit.prevent="save">
        <FormField label="Nome" html-for="first-name" :error="fieldErrors.name">
          <input id="first-name" v-model="form.firstName" class="input" type="text" />
        </FormField>
        <FormField label="Sobrenome" html-for="last-name">
          <input id="last-name" v-model="form.lastName" class="input" type="text" />
        </FormField>

        <div>
          <FormField label="E-mail Corporativo" html-for="email" :error="fieldErrors.email">
            <input id="email" v-model="form.email" class="input" type="email" />
          </FormField>
          <p class="hint">Usado para login e notificações</p>
        </div>
        <FormField label="Cargo / Função" html-for="role">
          <input id="role" class="input" type="text" :value="user.role" readonly />
          <span class="readonly-tag">Somente leitura</span>
        </FormField>

        <FormField label="Departamento / Área" html-for="department">
          <input id="department" class="input" type="text" :value="user.area?.name" readonly />
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
          <button type="button" class="btn-danger" @click="confirmingDeletion = true">
            <Trash2 :size="14" aria-hidden="true" />
            Solicitar Exclusão da Conta
          </button>
          <p v-if="lastUpdate" class="muted last-update">
            <Info :size="14" aria-hidden="true" />
            Última atualização: {{ lastUpdate }}
          </p>
          <div class="form-actions">
            <Button type="button" variant="outline" :disabled="!isDirty || saving" @click="cancel"
              >Cancelar</Button
            >
            <Button type="submit" variant="primary" :disabled="!isDirty" :loading="saving">
              <Save :size="14" aria-hidden="true" />
              Salvar Alterações
            </Button>
          </div>
        </footer>
      </form>
    </section>

    <TermsAcceptanceHistory />

    <ConfirmDialog
      v-if="confirmingDeletion"
      title="Solicitar exclusão da conta?"
      message="Seus dados pessoais serão removidos e você perderá o acesso ao sistema. Esta ação não pode ser desfeita."
      confirm-label="Solicitar exclusão"
      variant="danger"
      :loading="deleting"
      @confirm="requestAccountDeletion"
      @cancel="confirmingDeletion = false"
    />
  </PageLayout>
</template>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-bottom: 1.25rem;
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

.load-error {
  color: var(--color-warning);
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

.btn-danger {
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

@media (max-width: 720px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
