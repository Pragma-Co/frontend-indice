import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/api/users.js', () => ({
  fetchLegalAcceptances: vi.fn(),
  revokeLegalAcceptance: vi.fn(),
  acceptLegalTerms: vi.fn(),
}))
vi.mock('@/api/legal.js', () => ({ fetchLegalDocuments: vi.fn() }))

import { fetchLegalDocuments } from '@/api/legal.js'
import { acceptLegalTerms, fetchLegalAcceptances, revokeLegalAcceptance } from '@/api/users.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import {
  TERM_STATES,
  normalizeAcceptance,
  normalizePendingDocument,
  pendingDocuments,
  sortByMostRecent,
  useTermsAcceptanceHistory,
} from '@/views/user-management/composables/useTermsAcceptanceHistory.js'

function makeAcceptance(overrides = {}) {
  return {
    id: 4,
    accepted_at: '2026-09-24T14:32:00',
    revoked_at: null,
    document: { slug: 'termos-de-uso', title: 'Termos de Uso e Política de Privacidade' },
    version: { id: 7, version: 2 },
    consents: [
      { clause_id: 1, code: 'uso', is_required: true, accepted: true },
      { clause_id: 2, code: 'marketing', is_required: false, accepted: false },
    ],
    ...overrides,
  }
}

function makeDocument(overrides = {}) {
  return {
    slug: 'termos-de-uso',
    title: 'Termos de Uso e Política de Privacidade',
    current_version: {
      id: 7,
      version: 2,
      clauses: [
        { id: 1, code: 'uso', position: 1, title: 'Uso', is_required: true },
        { id: 2, code: 'marketing', position: 2, title: 'Comunicados', is_required: false },
      ],
    },
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

function failure(status, details) {
  return Object.assign(new Error('failed'), { status, details })
}

describe('normalizeAcceptance', () => {
  it('should describe the accepted term, its version and when it was accepted', () => {
    expect(normalizeAcceptance(makeAcceptance())).toEqual({
      key: 'acceptance-4',
      id: 4,
      state: TERM_STATES.ACCEPTED,
      slug: 'termos-de-uso',
      title: 'Termos de Uso e Política de Privacidade',
      versionId: 7,
      versionLabel: 'v2',
      condition: 'Obrigatório',
      acceptedAt: '2026-09-24T14:32:00',
      revokedAt: null,
      updatedAt: '2026-09-24T14:32:00',
      revoked: false,
      status: 'Aceito',
      decisions: [
        { clause_id: 1, accepted: true },
        { clause_id: 2, accepted: false },
      ],
      clauseIds: [],
    })
  })

  it('should call a term without required clauses optional', () => {
    const acceptance = makeAcceptance({
      consents: [{ clause_id: 2, is_required: false, accepted: true }],
    })

    expect(normalizeAcceptance(acceptance).condition).toBe('Opcional')
  })

  it('should mark a revoked acceptance', () => {
    const acceptance = normalizeAcceptance(makeAcceptance({ revoked_at: '2026-10-01T10:00:00' }))

    expect(acceptance).toMatchObject({
      state: TERM_STATES.REVOKED,
      revoked: true,
      revokedAt: '2026-10-01T10:00:00',
      updatedAt: '2026-10-01T10:00:00',
      status: 'Revogado',
    })
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

describe('normalizePendingDocument', () => {
  it('should describe a term that was never accepted with its current version', () => {
    expect(normalizePendingDocument(makeDocument())).toMatchObject({
      key: 'pending-termos-de-uso',
      id: null,
      state: TERM_STATES.PENDING,
      title: 'Termos de Uso e Política de Privacidade',
      versionId: 7,
      versionLabel: 'v2',
      condition: 'Obrigatório',
      acceptedAt: null,
      status: 'Não aceito',
      clauseIds: [1, 2],
    })
  })
})

describe('pendingDocuments', () => {
  it('should keep only the documents whose current version is not accepted', () => {
    const accepted = normalizeAcceptance(makeAcceptance())
    const documents = [makeDocument(), makeDocument({ slug: 'politica', title: 'Política' })]
    documents[1].current_version = { ...documents[1].current_version, id: 20 }

    const pending = pendingDocuments(documents, [accepted])

    expect(pending.map((row) => row.slug)).toEqual(['politica'])
  })

  it('should list the document again when its acceptance was revoked', () => {
    const revoked = normalizeAcceptance(makeAcceptance({ revoked_at: '2026-10-01T10:00:00' }))

    expect(pendingDocuments([makeDocument()], [revoked]).map((row) => row.slug)).toEqual([
      'termos-de-uso',
    ])
  })

  it('should ask for the new version when only an older one is accepted', () => {
    const olderVersion = normalizeAcceptance(makeAcceptance({ version: { id: 3, version: 1 } }))

    const pending = pendingDocuments([makeDocument()], [olderVersion])

    expect(pending).toHaveLength(1)
    expect(pending[0].versionLabel).toBe('v2')
  })
})

describe('sortByMostRecent', () => {
  it('should order the rows from the most recent to the oldest, undated last', () => {
    const rows = [
      { id: 1, updatedAt: '2026-03-12T09:15:00' },
      { id: 2, updatedAt: null },
      { id: 3, updatedAt: '2026-09-24T14:32:00' },
    ]

    expect(sortByMostRecent(rows).map((row) => row.id)).toEqual([3, 1, 2])
    expect(rows.map((row) => row.id)).toEqual([1, 2, 3])
  })
})

describe('last update', () => {
  it('should order a recent revocation before an older acceptance', () => {
    const rows = [
      normalizeAcceptance(makeAcceptance({ id: 1, accepted_at: '2026-10-10T10:00:00' })),
      normalizeAcceptance(
        makeAcceptance({
          id: 2,
          accepted_at: '2026-01-01T10:00:00',
          revoked_at: '2026-10-15T10:41:00',
        }),
      ),
    ]

    expect(sortByMostRecent(rows).map((row) => row.id)).toEqual([2, 1])
  })
})

describe('useTermsAcceptanceHistory', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    fetchLegalDocuments.mockResolvedValue({ count: 0, results: [] })
  })

  it('should list the terms not accepted first and then the history, most recent first', async () => {
    fetchLegalAcceptances.mockResolvedValue({
      count: 2,
      results: [
        makeAcceptance({
          id: 1,
          accepted_at: '2026-03-12T09:15:00',
          version: { id: 3, version: 1 },
        }),
        makeAcceptance({
          id: 2,
          accepted_at: '2026-09-24T14:32:00',
          version: { id: 4, version: 1 },
        }),
      ],
    })
    fetchLegalDocuments.mockResolvedValue({ count: 1, results: [makeDocument()] })

    const history = await mountHistory()

    expect(history.rows.value.map((row) => row.key)).toEqual([
      'pending-termos-de-uso',
      'acceptance-2',
      'acceptance-1',
    ])
    expect(history.recordCount.value).toBe(2)
    expect(history.loading.value).toBe(false)
  })

  it('should still show the history when the published terms cannot be loaded', async () => {
    fetchLegalAcceptances.mockResolvedValue({ count: 1, results: [makeAcceptance()] })
    fetchLegalDocuments.mockRejectedValue(new Error('offline'))

    const history = await mountHistory()

    expect(history.error.value).toBe('')
    expect(history.rows.value.map((row) => row.key)).toEqual(['acceptance-4'])
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
  })

  it('should report a failure of the history and recover on the next load', async () => {
    fetchLegalAcceptances.mockRejectedValueOnce(new Error('offline'))
    fetchLegalAcceptances.mockResolvedValueOnce({ count: 1, results: [makeAcceptance()] })
    const history = await mountHistory()
    const message = history.error.value

    await history.load()

    expect(message).toBe('Não foi possível carregar o histórico de termos.')
    expect(history.error.value).toBe('')
    expect(history.rows.value).toHaveLength(1)
  })

  it('should revoke an acceptance in force and list its term again to be accepted', async () => {
    fetchLegalAcceptances.mockResolvedValue({ count: 1, results: [makeAcceptance()] })
    fetchLegalDocuments.mockResolvedValue({ count: 1, results: [makeDocument()] })
    revokeLegalAcceptance.mockResolvedValue(makeAcceptance({ revoked_at: '2026-10-15T10:00:00' }))
    const history = await mountHistory()
    const before = history.rows.value.map((row) => row.key)

    const revoked = await history.revoke(history.rows.value[0])

    expect(before).toEqual(['acceptance-4'])
    expect(revoked).toBe(true)
    expect(revokeLegalAcceptance).toHaveBeenCalledWith(4)
    expect(history.rows.value.map((row) => [row.key, row.status])).toEqual([
      ['pending-termos-de-uso', 'Não aceito'],
      ['acceptance-4', 'Revogado'],
    ])
    expect(useNotificationStore().items.at(-1)).toMatchObject({
      type: 'success',
      message: 'Aceite revogado. O registro continua no histórico.',
    })
  })

  it('should accept a term with every clause and remove it from the pending ones', async () => {
    fetchLegalAcceptances.mockResolvedValue({ count: 0, results: [] })
    fetchLegalDocuments.mockResolvedValue({ count: 1, results: [makeDocument()] })
    acceptLegalTerms.mockResolvedValue(
      makeAcceptance({
        id: 9,
        accepted_at: '2026-10-15T11:00:00',
        consents: [
          { clause_id: 1, is_required: true, accepted: true },
          { clause_id: 2, is_required: false, accepted: true },
        ],
      }),
    )
    const history = await mountHistory()

    const accepted = await history.accept(history.rows.value[0])

    expect(accepted).toBe(true)
    expect(acceptLegalTerms).toHaveBeenCalledWith({
      versionId: 7,
      consents: [
        { clause_id: 1, accepted: true },
        { clause_id: 2, accepted: true },
      ],
    })
    expect(history.rows.value.map((row) => [row.key, row.status])).toEqual([
      ['acceptance-9', 'Aceito'],
    ])
    expect(history.recordCount.value).toBe(1)
    expect(useNotificationStore().items.at(-1).message).toBe('Termo aceito.')
  })

  it('should only revoke acceptances in force and only accept pending terms', async () => {
    fetchLegalAcceptances.mockResolvedValue({
      count: 1,
      results: [makeAcceptance({ revoked_at: '2026-10-01T10:00:00' })],
    })
    const history = await mountHistory()
    const [revokedRow] = history.rows.value

    const revoked = await history.revoke(revokedRow)
    const accepted = await history.accept(revokedRow)

    expect(revoked).toBe(false)
    expect(accepted).toBe(false)
    expect(revokeLegalAcceptance).not.toHaveBeenCalled()
    expect(acceptLegalTerms).not.toHaveBeenCalled()
  })

  it('should flag the row being changed and ignore another change meanwhile', async () => {
    fetchLegalAcceptances.mockResolvedValue({
      count: 2,
      results: [makeAcceptance(), makeAcceptance({ id: 5, version: { id: 8, version: 1 } })],
    })
    const pending = deferred()
    revokeLegalAcceptance.mockReturnValue(pending.promise)
    const history = await mountHistory()
    const [first, second] = history.rows.value

    const change = history.revoke(first)
    const busyKey = history.busyKey.value
    await history.revoke(second)
    pending.resolve(makeAcceptance({ revoked_at: '2026-10-15T10:00:00' }))
    await change

    expect(busyKey).toBe(first.key)
    expect(revokeLegalAcceptance).toHaveBeenCalledTimes(1)
    expect(history.busyKey.value).toBeNull()
  })

  it.each([
    [
      failure(409, { error: 'LegalAcceptanceAlreadyRevoked' }),
      'Este aceite já havia sido revogado.',
      2,
    ],
    [failure(404, { error: 'LegalAcceptanceNotFound' }), 'Não foi possível revogar o aceite.', 2],
    [failure(500, null), 'Não foi possível revogar o aceite.', 1],
  ])('should warn when the revocation fails (%#)', async (error, message, loads) => {
    fetchLegalAcceptances.mockResolvedValue({ count: 1, results: [makeAcceptance()] })
    revokeLegalAcceptance.mockRejectedValue(error)
    const history = await mountHistory()

    const revoked = await history.revoke(history.rows.value[0])

    expect(revoked).toBe(false)
    expect(fetchLegalAcceptances).toHaveBeenCalledTimes(loads)
    expect(useNotificationStore().items.at(-1).message).toContain(message)
  })

  it.each([
    [failure(409, { error: 'LegalVersionAlreadyAccepted' }), 'já está aceita', 2],
    [
      failure(409, { error: 'OutdatedLegalVersion', current_version_id: 11 }),
      'versão mais nova',
      2,
    ],
    [failure(500, null), 'Não foi possível aceitar o termo.', 1],
  ])('should warn when the acceptance fails (%#)', async (error, message, loads) => {
    fetchLegalAcceptances.mockResolvedValue({ count: 0, results: [] })
    fetchLegalDocuments.mockResolvedValue({ count: 1, results: [makeDocument()] })
    acceptLegalTerms.mockRejectedValue(error)
    const history = await mountHistory()

    const accepted = await history.accept(history.rows.value[0])

    expect(accepted).toBe(false)
    expect(fetchLegalAcceptances).toHaveBeenCalledTimes(loads)
    expect(useNotificationStore().items.at(-1).message).toContain(message)
    expect(history.busyKey.value).toBeNull()
  })
})
