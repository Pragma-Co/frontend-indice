import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchDocuments } from '../../src/api/documents'

function okResponse(body) {
  return { ok: true, status: 200, json: async () => body }
}

describe('fetchDocuments', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should fetch the list again for the same query instead of reusing a cached result', async () => {
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
    const refreshed = await fetchDocuments()

    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    expect(refreshed.results.map((document) => document.id)).toEqual([2, 1])
  })

  it('should request each page and page size independently', async () => {
    globalThis.fetch
      .mockResolvedValueOnce(okResponse({ current_page: 1, results: [{ id: 30 }] }))
      .mockResolvedValueOnce(okResponse({ current_page: 2, results: [{ id: 10 }] }))

    const firstPage = await fetchDocuments({ q: 'caverna', page: 1, page_size: 20 })
    const secondPage = await fetchDocuments({ q: 'caverna', page: 2, page_size: 20 })

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
  })
})
