import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  api,
  request,
  setUnauthorizedHandler,
  uploadWithProgress,
} from '../../src/api/client'

function fakeXhrAnswering(status, body) {
  return class {
    constructor() {
      this.upload = { addEventListener: () => null }
      this.listeners = {}
    }

    open() {}

    addEventListener(type, listener) {
      this.listeners[type] = listener
    }

    send() {
      this.status = status
      this.responseText = JSON.stringify(body)
      this.listeners.load()
    }
  }
}

function mockResponse(body, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  }
}

describe('api client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should call the API through the /api prefix and return the JSON body', async () => {
    globalThis.fetch.mockResolvedValue(mockResponse([{ id: 1 }]))
    const data = await api.get('/projects/')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/projects/',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(data).toEqual([{ id: 1 }])
  })

  it('should send the body as JSON on POST', async () => {
    globalThis.fetch.mockResolvedValue(mockResponse({ id: 7 }, { status: 201 }))
    await api.post('/documents/', { title: 'X' })
    const [, init] = globalThis.fetch.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ title: 'X' })
  })

  it('should throw ApiError with a friendly message and details when the response fails', async () => {
    const details = { title: ['Este campo é obrigatório.'] }
    globalThis.fetch.mockResolvedValue(mockResponse(details, { status: 400 }))
    const promise = request('/documents/', { method: 'POST', body: {} })
    await expect(promise).rejects.toBeInstanceOf(ApiError)
    await promise.catch((error) => {
      expect(error.status).toBe(400)
      expect(error.details).toEqual(details)
      expect(error.message).toBe('Dados inválidos. Verifique os campos e tente novamente.')
    })
  })

  it('should not expose internal details when the server is unreachable', async () => {
    globalThis.fetch.mockRejectedValue(new TypeError('Failed to fetch http://10.0.0.5:8000'))
    const promise = api.get('/health/')
    await expect(promise).rejects.toMatchObject({
      status: 0,
      message: 'Não foi possível conectar ao servidor.',
    })
  })

  it('should map a 500 with {"error"} body to a generic server message', async () => {
    globalThis.fetch.mockResolvedValue(mockResponse({ error: 'DatabaseError' }, { status: 500 }))
    await expect(api.get('/disciplines/')).rejects.toMatchObject({
      status: 500,
      message: 'Erro interno do servidor. Tente novamente mais tarde.',
      details: { error: 'DatabaseError' },
    })
  })

  describe('status messages', () => {
    it('should tell the user the session expired on a 401', async () => {
      globalThis.fetch.mockResolvedValue(
        mockResponse({ error: 'AuthenticationRequired' }, { status: 401 }),
      )

      await expect(api.get('/documents')).rejects.toMatchObject({
        status: 401,
        message: 'Sua sessão expirou. Entre novamente.',
      })
    })

    it('should tell the user the action is not allowed on a 403', async () => {
      globalThis.fetch.mockResolvedValue(mockResponse({ error: 'Forbidden' }, { status: 403 }))

      await expect(api.get('/manager/revisions')).rejects.toMatchObject({
        status: 403,
        message: 'Você não tem permissão para esta ação.',
      })
    })
  })

  describe('unauthorized handler', () => {
    let handler

    beforeEach(() => {
      handler = vi.fn()
      setUnauthorizedHandler(handler)
    })

    afterEach(() => {
      setUnauthorizedHandler(null)
    })

    it('should call the handler and still reject when a request answers 401', async () => {
      globalThis.fetch.mockResolvedValue(
        mockResponse({ error: 'AuthenticationRequired' }, { status: 401 }),
      )

      await expect(api.get('/documents')).rejects.toBeInstanceOf(ApiError)

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith({ path: '/documents' })
    })

    it('should call the handler when an upload answers 401', async () => {
      vi.stubGlobal('XMLHttpRequest', fakeXhrAnswering(401, { error: 'AuthenticationRequired' }))

      await expect(uploadWithProgress('/documents/upload', new FormData())).rejects.toMatchObject({
        status: 401,
      })

      expect(handler).toHaveBeenCalledWith({ path: '/documents/upload' })
    })

    it('should not call the handler when the login itself answers 401', async () => {
      globalThis.fetch.mockResolvedValue(
        mockResponse({ error: 'InvalidCredentials' }, { status: 401 }),
      )

      await expect(api.post('/auth/login', {})).rejects.toMatchObject({ status: 401 })

      expect(handler).not.toHaveBeenCalled()
    })

    it.each([400, 403, 404, 500])('should not call the handler on a %i', async (status) => {
      globalThis.fetch.mockResolvedValue(mockResponse({ error: 'Any' }, { status }))

      await expect(api.get('/documents')).rejects.toMatchObject({ status })

      expect(handler).not.toHaveBeenCalled()
    })

    it('should not call the handler on a successful response', async () => {
      globalThis.fetch.mockResolvedValue(mockResponse({ id: 1 }))

      await api.get('/users/me')

      expect(handler).not.toHaveBeenCalled()
    })

    it('should still reject with the API error when the handler fails', async () => {
      handler.mockImplementation(() => {
        throw new Error('handler failed')
      })
      globalThis.fetch.mockResolvedValue(mockResponse(null, { status: 401 }))

      await expect(api.get('/documents')).rejects.toMatchObject({ status: 401 })
    })

    it('should ignore a handler that is not a function', async () => {
      setUnauthorizedHandler('not a function')
      globalThis.fetch.mockResolvedValue(mockResponse(null, { status: 401 }))

      await expect(api.get('/documents')).rejects.toMatchObject({ status: 401 })

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('csrf token', () => {
    afterEach(() => {
      document.cookie = 'csrftoken=; Max-Age=0; path=/'
    })

    it('should send the csrf cookie back on requests that change data', async () => {
      document.cookie = 'csrftoken=token-123; path=/'
      globalThis.fetch.mockResolvedValue(mockResponse({}))

      await api.put('/users/me', { name: 'Thiago Serpa' })
      await api.post('/users/me/request-deletion')

      const [[, put], [, post]] = globalThis.fetch.mock.calls
      expect(put.headers['X-CSRFToken']).toBe('token-123')
      expect(post.headers['X-CSRFToken']).toBe('token-123')
    })

    it('should not send the csrf cookie on reads', async () => {
      document.cookie = 'csrftoken=token-123; path=/'
      globalThis.fetch.mockResolvedValue(mockResponse({}))

      await api.get('/users/me')

      expect(globalThis.fetch.mock.calls[0][1].headers['X-CSRFToken']).toBeUndefined()
    })

    it('should send no csrf header when there is no csrf cookie', async () => {
      globalThis.fetch.mockResolvedValue(mockResponse({}))

      await api.post('/dev/login', { user_id: 10 })

      expect(globalThis.fetch.mock.calls[0][1].headers['X-CSRFToken']).toBeUndefined()
    })
  })
})
