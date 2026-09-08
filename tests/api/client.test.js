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

  it('deve chamar a API através do prefixo /api e devolver o JSON', async () => {
    // Given
    fetch.mockResolvedValue(mockResponse([{ id: 1 }]))
    // When
    const data = await api.get('/projetos/')
    // Then
    expect(fetch).toHaveBeenCalledWith('/api/projetos/', expect.objectContaining({ method: 'GET' }))
    expect(data).toEqual([{ id: 1 }])
  })

  it('deve enviar o corpo como JSON no POST', async () => {
    // Given
    fetch.mockResolvedValue(mockResponse({ id: 7 }, { status: 201 }))
    // When
    await api.post('/documentos/', { titulo: 'X' })
    // Then
    const [, init] = fetch.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ titulo: 'X' })
  })

  it('deve lançar ApiError com mensagem amigável e detalhes quando a resposta falhar', async () => {
    // Given
    const details = { titulo: ['Este campo é obrigatório.'] }
    fetch.mockResolvedValue(mockResponse(details, { status: 400 }))
    // When
    const promise = request('/documentos/', { method: 'POST', body: {} })
    // Then
    await expect(promise).rejects.toBeInstanceOf(ApiError)
    await promise.catch((error) => {
      expect(error.status).toBe(400)
      expect(error.details).toEqual(details)
      expect(error.message).toBe('Dados inválidos. Verifique os campos e tente novamente.')
    })
  })

  it('não deve expor detalhes internos quando o servidor estiver fora do ar', async () => {
    // Given
    fetch.mockRejectedValue(new TypeError('Failed to fetch http://10.0.0.5:8000'))
    // When
    const promise = api.get('/health/')
    // Then
    await expect(promise).rejects.toMatchObject({ status: 0, message: 'Não foi possível conectar ao servidor.' })
  })

  it('deve tratar conflito de código como erro de duplicidade', async () => {
    // Given
    fetch.mockResolvedValue(mockResponse({ detail: 'duplicate' }, { status: 409 }))
    // When / Then
    await expect(api.post('/documentos/', {})).rejects.toMatchObject({
      status: 409,
      message: 'Já existe um documento com este código.',
    })
  })
})
