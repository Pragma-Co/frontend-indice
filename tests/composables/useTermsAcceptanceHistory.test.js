import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

vi.mock('@/api/users.js', () => ({ fetchLegalAcceptances: vi.fn() }))

import { fetchLegalAcceptances } from '@/api/users.js'
import {
  normalizeAcceptance,
  sortByMostRecent,
  useTermsAcceptanceHistory,
} from '@/views/user-management/composables/useTermsAcceptanceHistory.js'

function makeAcceptance(overrides = {}) {
  return {
    id: 4,
    accepted_at: '2026-09-24T14:32:00',
    revoked_at: null,
    document: { slug: 'termos-de-uso', title: 'Termos de Uso e Política de Privacidade' },
    version: { id: 7, version: 2, content_hash: 'abc', published_at: '2026-09-01T00:00:00' },
    consents: [
      { clause_id: 1, code: 'uso', is_required: true, accepted: true },
      { clause_id: 2, code: 'marketing', is_required: false, accepted: false },
    ],
    ...overrides,
  }
}

function deferred() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

async function mountHistory() {
  let history
  mount(
    defineComponent({
      setup() {
        history = useTermsAcceptanceHistory()
        return () => h('div')
      },
    }),
  )
  await flushPromises()
  return history
}

describe('normalizeAcceptance', () => {
  it('should describe the accepted term, its version and when it was accepted', () => {
    expect(normalizeAcceptance(makeAcceptance())).toEqual({
      id: 4,
      title: 'Termos de Uso e Política de Privacidade',
      versionLabel: 'v2',
      condition: 'Obrigatório',
      acceptedAt: '2026-09-24T14:32:00',
      revoked: false,
      status: 'Aceito',
    })
  })

  it('should call a term without required clauses optional', () => {
    const acceptance = makeAcceptance({
      consents: [{ clause_id: 2, code: 'marketing', is_required: false, accepted: true }],
    })

    expect(normalizeAcceptance(acceptance).condition).toBe('Opcional')
  })

  it('should mark a revoked acceptance', () => {
    const acceptance = normalizeAcceptance(makeAcceptance({ revoked_at: '2026-10-01T10:00:00' }))

    expect(acceptance.revoked).toBe(true)
    expect(acceptance.status).toBe('Revogado')
  })

  it('should show dashes when the payload misses data', () => {
    expect(normalizeAcceptance({ id: 9 })).toMatchObject({
      title: '—',
      versionLabel: '—',
      condition: '—',
      acceptedAt: null,
      status: 'Aceito',
    })
  })
})

describe('sortByMostRecent', () => {
  it('should order the acceptances from the most recent to the oldest', () => {
    const acceptances = [
      { id: 1, acceptedAt: '2026-03-12T09:15:00' },
      { id: 2, acceptedAt: '2026-09-24T14:32:00' },
      { id: 3, acceptedAt: '2026-06-01T08:00:00' },
    ]

    expect(sortByMostRecent(acceptances).map((acceptance) => acceptance.id)).toEqual([2, 3, 1])
    expect(acceptances.map((acceptance) => acceptance.id)).toEqual([1, 2, 3])
  })

  it('should keep acceptances without a date at the end', () => {
    const acceptances = [
      { id: 1, acceptedAt: null },
      { id: 2, acceptedAt: '2026-09-24T14:32:00' },
    ]

    expect(sortByMostRecent(acceptances).map((acceptance) => acceptance.id)).toEqual([2, 1])
  })
})

describe('useTermsAcceptanceHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should load the acceptances of the user on mount, most recent first', async () => {
    fetchLegalAcceptances.mockResolvedValue({
      count: 2,
      results: [
        makeAcceptance({ id: 1, accepted_at: '2026-03-12T09:15:00' }),
        makeAcceptance({ id: 2, accepted_at: '2026-09-24T14:32:00' }),
      ],
    })

    const history = await mountHistory()

    expect(fetchLegalAcceptances).toHaveBeenCalledTimes(1)
    expect(history.acceptances.value.map((acceptance) => acceptance.id)).toEqual([2, 1])
    expect(history.loading.value).toBe(false)
    expect(history.error.value).toBe('')
  })

  it('should stay loading until the backend answers', async () => {
    const pending = deferred()
    fetchLegalAcceptances.mockReturnValue(pending.promise)

    const history = await mountHistory()
    const loadingBefore = history.loading.value
    pending.resolve({ count: 0, results: [] })
    await flushPromises()

    expect(loadingBefore).toBe(true)
    expect(history.loading.value).toBe(false)
    expect(history.acceptances.value).toEqual([])
  })

  it('should report a failure and recover on the next load', async () => {
    fetchLegalAcceptances.mockRejectedValueOnce(new Error('offline'))
    fetchLegalAcceptances.mockResolvedValueOnce({ count: 1, results: [makeAcceptance()] })
    const history = await mountHistory()
    const failure = history.error.value

    await history.load()

    expect(failure).toBe('Não foi possível carregar o histórico de termos.')
    expect(history.error.value).toBe('')
    expect(history.acceptances.value).toHaveLength(1)
  })
})
