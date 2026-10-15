import { onMounted, ref } from 'vue'
import { acceptLegalTerms, fetchLegalAcceptances, revokeLegalAcceptance } from '@/api/users.js'
import { useNotificationStore } from '@/stores/notificationStore.js'

const LOAD_ERROR_MESSAGE = 'Não foi possível carregar o histórico de termos.'
const REVOKE_SUCCESS_MESSAGE = 'Aceite revogado. O registro continua no histórico.'
const REVOKE_ERROR_MESSAGE = 'Não foi possível revogar o aceite. Tente novamente.'
const ALREADY_REVOKED_MESSAGE = 'Este aceite já havia sido revogado.'
const REACCEPT_SUCCESS_MESSAGE = 'Termo aceito novamente.'
const REACCEPT_ERROR_MESSAGE = 'Não foi possível aceitar o termo novamente. Tente novamente.'
const ALREADY_ACCEPTED_MESSAGE = 'Esta versão do termo já está aceita.'
const OUTDATED_VERSION_MESSAGE =
  'Existe uma versão mais nova deste termo. O aceite precisa ser feito na versão atual.'

function conditionOf(consents = []) {
  if (!consents.length) return '—'
  return consents.some((consent) => consent.is_required) ? 'Obrigatório' : 'Opcional'
}

function acceptedTime(acceptance) {
  const time = new Date(acceptance.acceptedAt).getTime()
  return Number.isNaN(time) ? 0 : time
}

export function normalizeAcceptance(acceptance) {
  const revoked = Boolean(acceptance.revoked_at)
  const version = acceptance.version?.version
  return {
    id: acceptance.id,
    versionId: acceptance.version?.id ?? null,
    decisions: (acceptance.consents ?? []).map((consent) => ({
      clause_id: consent.clause_id,
      accepted: consent.accepted,
    })),
    title: acceptance.document?.title ?? '—',
    versionLabel: Number.isInteger(version) ? `v${version}` : '—',
    condition: conditionOf(acceptance.consents),
    acceptedAt: acceptance.accepted_at ?? null,
    revokedAt: acceptance.revoked_at ?? null,
    revoked,
    status: revoked ? 'Revogado' : 'Aceito',
  }
}

export function sortByMostRecent(acceptances) {
  return [...acceptances].sort((first, second) => acceptedTime(second) - acceptedTime(first))
}

export function useTermsAcceptanceHistory() {
  const notifications = useNotificationStore()
  const acceptances = ref([])
  const loading = ref(true)
  const error = ref('')
  const revokingId = ref(null)
  const reacceptingId = ref(null)

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const response = await fetchLegalAcceptances()
      acceptances.value = sortByMostRecent((response?.results ?? []).map(normalizeAcceptance))
    } catch {
      acceptances.value = []
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

  function isBusy() {
    return revokingId.value !== null || reacceptingId.value !== null
  }

  function canReaccept(acceptance) {
    if (!acceptance.revoked || acceptance.versionId === null || !acceptance.decisions.length) {
      return false
    }
    return !acceptances.value.some(
      (other) => !other.revoked && other.versionId === acceptance.versionId,
    )
  }

  async function reaccept(acceptance) {
    if (isBusy() || !canReaccept(acceptance)) return false
    reacceptingId.value = acceptance.id
    try {
      const created = await acceptLegalTerms({
        versionId: acceptance.versionId,
        consents: acceptance.decisions,
      })
      acceptances.value = sortByMostRecent([normalizeAcceptance(created), ...acceptances.value])
      notifications.success(REACCEPT_SUCCESS_MESSAGE)
      return true
    } catch (failure) {
      const code = failure?.details?.error
      if (code === 'LegalVersionAlreadyAccepted') {
        notifications.error(ALREADY_ACCEPTED_MESSAGE)
        await load()
      } else if (code === 'OutdatedLegalVersion') {
        notifications.error(OUTDATED_VERSION_MESSAGE)
      } else {
        notifications.error(REACCEPT_ERROR_MESSAGE)
      }
      return false
    } finally {
      reacceptingId.value = null
    }
  }

  async function revoke(acceptance) {
    if (isBusy() || acceptance.revoked) return false
    revokingId.value = acceptance.id
    try {
      replaceAcceptance(normalizeAcceptance(await revokeLegalAcceptance(acceptance.id)))
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
      revokingId.value = null
    }
  }

  onMounted(load)

  return {
    acceptances,
    loading,
    error,
    revokingId,
    reacceptingId,
    load,
    revoke,
    reaccept,
    canReaccept,
  }
}
