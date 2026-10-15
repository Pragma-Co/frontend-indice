import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/api/users.js', () => ({
  fetchLegalAcceptances: vi.fn(),
  revokeLegalAcceptance: vi.fn(),
  acceptLegalTerms: vi.fn(),
}))

import { acceptLegalTerms, fetchLegalAcceptances, revokeLegalAcceptance } from '@/api/users.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
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
      versionId: 7,
      decisions: [
        { clause_id: 1, accepted: true },
        { clause_id: 2, accepted: false },
      ],
      title: 'Termos de Uso e Política de Privacidade',
      versionLabel: 'v2',
      condition: 'Obrigatório',
      acceptedAt: '2026-09-24T14:32:00',
      revokedAt: null,
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
    expect(acceptance.revokedAt).toBe('2026-10-01T10:00:00')
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
    setActivePinia(createPinia())
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

  it('should revoke an acceptance, keep it in the list and confirm it', async () => {
    fetchLegalAcceptances.mockResolvedValue({ count: 1, results: [makeAcceptance()] })
    revokeLegalAcceptance.mockResolvedValue(makeAcceptance({ revoked_at: '2026-10-15T10:00:00' }))
    const history = await mountHistory()

    const revoked = await history.revoke(history.acceptances.value[0])

    expect(revoked).toBe(true)
    expect(revokeLegalAcceptance).toHaveBeenCalledWith(4)
    expect(history.acceptances.value).toHaveLength(1)
    expect(history.acceptances.value[0]).toMatchObject({ status: 'Revogado', revoked: true })
    expect(useNotificationStore().items.at(-1)).toMatchObject({
      type: 'success',
      message: 'Aceite revogado. O registro continua no histórico.',
    })
  })

  it('should not ask the backend again for an acceptance already revoked', async () => {
    fetchLegalAcceptances.mockResolvedValue({
      count: 1,
      results: [makeAcceptance({ revoked_at: '2026-10-15T10:00:00' })],
    })
    const history = await mountHistory()

    const revoked = await history.revoke(history.acceptances.value[0])

    expect(revoked).toBe(false)
    expect(revokeLegalAcceptance).not.toHaveBeenCalled()
  })

  it('should flag the acceptance being revoked and ignore another request meanwhile', async () => {
    fetchLegalAcceptances.mockResolvedValue({
      count: 2,
      results: [makeAcceptance(), makeAcceptance({ id: 5 })],
    })
    const pending = deferred()
    revokeLegalAcceptance.mockReturnValue(pending.promise)
    const history = await mountHistory()

    const first = history.revoke(history.acceptances.value[0])
    const revokingId = history.revokingId.value
    await history.revoke(history.acceptances.value[1])
    pending.resolve(makeAcceptance({ revoked_at: '2026-10-15T10:00:00' }))
    await first

    expect(revokingId).toBe(4)
    expect(revokeLegalAcceptance).toHaveBeenCalledTimes(1)
    expect(history.revokingId.value).toBeNull()
  })

  it('should reload the list when the acceptance was already revoked elsewhere', async () => {
    fetchLegalAcceptances
      .mockResolvedValueOnce({ count: 1, results: [makeAcceptance()] })
      .mockResolvedValueOnce({
        count: 1,
        results: [makeAcceptance({ revoked_at: '2026-10-15T10:00:00' })],
      })
    revokeLegalAcceptance.mockRejectedValue(Object.assign(new Error('conflict'), { status: 409 }))
    const history = await mountHistory()

    const revoked = await history.revoke(history.acceptances.value[0])

    expect(revoked).toBe(false)
    expect(fetchLegalAcceptances).toHaveBeenCalledTimes(2)
    expect(history.acceptances.value[0].revoked).toBe(true)
    expect(useNotificationStore().items.at(-1).message).toBe('Este aceite já havia sido revogado.')
  })

  it('should keep the acceptance and warn when the revocation fails', async () => {
    fetchLegalAcceptances.mockResolvedValue({ count: 1, results: [makeAcceptance()] })
    revokeLegalAcceptance.mockRejectedValue(Object.assign(new Error('boom'), { status: 500 }))
    const history = await mountHistory()

    const revoked = await history.revoke(history.acceptances.value[0])

    expect(revoked).toBe(false)
    expect(history.acceptances.value[0].revoked).toBe(false)
    expect(useNotificationStore().items.at(-1)).toMatchObject({
      type: 'error',
      message: 'Não foi possível revogar o aceite. Tente novamente.',
    })
  })

  it('should offer to accept again only a revoked version that is not accepted anymore', async () => {
    fetchLegalAcceptances.mockResolvedValue({
      count: 3,
      results: [
        makeAcceptance({ id: 1, revoked_at: '2026-10-01T10:00:00' }),
        makeAcceptance({ id: 2, accepted_at: '2026-10-02T10:00:00' }),
        makeAcceptance({
          id: 3,
          revoked_at: '2026-10-03T10:00:00',
          version: { id: 8, version: 3 },
        }),
      ],
    })
    const history = await mountHistory()
    const byId = (id) => history.acceptances.value.find((acceptance) => acceptance.id === id)

    expect(history.canReaccept(byId(1))).toBe(false)
    expect(history.canReaccept(byId(2))).toBe(false)
    expect(history.canReaccept(byId(3))).toBe(true)
  })

  it('should accept a revoked term again with the same clause decisions', async () => {
    fetchLegalAcceptances.mockResolvedValue({
      count: 1,
      results: [makeAcceptance({ revoked_at: '2026-10-01T10:00:00' })],
    })
    acceptLegalTerms.mockResolvedValue(
      makeAcceptance({ id: 9, accepted_at: '2026-10-15T11:00:00' }),
    )
    const history = await mountHistory()

    const accepted = await history.reaccept(history.acceptances.value[0])

    expect(accepted).toBe(true)
    expect(acceptLegalTerms).toHaveBeenCalledWith({
      versionId: 7,
      consents: [
        { clause_id: 1, accepted: true },
        { clause_id: 2, accepted: false },
      ],
    })
    expect(
      history.acceptances.value.map((acceptance) => [acceptance.id, acceptance.status]),
    ).toEqual([
      [9, 'Aceito'],
      [4, 'Revogado'],
    ])
    expect(history.canReaccept(history.acceptances.value[1])).toBe(false)
    expect(useNotificationStore().items.at(-1)).toMatchObject({
      type: 'success',
      message: 'Termo aceito novamente.',
    })
  })

  it('should not accept again a term that was not revoked', async () => {
    fetchLegalAcceptances.mockResolvedValue({ count: 1, results: [makeAcceptance()] })
    const history = await mountHistory()

    const accepted = await history.reaccept(history.acceptances.value[0])

    expect(accepted).toBe(false)
    expect(acceptLegalTerms).not.toHaveBeenCalled()
  })

  it('should reload the list when the version was already accepted elsewhere', async () => {
    fetchLegalAcceptances.mockResolvedValue({
      count: 1,
      results: [makeAcceptance({ revoked_at: '2026-10-01T10:00:00' })],
    })
    acceptLegalTerms.mockRejectedValue(
      Object.assign(new Error('conflict'), {
        status: 409,
        details: { error: 'LegalVersionAlreadyAccepted' },
      }),
    )
    const history = await mountHistory()

    const accepted = await history.reaccept(history.acceptances.value[0])

    expect(accepted).toBe(false)
    expect(fetchLegalAcceptances).toHaveBeenCalledTimes(2)
    expect(useNotificationStore().items.at(-1).message).toBe('Esta versão do termo já está aceita.')
  })

  it('should explain when a newer version of the term replaced the revoked one', async () => {
    fetchLegalAcceptances.mockResolvedValue({
      count: 1,
      results: [makeAcceptance({ revoked_at: '2026-10-01T10:00:00' })],
    })
    acceptLegalTerms.mockRejectedValue(
      Object.assign(new Error('conflict'), {
        status: 409,
        details: { error: 'OutdatedLegalVersion', current_version_id: 11 },
      }),
    )
    const history = await mountHistory()

    await history.reaccept(history.acceptances.value[0])

    expect(useNotificationStore().items.at(-1).message).toContain('versão mais nova deste termo')
    expect(history.acceptances.value).toHaveLength(1)
  })

  it('should warn when accepting again fails for another reason', async () => {
    fetchLegalAcceptances.mockResolvedValue({
      count: 1,
      results: [makeAcceptance({ revoked_at: '2026-10-01T10:00:00' })],
    })
    acceptLegalTerms.mockRejectedValue(Object.assign(new Error('boom'), { status: 500 }))
    const history = await mountHistory()

    const accepted = await history.reaccept(history.acceptances.value[0])

    expect(accepted).toBe(false)
    expect(history.reacceptingId.value).toBeNull()
    expect(useNotificationStore().items.at(-1).message).toBe(
      'Não foi possível aceitar o termo novamente. Tente novamente.',
    )
  })
})
