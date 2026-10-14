import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchPendingAccessRequests, fetchPendingRevisions } from '../../src/api/manager'

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
})
