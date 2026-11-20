import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { endSession, fetchCsrfCookie, startSession } from '../../src/api/auth'

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }
}

describe('auth api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    document.cookie = 'csrftoken=token-123; path=/'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.cookie = 'csrftoken=; path=/; max-age=0'
  })

  it('should ask the backend for the CSRF cookie and accept an empty answer', async () => {
    globalThis.fetch.mockResolvedValue({ ok: true, status: 204, text: async () => '' })

    const result = await fetchCsrfCookie()

    const [url, init] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('/api/auth/csrf')
    expect(init.method).toBe('GET')
    expect(init.headers['X-CSRFToken']).toBeUndefined()
    expect(result).toBeNull()
  })

  it('should send the credentials with the CSRF token to start a session', async () => {
    const account = { id: 10, name: 'Thiago Serpa', role: 'AUDITOR' }
    globalThis.fetch.mockResolvedValue(jsonResponse(200, account))

    const user = await startSession({ email: 'thiago@akaer.local', password: 'senha-segura' })

    const [url, init] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('/api/auth/login')
    expect(init.method).toBe('POST')
    expect(init.headers['X-CSRFToken']).toBe('token-123')
    expect(JSON.parse(init.body)).toEqual({
      email: 'thiago@akaer.local',
      password: 'senha-segura',
    })
    expect(user).toEqual(account)
  })

  it('should reject wrong credentials with the 401 status', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(401, { error: 'InvalidCredentials' }))

    await expect(
      startSession({ email: 'thiago@akaer.local', password: 'senha-errada' }),
    ).rejects.toMatchObject({ status: 401, details: { error: 'InvalidCredentials' } })
  })

  it('should ask the backend to end the session', async () => {
    globalThis.fetch.mockResolvedValue({ ok: true, status: 204, text: async () => '' })

    const result = await endSession()

    const [url, init] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('/api/auth/logout')
    expect(init.method).toBe('POST')
    expect(result).toBeNull()
  })
})
