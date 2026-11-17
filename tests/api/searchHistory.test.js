import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearSearchHistory,
  fetchSearchHistory,
  removeSearchHistoryTerm,
} from '../../src/api/searchHistory'

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  }
}

describe('search history API', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    document.cookie = 'csrftoken=token-123; path=/'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.cookie = 'csrftoken=; path=/; max-age=0'
  })

  it('should fetch the recent searches of the signed in user', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(200, { results: ['MIL-C-5541', 'cargas'] }))

    const result = await fetchSearchHistory()

    const [url, init] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('/api/users/me/search-history')
    expect(init.method).toBe('GET')
    expect(result).toEqual(['MIL-C-5541', 'cargas'])
  })

  it('should return an empty list when the body has no results', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(200, {}))

    await expect(fetchSearchHistory()).resolves.toEqual([])
  })

  it('should reject when the history cannot be loaded', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(500, { error: 'Boom' }))

    await expect(fetchSearchHistory()).rejects.toMatchObject({ status: 500 })
  })

  it('should clear the whole history with the CSRF token', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(204))

    await clearSearchHistory()

    const [url, init] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('/api/users/me/search-history')
    expect(init.method).toBe('DELETE')
    expect(init.headers['X-CSRFToken']).toBe('token-123')
  })

  it('should remove a single term encoding it in the query string', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(204))

    await removeSearchHistoryTerm('cargas & vigas')

    const [url, init] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('/api/users/me/search-history?term=cargas%20%26%20vigas')
    expect(init.method).toBe('DELETE')
  })
})
