import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchDocumentRecommendations } from '../../src/api/recommendations'

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }
}

describe('recommendations api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should ask for the recommendations of a document with the default limit', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(200, { collections: [] }))

    const response = await fetchDocumentRecommendations(37)

    expect(globalThis.fetch.mock.calls[0][0]).toBe('/api/documents/37/recommendations?limit=12')
    expect(response).toEqual({ collections: [] })
  })

  it('should send the requested limit', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(200, { collections: [] }))

    await fetchDocumentRecommendations(37, { limit: 4 })

    expect(globalThis.fetch.mock.calls[0][0]).toBe('/api/documents/37/recommendations?limit=4')
  })

  it('should reject when the document does not exist', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(404, { error: 'DocumentNotFound' }))

    await expect(fetchDocumentRecommendations(999)).rejects.toMatchObject({ status: 404 })
  })
})
