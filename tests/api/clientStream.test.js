import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, streamJsonLines } from '../../src/api/client'
import { streamDocumentSuggestions } from '../../src/api/documents'

function streamedResponse(chunks, { status = 200 } = {}) {
  const pending = [...chunks]
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => '{"error":"Temporary file not found."}',
    body: {
      getReader: () => ({
        read: async () =>
          pending.length
            ? { value: pending.shift(), done: false }
            : { value: undefined, done: true },
      }),
    },
  }
}

function bytes(text) {
  return new TextEncoder().encode(text)
}

function splitBytes(text, position) {
  const encoded = bytes(text)
  return [encoded.slice(0, position), encoded.slice(position)]
}

describe('streamJsonLines', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  })

  it('should deliver one parsed object per line in arrival order', async () => {
    globalThis.fetch.mockResolvedValue(
      streamedResponse([bytes('{"type":"classification"}\n'), bytes('{"type":"done"}\n')]),
    )
    const lines = []

    await streamJsonLines('/documents/abc/suggestions/stream', {
      onLine: (line) => lines.push(line),
    })

    expect(lines).toEqual([{ type: 'classification' }, { type: 'done' }])
  })

  it('should deliver each line as soon as its chunk arrives', async () => {
    const delivered = []
    const lengthsAtEachRead = []
    const pending = [bytes('{"n":1}\n'), bytes('{"n":2}\n')]
    globalThis.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: async () => {
            lengthsAtEachRead.push(delivered.length)
            return pending.length
              ? { value: pending.shift(), done: false }
              : { value: undefined, done: true }
          },
        }),
      },
    })

    await streamJsonLines('/stream', { onLine: (line) => delivered.push(line) })

    expect(lengthsAtEachRead).toEqual([0, 1, 2])
  })

  it('should join a line and an accented character split across chunks', async () => {
    const line = '{"value":"Cálculo"}\n'
    globalThis.fetch.mockResolvedValue(streamedResponse(splitBytes(line, line.indexOf('á') + 1)))
    const lines = []

    await streamJsonLines('/stream', { onLine: (parsed) => lines.push(parsed) })

    expect(lines).toEqual([{ value: 'Cálculo' }])
  })

  it('should deliver a last line that has no line break', async () => {
    globalThis.fetch.mockResolvedValue(streamedResponse([bytes('{"n":1}\n{"n":2}')]))
    const lines = []

    await streamJsonLines('/stream', { onLine: (line) => lines.push(line) })

    expect(lines).toEqual([{ n: 1 }, { n: 2 }])
  })

  it('should skip blank and malformed lines', async () => {
    globalThis.fetch.mockResolvedValue(streamedResponse([bytes('\n{"n":1}\nnot json\n{"n":2}\n')]))
    const lines = []

    await streamJsonLines('/stream', { onLine: (line) => lines.push(line) })

    expect(lines).toEqual([{ n: 1 }, { n: 2 }])
  })

  it('should post asking for line-delimited JSON with the csrf token and the signal', async () => {
    document.cookie = 'csrftoken=token-123'
    globalThis.fetch.mockResolvedValue(streamedResponse([]))
    const controller = new AbortController()

    await streamJsonLines('/stream', { signal: controller.signal })

    const [url, init] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('/api/stream')
    expect(init.method).toBe('POST')
    expect(init.headers.Accept).toBe('application/x-ndjson')
    expect(init.headers['X-CSRFToken']).toBe('token-123')
    expect(init.signal).toBe(controller.signal)
  })

  it('should reject with the API error and deliver nothing when the response fails', async () => {
    globalThis.fetch.mockResolvedValue(streamedResponse([bytes('{"n":1}\n')], { status: 404 }))
    const onLine = vi.fn()

    const failure = await streamJsonLines('/stream', { onLine }).catch((error) => error)

    expect(failure).toBeInstanceOf(ApiError)
    expect(failure.status).toBe(404)
    expect(onLine).not.toHaveBeenCalled()
  })
})

describe('streamDocumentSuggestions', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should stream the suggestion events of the uploaded file', async () => {
    globalThis.fetch.mockResolvedValue(
      streamedResponse([bytes('{"type":"text","field":"title","value":"Memorial"}\n')]),
    )
    const events = []

    await streamDocumentSuggestions('file-1', { onEvent: (event) => events.push(event) })

    expect(globalThis.fetch.mock.calls[0][0]).toBe('/api/documents/file-1/suggestions/stream')
    expect(events).toEqual([{ type: 'text', field: 'title', value: 'Memorial' }])
  })
})
