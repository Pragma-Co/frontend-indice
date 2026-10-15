import { computed, onMounted, ref } from 'vue'
import { fetchLegalDocuments } from '@/api/legal.js'
import { acceptLegalTerms, fetchLegalAcceptances, revokeLegalAcceptance } from '@/api/users.js'
import { useNotificationStore } from '@/stores/notificationStore.js'

export const TERM_STATES = {
  ACCEPTED: 'accepted',
  REVOKED: 'revoked',
  PENDING: 'pending',
}

const LOAD_ERROR_MESSAGE = 'Não foi possível carregar o histórico de termos.'
const REVOKE_SUCCESS_MESSAGE = 'Aceite revogado. O registro continua no histórico.'
const REVOKE_ERROR_MESSAGE = 'Não foi possível revogar o aceite. Tente novamente.'
const ALREADY_REVOKED_MESSAGE = 'Este aceite já havia sido revogado.'
const ACCEPT_SUCCESS_MESSAGE = 'Termo aceito.'
const ACCEPT_ERROR_MESSAGE = 'Não foi possível aceitar o termo. Tente novamente.'
const ALREADY_ACCEPTED_MESSAGE = 'Esta versão do termo já está aceita.'
const OUTDATED_VERSION_MESSAGE =
  'Uma versão mais nova deste termo foi publicada. A lista foi atualizada com a versão atual.'

function conditionOf(clauses = []) {
  if (!clauses.length) return '—'
  return clauses.some((clause) => clause.is_required) ? 'Obrigatório' : 'Opcional'
}

function versionLabelOf(version) {
  return Number.isInteger(version) ? `v${version}` : '—'
}

function acceptedTime(row) {
  const time = new Date(row.acceptedAt).getTime()
  return Number.isNaN(time) ? 0 : time
}

export function normalizeAcceptance(acceptance) {
  const revoked = Boolean(acceptance.revoked_at)
  return {
    key: `acceptance-${acceptance.id}`,
    id: acceptance.id,
    state: revoked ? TERM_STATES.REVOKED : TERM_STATES.ACCEPTED,
    slug: acceptance.document?.slug ?? null,
    title: acceptance.document?.title ?? '—',
    versionId: acceptance.version?.id ?? null,
    versionLabel: versionLabelOf(acceptance.version?.version),
    condition: conditionOf(acceptance.consents),
    acceptedAt: acceptance.accepted_at ?? null,
    revokedAt: acceptance.revoked_at ?? null,
    revoked,
    status: revoked ? 'Revogado' : 'Aceito',
    decisions: (acceptance.consents ?? []).map((consent) => ({
      clause_id: consent.clause_id,
      accepted: consent.accepted,
    })),
    clauseIds: [],
  }
}

export function normalizePendingDocument(document) {
  const version = document.current_version ?? {}
  const clauses = version.clauses ?? []
  return {
    key: `pending-${document.slug}`,
    id: null,
    state: TERM_STATES.PENDING,
    slug: document.slug ?? null,
    title: document.title ?? '—',
    versionId: version.id ?? null,
    versionLabel: versionLabelOf(version.version),
    condition: conditionOf(clauses),
    acceptedAt: null,
    revokedAt: null,
    revoked: false,
    status: 'Não aceito',
    decisions: [],
    clauseIds: clauses.map((clause) => clause.id),
  }
}

export function sortByMostRecent(rows) {
  return [...rows].sort((first, second) => acceptedTime(second) - acceptedTime(first))
}

export function pendingDocuments(documents, acceptances) {
  return documents
    .filter((document) => document.current_version?.id)
    .filter(
      (document) =>
        !acceptances.some(
          (acceptance) =>
            acceptance.state === TERM_STATES.ACCEPTED &&
            acceptance.versionId === document.current_version.id,
        ),
    )
    .map(normalizePendingDocument)
}

export function useTermsAcceptanceHistory() {
  const notifications = useNotificationStore()
  const acceptances = ref([])
  const documents = ref([])
  const loading = ref(true)
  const error = ref('')
  const busyKey = ref(null)

  const rows = computed(() => [
    ...pendingDocuments(documents.value, acceptances.value),
    ...sortByMostRecent(acceptances.value),
  ])
  const recordCount = computed(() => acceptances.value.length)

  async function loadDocuments() {
    try {
      const response = await fetchLegalDocuments()
      return response?.results ?? []
    } catch {
      return []
    }
  }

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const [history, published] = await Promise.all([fetchLegalAcceptances(), loadDocuments()])
      acceptances.value = (history?.results ?? []).map(normalizeAcceptance)
      documents.value = published
    } catch {
      acceptances.value = []
      documents.value = []
      error.value = LOAD_ERROR_MESSAGE
    } finally {
      loading.value = false
    }
  }

  function replaceAcceptance(updated) {
    acceptances.value = acceptances.value.map((acceptance) =>
      acceptance.id === updated.id ? updated : acceptance,
    )
  }

  async function revoke(row) {
    if (busyKey.value !== null || row.state !== TERM_STATES.ACCEPTED) return false
    busyKey.value = row.key
    try {
      replaceAcceptance(normalizeAcceptance(await revokeLegalAcceptance(row.id)))
      notifications.success(REVOKE_SUCCESS_MESSAGE)
      return true
    } catch (failure) {
      if (failure?.status === 409 || failure?.status === 404) {
        notifications.error(failure.status === 409 ? ALREADY_REVOKED_MESSAGE : REVOKE_ERROR_MESSAGE)
        await load()
        return false
      }
      notifications.error(REVOKE_ERROR_MESSAGE)
      return false
    } finally {
      busyKey.value = null
    }
  }

  async function accept(row) {
    if (busyKey.value !== null || row.state !== TERM_STATES.PENDING || !row.clauseIds.length) {
      return false
    }
    busyKey.value = row.key
    try {
      const created = await acceptLegalTerms({
        versionId: row.versionId,
        consents: row.clauseIds.map((clauseId) => ({ clause_id: clauseId, accepted: true })),
      })
      acceptances.value = [normalizeAcceptance(created), ...acceptances.value]
      notifications.success(ACCEPT_SUCCESS_MESSAGE)
      return true
    } catch (failure) {
      const code = failure?.details?.error
      if (code === 'LegalVersionAlreadyAccepted' || code === 'OutdatedLegalVersion') {
        notifications.error(
          code === 'OutdatedLegalVersion' ? OUTDATED_VERSION_MESSAGE : ALREADY_ACCEPTED_MESSAGE,
        )
        await load()
        return false
      }
      notifications.error(ACCEPT_ERROR_MESSAGE)
      return false
    } finally {
      busyKey.value = null
    }
  }

  onMounted(load)

  return { rows, recordCount, loading, error, busyKey, load, revoke, accept }
}
