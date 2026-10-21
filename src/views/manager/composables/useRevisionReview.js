import { computed, ref } from 'vue'
import { REVISION_DECISIONS, submitRevisionDecision } from '@/api/manager.js'
import { useAuthStore } from '@/stores/authStore.js'

export const OPINION_MIN_LENGTH = 20
export const OPINION_MAX_LENGTH = 1000

const OPINION_REQUIRED_MESSAGE = 'O parecer técnico é obrigatório para recusar a revisão.'
const OPINION_TOO_SHORT_MESSAGE = `O parecer técnico deve ter pelo menos ${OPINION_MIN_LENGTH} caracteres.`
const OPINION_TOO_LONG_MESSAGE = `O parecer técnico deve ter no máximo ${OPINION_MAX_LENGTH} caracteres.`

const OWN_REVISION_MESSAGE =
  'Você não pode avaliar uma revisão de sua autoria ou de um documento sob sua responsabilidade.'
const PERMISSION_MESSAGE = 'Você não tem permissão para avaliar revisões.'
const ALREADY_DECIDED_MESSAGE = 'Esta revisão já foi avaliada por outro gestor.'
const OUTDATED_MESSAGE =
  'Já existe uma versão vigente mais recente deste documento. Esta revisão não pode ser aprovada.'
const NOT_FOUND_MESSAGE = 'Esta revisão não está mais disponível para avaliação.'
const SUBMIT_ERROR_MESSAGE = 'Não foi possível registrar a decisão. Tente novamente.'

export function validateOpinion(opinion, decision) {
  const text = opinion.trim()
  if (!text) return decision === REVISION_DECISIONS.REJECTED ? OPINION_REQUIRED_MESSAGE : ''
  if (text.length < OPINION_MIN_LENGTH) return OPINION_TOO_SHORT_MESSAGE
  if (text.length > OPINION_MAX_LENGTH) return OPINION_TOO_LONG_MESSAGE
  return ''
}

function describeFailure(failure) {
  const code = failure?.details?.error
  if (failure?.status === 404) return { message: NOT_FOUND_MESSAGE, unavailable: true }
  if (code === 'RevisionAlreadyDecided')
    return { message: ALREADY_DECIDED_MESSAGE, unavailable: true }
  if (code === 'OutdatedRevision') return { message: OUTDATED_MESSAGE }
  if (code === 'CannotReviewOwnRevision') return { message: OWN_REVISION_MESSAGE }
  if (failure?.status === 401 || failure?.status === 403) return { message: PERMISSION_MESSAGE }
  const opinionError = failure?.status === 400 && failure?.details?.errors?.justification
  if (opinionError) {
    const tooShort = opinionError.code === 'too_short'
    return { opinionMessage: tooShort ? OPINION_TOO_SHORT_MESSAGE : OPINION_REQUIRED_MESSAGE }
  }
  return { message: SUBMIT_ERROR_MESSAGE }
}

export function useRevisionReview(revision, { onDecided, onUnavailable } = {}) {
  const authStore = useAuthStore()

  const opinion = ref('')
  const opinionError = ref('')
  const submitError = ref('')
  const pendingDecision = ref(null)
  const fileIndex = ref(0)

  const files = computed(() => revision.files ?? [])
  const currentFile = computed(() => files.value[fileIndex.value] ?? null)
  const currentFileUrl = computed(() => {
    if (!currentFile.value) return null
    const userId = authStore.currentUser?.id
    const query = userId != null ? `?user_id=${userId}` : ''
    return `/api/files/${currentFile.value.id}/view${query}`
  })
  const submitting = computed(() => pendingDecision.value !== null)
  const opinionLength = computed(() => opinion.value.trim().length)
  const opinionValid = computed(() => opinionLength.value >= OPINION_MIN_LENGTH)

  function showFile(index) {
    if (index < 0 || index >= files.value.length) return
    fileIndex.value = index
  }

  function clearOpinionError() {
    opinionError.value = ''
  }

  async function decide(decision) {
    if (submitting.value) return
    submitError.value = ''
    opinionError.value = validateOpinion(opinion.value, decision)
    if (opinionError.value) return

    pendingDecision.value = decision
    try {
      const result = await submitRevisionDecision(revision.id, {
        decision,
        justification: opinion.value.trim(),
      })
      onDecided?.({ revision, decision, result })
    } catch (failure) {
      const { message = '', opinionMessage = '', unavailable = false } = describeFailure(failure)
      if (unavailable) {
        onUnavailable?.(message)
        return
      }
      opinionError.value = opinionMessage
      submitError.value = message
    } finally {
      pendingDecision.value = null
    }
  }

  return {
    opinion,
    opinionError,
    submitError,
    pendingDecision,
    submitting,
    opinionLength,
    opinionValid,
    files,
    fileIndex,
    currentFile,
    currentFileUrl,
    showFile,
    clearOpinionError,
    approve: () => decide(REVISION_DECISIONS.APPROVED),
    reject: () => decide(REVISION_DECISIONS.REJECTED),
  }
}
