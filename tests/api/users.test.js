import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchLegalAcceptances } from '../../src/api/users'

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }
}

describe('users api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should request the legal acceptance history of the current user', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(200, { count: 0, results: [] }))

    const history = await fetchLegalAcceptances()

    expect(globalThis.fetch.mock.calls[0][0]).toBe('/api/users/me/legal-acceptances')
    expect(history).toEqual({ count: 0, results: [] })
  })

  it('should reject with the status when there is no session', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(401, { error: 'AuthenticationRequired' }))

    await expect(fetchLegalAcceptances()).rejects.toMatchObject({ status: 401 })
  })
})
