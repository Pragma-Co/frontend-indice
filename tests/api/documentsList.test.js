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
    globalThis.fetch.mockResolvedValue(
      okResponse({
        count: 1,
        total_pages: 1,
        current_page: 1,
        page_size: 20,
        results: [{ id: 1 }],
      }),
    )

    await fetchDocuments()
    await fetchDocuments()

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('should fetch the list again after the cache is cleared', async () => {
    globalThis.fetch
      .mockResolvedValueOnce(
        okResponse({
          count: 1,
          total_pages: 1,
          current_page: 1,
          page_size: 20,
          results: [{ id: 1 }],
        }),
      )
      .mockResolvedValueOnce(
        okResponse({
          count: 2,
          total_pages: 1,
          current_page: 1,
          page_size: 20,
          results: [{ id: 2 }, { id: 1 }],
        }),
      )
    await fetchDocuments()

    clearDocumentsCache()
    const refreshed = await fetchDocuments()

    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    expect(refreshed.results.map((document) => document.id)).toEqual([2, 1])
  })

  it('should keep a separate cache entry for each page and page size', async () => {
    globalThis.fetch
      .mockResolvedValueOnce(okResponse({ current_page: 1, results: [{ id: 30 }] }))
      .mockResolvedValueOnce(okResponse({ current_page: 2, results: [{ id: 10 }] }))

    const firstPage = await fetchDocuments({ q: 'caverna', page: 1, page_size: 20 })
    const secondPage = await fetchDocuments({ q: 'caverna', page: 2, page_size: 20 })
    const firstPageAgain = await fetchDocuments({ page_size: 20, page: 1, q: 'caverna' })

    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/documents?page=1&page_size=20&q=caverna',
    )
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/documents?page=2&page_size=20&q=caverna',
    )
    expect(firstPage.results[0].id).toBe(30)
    expect(secondPage.results[0].id).toBe(10)
    expect(firstPageAgain).toBe(firstPage)
  })
})
