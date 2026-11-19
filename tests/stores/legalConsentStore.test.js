import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../../src/api/users', () => ({
  fetchPendingLegalTerms: vi.fn(),
  acceptLegalTerms: vi.fn(),
}))

import { acceptLegalTerms, fetchPendingLegalTerms } from '../../src/api/users'
import { useLegalConsentStore } from '../../src/stores/legalConsentStore'

describe('legalConsentStore.refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('should share a single request between concurrent refreshes', async () => {
    fetchPendingLegalTerms.mockResolvedValue({ results: [] })
    const store = useLegalConsentStore()

    await Promise.all([store.refresh(), store.refresh(), store.refresh()])

    expect(fetchPendingLegalTerms).toHaveBeenCalledTimes(1)
    expect(store.checked).toBe(true)
  })

  it('should request again once the previous refresh settled', async () => {
    fetchPendingLegalTerms.mockResolvedValue({ results: [] })
    const store = useLegalConsentStore()

    await store.refresh()
    await store.refresh()

    expect(fetchPendingLegalTerms).toHaveBeenCalledTimes(2)
  })

  it('should stay unchecked when the request fails', async () => {
    fetchPendingLegalTerms.mockRejectedValue({ status: 500 })
    const store = useLegalConsentStore()

    await store.refresh()

    expect(store.checked).toBe(false)
  })
})

describe('legalConsentStore.accept', () => {
  const PENDING = {
    slug: 'termo-tratamento-dados',
    title: 'Termo de Adesão',
    current_version: {
      id: 1,
      version: 1,
      clauses: [
        { id: 1, is_required: true },
        { id: 7, is_required: false },
      ],
    },
  }
  const DECISIONS = [
    { clause_id: 1, accepted: true },
    { clause_id: 7, accepted: false },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('should send the decisions made on each clause and refresh the pending terms', async () => {
    const store = useLegalConsentStore()
    store.pending = [PENDING]
    acceptLegalTerms.mockResolvedValue({ id: 3, accepted: true })
    fetchPendingLegalTerms.mockResolvedValue({ results: [] })

    const accepted = await store.accept(DECISIONS)

    expect(accepted).toBe(true)
    expect(acceptLegalTerms).toHaveBeenCalledWith({ versionId: 1, consents: DECISIONS })
    expect(store.pending).toEqual([])
  })

  it('should not send anything without the decisions', async () => {
    const store = useLegalConsentStore()
    store.pending = [PENDING]

    const accepted = await store.accept()

    expect(accepted).toBe(false)
    expect(acceptLegalTerms).not.toHaveBeenCalled()
  })

  it('should explain when the acceptance cannot be recorded', async () => {
    const store = useLegalConsentStore()
    store.pending = [PENDING]
    acceptLegalTerms.mockRejectedValue(Object.assign(new Error('boom'), { status: 500 }))

    const accepted = await store.accept(DECISIONS)

    expect(accepted).toBe(false)
    expect(store.error).toBe('Não foi possível registrar o aceite. Tente novamente.')
    expect(store.accepting).toBe(false)
  })
})
