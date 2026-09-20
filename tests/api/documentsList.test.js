import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearDocumentsCache, fetchDocuments } from '../../src/api/documents'

function okResponse(body) {
  return { ok: true, status: 200, json: async () => body }
}

describe('fetchDocuments cache', () => {
  beforeEach(() => {
    clearDocumentsCache()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should reuse the cached list for the same query', async () => {
    globalThis.fetch.mockResolvedValue(okResponse({ documents: [{ id: 1 }] }))

    await fetchDocuments()
    await fetchDocuments()

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('should fetch the list again after the cache is cleared', async () => {
    globalThis.fetch
      .mockResolvedValueOnce(okResponse({ documents: [{ id: 1 }] }))
      .mockResolvedValueOnce(okResponse({ documents: [{ id: 2 }, { id: 1 }] }))
    await fetchDocuments()

    clearDocumentsCache()
    const refreshed = await fetchDocuments()

    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    expect(refreshed.documents.map((document) => document.id)).toEqual([2, 1])
  })
})
