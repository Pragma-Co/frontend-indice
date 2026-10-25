import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchPendingAccessRequests,
  fetchPendingRevisions,
  submitRevisionDecision,
} from '../../src/api/manager'

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }
}

describe('manager api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should request the first page of pending revisions by default', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(200, { count: 0, results: [] }))

    const page = await fetchPendingRevisions()

    expect(globalThis.fetch.mock.calls[0][0]).toBe('/api/manager/pending-revisions?page=1')
    expect(page).toEqual({ count: 0, results: [] })
  })

  it('should send the requested page and page size of pending revisions', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(200, { count: 0, results: [] }))

    await fetchPendingRevisions({ page: 3, pageSize: 20 })

    expect(globalThis.fetch.mock.calls[0][0]).toBe(
      '/api/manager/pending-revisions?page=3&page_size=20',
    )
  })

  it('should request the pending access requests', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(200, { count: 0, results: [] }))

    await fetchPendingAccessRequests({ page: 2, pageSize: 20 })

    expect(globalThis.fetch.mock.calls[0][0]).toBe(
      '/api/manager/pending-access-requests?page=2&page_size=20',
    )
  })

  it('should reject with the status when the user is not allowed', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(403, { error: 'PermissionDenied' }))

    await expect(fetchPendingRevisions()).rejects.toMatchObject({ status: 403 })
  })

  it('should send the decision and the opinion of the reviewer', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(200, { id: 91, status: 'REJECTED' }))

    const result = await submitRevisionDecision(91, {
      decision: 'REJECTED',
      justification: 'Furação diverge do ensaio aprovado.',
    })

    const [url, init] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('/api/manager/revisions/91/decision')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      decision: 'REJECTED',
      justification: 'Furação diverge do ensaio aprovado.',
    })
    expect(result).toEqual({ id: 91, status: 'REJECTED' })
  })

  it('should send an empty opinion when approving without comments', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(200, { id: 91, status: 'APPROVED' }))

    await submitRevisionDecision(91, { decision: 'APPROVED' })

    expect(JSON.parse(globalThis.fetch.mock.calls[0][1].body)).toEqual({
      decision: 'APPROVED',
      justification: '',
    })
  })

  it('should expose the backend error of a refused decision', async () => {
    globalThis.fetch.mockResolvedValue(
      jsonResponse(409, { error: 'RevisionAlreadyDecided', status: 'APPROVED' }),
    )

    await expect(submitRevisionDecision(91, { decision: 'APPROVED' })).rejects.toMatchObject({
      status: 409,
      details: { error: 'RevisionAlreadyDecided' },
    })
  })
})
