import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/manager.js', () => ({
  REVISION_DECISIONS: { APPROVED: 'APPROVED', REJECTED: 'REJECTED' },
  submitRevisionDecision: vi.fn(),
}))
vi.mock('@/stores/authStore.js', () => ({
  useAuthStore: () => ({ currentUser: { id: 10, name: 'Thiago Serpa' } }),
}))

import { submitRevisionDecision } from '@/api/manager.js'
import {
  useRevisionReview,
  validateOpinion,
} from '@/views/manager/composables/useRevisionReview.js'

const VALID_OPINION = 'Furação diverge do ensaio de tração aprovado.'

function makeRevision(overrides = {}) {
  return {
    id: 91,
    code: 'AK-3100-EST-ESP-0001',
    toRevision: 'REV02',
    files: [
      { id: 58, original_name: 'memorial.pdf', mime_type: 'application/pdf' },
      { id: 59, original_name: 'anexo.png', mime_type: 'image/png' },
    ],
    ...overrides,
  }
}

function failure(status, details) {
  return Object.assign(new Error('failed'), { status, details })
}

function deferred() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('validateOpinion', () => {
  it('should accept an approval without any opinion', () => {
    expect(validateOpinion('   ', 'APPROVED')).toBe('')
  })

  it('should require the opinion to refuse a revision', () => {
    expect(validateOpinion('   ', 'REJECTED')).toContain('obrigatório para recusar')
  })

  it('should require at least 20 characters when an opinion is written', () => {
    expect(validateOpinion('Muito curto', 'APPROVED')).toContain('pelo menos 20 caracteres')
    expect(validateOpinion('Muito curto', 'REJECTED')).toContain('pelo menos 20 caracteres')
  })

  it('should refuse an opinion longer than the limit', () => {
    expect(validateOpinion('a'.repeat(1001), 'REJECTED')).toContain('no máximo 1000 caracteres')
  })

  it('should accept a valid opinion for both decisions', () => {
    expect(validateOpinion(VALID_OPINION, 'APPROVED')).toBe('')
    expect(validateOpinion(VALID_OPINION, 'REJECTED')).toBe('')
  })
})

describe('useRevisionReview', () => {
  let onDecided
  let onUnavailable

  function review(revision = makeRevision()) {
    return useRevisionReview(revision, { onDecided, onUnavailable })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    onDecided = vi.fn()
    onUnavailable = vi.fn()
    submitRevisionDecision.mockResolvedValue({ id: 91, status: 'APPROVED' })
  })

  it('should point the viewer to the first file as the current user', () => {
    const state = review()

    expect(state.currentFile.value.id).toBe(58)
    expect(state.currentFileUrl.value).toBe('/api/files/58/view?user_id=10')
  })

  it('should move between the files of the revision and ignore positions that do not exist', () => {
    const state = review()

    state.showFile(1)
    const second = state.currentFileUrl.value
    state.showFile(2)
    state.showFile(-1)

    expect(second).toBe('/api/files/59/view?user_id=10')
    expect(state.fileIndex.value).toBe(1)
  })

  it('should have no file to show when the revision has none', () => {
    const state = review(makeRevision({ files: [] }))

    expect(state.currentFile.value).toBeNull()
    expect(state.currentFileUrl.value).toBeNull()
  })

  it('should approve without an opinion and report the decision', async () => {
    const revision = makeRevision()
    const state = review(revision)

    await state.approve()

    expect(submitRevisionDecision).toHaveBeenCalledWith(91, {
      decision: 'APPROVED',
      justification: '',
    })
    expect(onDecided).toHaveBeenCalledWith({
      revision,
      decision: 'APPROVED',
      result: { id: 91, status: 'APPROVED' },
    })
  })

  it('should send the trimmed opinion when refusing', async () => {
    const state = review()
    state.opinion.value = `  ${VALID_OPINION}  `

    await state.reject()

    expect(submitRevisionDecision).toHaveBeenCalledWith(91, {
      decision: 'REJECTED',
      justification: VALID_OPINION,
    })
    expect(onDecided).toHaveBeenCalledWith(expect.objectContaining({ decision: 'REJECTED' }))
  })

  it('should not call the backend when refusing without an opinion', async () => {
    const state = review()

    await state.reject()

    expect(state.opinionError.value).toContain('obrigatório para recusar')
    expect(submitRevisionDecision).not.toHaveBeenCalled()
    expect(onDecided).not.toHaveBeenCalled()
  })

  it('should not call the backend with an opinion that is too short', async () => {
    const state = review()
    state.opinion.value = 'Ok'

    await state.approve()

    expect(state.opinionError.value).toContain('pelo menos 20 caracteres')
    expect(submitRevisionDecision).not.toHaveBeenCalled()
  })

  it('should clear the opinion error when the reviewer edits the text', async () => {
    const state = review()
    await state.reject()

    state.clearOpinionError()

    expect(state.opinionError.value).toBe('')
  })

  it('should flag which decision is being sent and ignore a second click meanwhile', async () => {
    const pending = deferred()
    submitRevisionDecision.mockReturnValue(pending.promise)
    const state = review()

    const approval = state.approve()
    const duringSubmit = { decision: state.pendingDecision.value, busy: state.submitting.value }
    await state.reject()
    pending.resolve({ id: 91 })
    await approval

    expect(duringSubmit).toEqual({ decision: 'APPROVED', busy: true })
    expect(submitRevisionDecision).toHaveBeenCalledTimes(1)
    expect(state.submitting.value).toBe(false)
  })

  it('should hand over a revision that was already decided by someone else', async () => {
    submitRevisionDecision.mockRejectedValue(failure(409, { error: 'RevisionAlreadyDecided' }))
    const state = review()

    await state.approve()

    expect(onUnavailable).toHaveBeenCalledWith('Esta revisão já foi avaliada por outro gestor.')
    expect(onDecided).not.toHaveBeenCalled()
    expect(state.submitError.value).toBe('')
  })

  it('should hand over a revision that no longer exists', async () => {
    submitRevisionDecision.mockRejectedValue(failure(404, { error: 'RevisionNotFound' }))
    const state = review()

    await state.approve()

    expect(onUnavailable).toHaveBeenCalledWith(
      'Esta revisão não está mais disponível para avaliação.',
    )
  })

  it.each([
    [409, { error: 'OutdatedRevision', current_version: 3 }, 'versão vigente mais recente'],
    [403, { error: 'CannotReviewOwnRevision' }, 'de sua autoria'],
    [403, { error: 'PermissionDenied' }, 'não tem permissão para avaliar'],
    [401, { error: 'AuthenticationRequired' }, 'não tem permissão para avaliar'],
    [500, null, 'Não foi possível registrar a decisão'],
    [0, null, 'Não foi possível registrar a decisão'],
  ])('should keep the modal open and explain a %s failure', async (status, details, message) => {
    submitRevisionDecision.mockRejectedValue(failure(status, details))
    const state = review()

    await state.approve()

    expect(state.submitError.value).toContain(message)
    expect(onDecided).not.toHaveBeenCalled()
    expect(onUnavailable).not.toHaveBeenCalled()
    expect(state.submitting.value).toBe(false)
  })

  it('should show the opinion error returned by the backend next to the field', async () => {
    submitRevisionDecision.mockRejectedValue(
      failure(400, { errors: { justification: { code: 'too_short', message: 'x' } } }),
    )
    const state = review()
    state.opinion.value = VALID_OPINION

    await state.reject()

    expect(state.opinionError.value).toContain('pelo menos 20 caracteres')
    expect(state.submitError.value).toBe('')
  })

  it('should clear the previous failure when trying again', async () => {
    submitRevisionDecision.mockRejectedValueOnce(failure(500, null))
    const state = review()
    await state.approve()

    await state.approve()

    expect(state.submitError.value).toBe('')
    expect(onDecided).toHaveBeenCalledTimes(1)
  })
})
