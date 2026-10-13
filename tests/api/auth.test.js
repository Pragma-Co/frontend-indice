import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startDevelopmentSession } from '../../src/api/auth'

describe('auth api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should ask the backend for a session of the given user', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 10, name: 'Thiago Serpa' }),
    })

    const user = await startDevelopmentSession(10)

    const [url, init] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('/api/dev/login')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ user_id: 10 })
    expect(user).toEqual({ id: 10, name: 'Thiago Serpa' })
  })
})
