import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api, request } from '../../src/api/client'

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
    // Given
    fetch.mockResolvedValue(mockResponse([{ id: 1 }]))
    // When
    const data = await api.get('/projects/')
    // Then
    expect(fetch).toHaveBeenCalledWith('/api/projects/', expect.objectContaining({ method: 'GET' }))
    expect(data).toEqual([{ id: 1 }])
  })

  it('should send the body as JSON on POST', async () => {
    // Given
    fetch.mockResolvedValue(mockResponse({ id: 7 }, { status: 201 }))
    // When
    await api.post('/documents/', { title: 'X' })
    // Then
    const [, init] = fetch.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ title: 'X' })
  })

  it('should throw ApiError with a friendly message and details when the response fails', async () => {
    // Given
    const details = { title: ['Este campo é obrigatório.'] }
    fetch.mockResolvedValue(mockResponse(details, { status: 400 }))
    // When
    const promise = request('/documents/', { method: 'POST', body: {} })
    // Then
    await expect(promise).rejects.toBeInstanceOf(ApiError)
    await promise.catch((error) => {
      expect(error.status).toBe(400)
      expect(error.details).toEqual(details)
      expect(error.message).toBe('Dados inválidos. Verifique os campos e tente novamente.')
    })
  })

  it('should not expose internal details when the server is unreachable', async () => {
    // Given
    fetch.mockRejectedValue(new TypeError('Failed to fetch http://10.0.0.5:8000'))
    // When
    const promise = api.get('/health/')
    // Then
    await expect(promise).rejects.toMatchObject({ status: 0, message: 'Não foi possível conectar ao servidor.' })
  })

  it('should map a 500 with {"error"} body to a generic server message', async () => {
    // Given
    fetch.mockResolvedValue(mockResponse({ error: 'DatabaseError' }, { status: 500 }))
    // When / Then
    await expect(api.get('/disciplines/')).rejects.toMatchObject({
      status: 500,
      message: 'Erro interno do servidor. Tente novamente mais tarde.',
      details: { error: 'DatabaseError' },
    })
  })
})
