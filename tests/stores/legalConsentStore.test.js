import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../../src/api/users', () => ({
  fetchPendingLegalTerms: vi.fn(),
  acceptLegalTerms: vi.fn(),
}))

import { fetchPendingLegalTerms } from '../../src/api/users'
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
