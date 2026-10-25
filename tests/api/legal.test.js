import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchLegalDocuments, fetchLegalVersion } from '../../src/api/legal'

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }
}

describe('legal api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should list the published legal documents', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(200, { count: 0, results: [] }))

    const documents = await fetchLegalDocuments()

    expect(globalThis.fetch.mock.calls[0][0]).toBe('/api/legal-documents')
    expect(documents).toEqual({ count: 0, results: [] })
  })

  it('should load the text of one version', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(200, { id: 7, clauses: [] }))

    const version = await fetchLegalVersion(7)

    expect(globalThis.fetch.mock.calls[0][0]).toBe('/api/legal-documents/versions/7')
    expect(version).toEqual({ id: 7, clauses: [] })
  })

  it('should reject when the version does not exist', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(404, { error: 'LegalVersionNotFound' }))

    await expect(fetchLegalVersion(999)).rejects.toMatchObject({ status: 404 })
  })
})
