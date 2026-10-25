import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { acceptLegalTerms, fetchLegalAcceptances, revokeLegalAcceptance } from '../../src/api/users'

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

  it('should ask the backend to revoke one acceptance', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(200, { id: 4, revoked_at: '2026-10-15' }))

    const revoked = await revokeLegalAcceptance(4)

    const [url, init] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('/api/users/me/legal-acceptances/4/revoke')
    expect(init.method).toBe('POST')
    expect(revoked).toEqual({ id: 4, revoked_at: '2026-10-15' })
  })

  it('should record an acceptance with the version and the clause decisions', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(201, { id: 9 }))

    const created = await acceptLegalTerms({
      versionId: 7,
      consents: [{ clause_id: 1, accepted: true }],
    })

    const [url, init] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('/api/users/me/legal-acceptances')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      version_id: 7,
      consents: [{ clause_id: 1, accepted: true }],
    })
    expect(created).toEqual({ id: 9 })
  })
})
