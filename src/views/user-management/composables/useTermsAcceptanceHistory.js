import { onMounted, ref } from 'vue'
import { fetchLegalAcceptances } from '@/api/users.js'

const LOAD_ERROR_MESSAGE = 'Não foi possível carregar o histórico de termos.'

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
    title: acceptance.document?.title ?? '—',
    versionLabel: Number.isInteger(version) ? `v${version}` : '—',
    condition: conditionOf(acceptance.consents),
    acceptedAt: acceptance.accepted_at ?? null,
    revoked,
    status: revoked ? 'Revogado' : 'Aceito',
  }
}

export function sortByMostRecent(acceptances) {
  return [...acceptances].sort((first, second) => acceptedTime(second) - acceptedTime(first))
}

export function useTermsAcceptanceHistory() {
  const acceptances = ref([])
  const loading = ref(true)
  const error = ref('')

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

  onMounted(load)

  return { acceptances, loading, error, load }
}
