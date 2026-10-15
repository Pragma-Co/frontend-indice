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
  sortByMostRecent,
  termRows,
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

describe('termRows', () => {
  const policy = () =>
    makeDocument({
      slug: 'politica',
      title: 'Política',
      current_version: { id: 20, version: 1, clauses: [{ id: 9, is_required: true }] },
    })

  it('should show each term once with its current situation', () => {
    const accepted = normalizeAcceptance(makeAcceptance())

    const rows = termRows([makeDocument(), policy()], [accepted])

    expect(rows.map((row) => [row.key, row.status])).toEqual([
      ['term-termos-de-uso', 'Aceito'],
      ['term-politica', 'Não aceito'],
    ])
  })

  it('should keep only the latest situation after accepting, revoking and accepting again', () => {
    const acceptances = [
      makeAcceptance({
        id: 1,
        accepted_at: '2026-10-01T10:00:00',
        revoked_at: '2026-10-05T10:00:00',
      }),
      makeAcceptance({ id: 2, accepted_at: '2026-10-10T10:00:00' }),
    ].map(normalizeAcceptance)

    const rows = termRows([makeDocument()], acceptances)

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: 2, status: 'Aceito', acceptTarget: null })
  })

  it('should show a revoked term as revoked and let it be accepted again', () => {
    const acceptances = [
      makeAcceptance({
        id: 1,
        accepted_at: '2026-10-01T10:00:00',
        revoked_at: '2026-10-05T10:00:00',
      }),
    ].map(normalizeAcceptance)

    const [row] = termRows([makeDocument()], acceptances)

    expect(row).toMatchObject({
      id: 1,
      state: TERM_STATES.REVOKED,
      status: 'Revogado',
      updatedAt: '2026-10-05T10:00:00',
      acceptTarget: { versionId: 7, versionLabel: 'v2', clauseIds: [1, 2] },
    })
  })

  it('should ask for the new version when only an older one is accepted', () => {
    const older = normalizeAcceptance(
      makeAcceptance({ accepted_at: '2026-01-01T10:00:00', version: { id: 3, version: 1 } }),
    )

    const [row] = termRows([makeDocument()], [older])

    expect(row).toMatchObject({
      state: TERM_STATES.PENDING,
      status: 'Nova versão disponível',
      versionLabel: 'v2',
      updatedAt: '2026-01-01T10:00:00',
      acceptTarget: { versionId: 7 },
    })
  })

  it('should still show accepted terms whose document is not published anymore', () => {
    const acceptance = normalizeAcceptance(
      makeAcceptance({ document: { slug: 'antigo', title: 'Termo antigo' } }),
    )

    const rows = termRows([], [acceptance])

    expect(rows.map((row) => [row.key, row.status, row.acceptTarget])).toEqual([
      ['term-antigo', 'Aceito', null],
    ])
  })

  it('should order the terms by their last update, never accepted ones last', () => {
    const acceptances = [
      makeAcceptance({ id: 1, accepted_at: '2026-10-10T10:00:00' }),
      makeAcceptance({
        id: 2,
        document: { slug: 'cookies', title: 'Cookies' },
        version: { id: 30, version: 1 },
        accepted_at: '2026-01-01T10:00:00',
        revoked_at: '2026-10-15T10:41:00',
      }),
    ].map(normalizeAcceptance)
    const cookies = makeDocument({
      slug: 'cookies',
      title: 'Cookies',
      current_version: { id: 30, version: 1, clauses: [{ id: 5, is_required: true }] },
    })

    const rows = termRows([makeDocument(), policy(), cookies], acceptances)

    expect(rows.map((row) => row.key)).toEqual([
      'term-cookies',
      'term-termos-de-uso',
      'term-politica',
    ])
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
    fetchLegalDocuments.mockResolvedValue({ count: 1, results: [makeDocument()] })
  })

  it('should load the acceptances and the published terms into one row per term', async () => {
    fetchLegalAcceptances.mockResolvedValue({
      count: 2,
      results: [
        makeAcceptance({
          id: 1,
          accepted_at: '2026-10-01T10:00:00',
          revoked_at: '2026-10-05T10:00:00',
        }),
        makeAcceptance({ id: 2, accepted_at: '2026-10-10T10:00:00' }),
      ],
    })

    const history = await mountHistory()

    expect(history.rows.value.map((row) => [row.key, row.id, row.status])).toEqual([
      ['term-termos-de-uso', 2, 'Aceito'],
    ])
    expect(history.loading.value).toBe(false)
  })

  it('should still show the accepted terms when the published terms cannot be loaded', async () => {
    fetchLegalAcceptances.mockResolvedValue({ count: 1, results: [makeAcceptance()] })
    fetchLegalDocuments.mockRejectedValue(new Error('offline'))

    const history = await mountHistory()

    expect(history.error.value).toBe('')
    expect(history.rows.value.map((row) => row.status)).toEqual(['Aceito'])
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

  it('should revoke the term in force and keep a single revoked row', async () => {
    fetchLegalAcceptances.mockResolvedValue({ count: 1, results: [makeAcceptance()] })
    revokeLegalAcceptance.mockResolvedValue(makeAcceptance({ revoked_at: '2026-10-15T10:00:00' }))
    const history = await mountHistory()

    const revoked = await history.revoke(history.rows.value[0])

    expect(revoked).toBe(true)
    expect(revokeLegalAcceptance).toHaveBeenCalledWith(4)
    expect(history.rows.value.map((row) => [row.key, row.status])).toEqual([
      ['term-termos-de-uso', 'Revogado'],
    ])
    expect(useNotificationStore().items.at(-1)).toMatchObject({
      type: 'success',
      message: 'Aceite revogado. O registro continua no histórico.',
    })
  })

  it('should accept a revoked term again with every clause and keep a single row', async () => {
    fetchLegalAcceptances.mockResolvedValue({
      count: 1,
      results: [makeAcceptance({ revoked_at: '2026-10-05T10:00:00' })],
    })
    acceptLegalTerms.mockResolvedValue(
      makeAcceptance({ id: 9, accepted_at: '2026-10-15T11:00:00' }),
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
    expect(history.rows.value.map((row) => [row.id, row.status])).toEqual([[9, 'Aceito']])
    expect(useNotificationStore().items.at(-1).message).toBe('Termo aceito.')
  })

  it('should accept a term that was never accepted', async () => {
    fetchLegalAcceptances.mockResolvedValue({ count: 0, results: [] })
    acceptLegalTerms.mockResolvedValue(makeAcceptance({ id: 9 }))
    const history = await mountHistory()

    const accepted = await history.accept(history.rows.value[0])

    expect(accepted).toBe(true)
    expect(history.rows.value.map((row) => row.status)).toEqual(['Aceito'])
  })

  it('should not revoke a term that is not in force nor accept one already in force', async () => {
    fetchLegalAcceptances.mockResolvedValue({ count: 1, results: [makeAcceptance()] })
    const history = await mountHistory()

    const accepted = await history.accept(history.rows.value[0])

    expect(accepted).toBe(false)
    expect(acceptLegalTerms).not.toHaveBeenCalled()
  })

  it('should flag the row being changed and ignore another change meanwhile', async () => {
    fetchLegalAcceptances.mockResolvedValue({ count: 1, results: [makeAcceptance()] })
    const pending = deferred()
    revokeLegalAcceptance.mockReturnValue(pending.promise)
    const history = await mountHistory()
    const [row] = history.rows.value

    const change = history.revoke(row)
    const busyKey = history.busyKey.value
    await history.revoke(row)
    pending.resolve(makeAcceptance({ revoked_at: '2026-10-15T10:00:00' }))
    await change

    expect(busyKey).toBe(row.key)
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
    acceptLegalTerms.mockRejectedValue(error)
    const history = await mountHistory()

    const accepted = await history.accept(history.rows.value[0])

    expect(accepted).toBe(false)
    expect(fetchLegalAcceptances).toHaveBeenCalledTimes(loads)
    expect(useNotificationStore().items.at(-1).message).toContain(message)
    expect(history.busyKey.value).toBeNull()
  })
})
