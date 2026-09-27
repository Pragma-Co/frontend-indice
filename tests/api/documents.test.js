import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../src/api/client'
import {
  createDocument,
  createDocumentRevision,
  fetchDocuments,
  toDocumentPayload,
} from '../../src/api/documents'

function mockResponse(body, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
    json: async () => body,
  }
}

const FORM = {
  title: ' Desenho de conjunto da caverna 14 ',
  description: 'Conjunto soldado da caverna 14',
  projectId: '1',
  disciplineId: 1,
  documentType: 'DWG',
  confidentiality: 'CONFIDENTIAL',
  author: 'Beatriz Canuto',
  areas: ['EST', 'QUA'],
  version: 1,
}

describe('toDocumentPayload', () => {
  it('should map the form to the POST /documents payload', () => {
    const payload = toDocumentPayload(FORM, { tempFileId: 'temp-1', responsibleId: 12 })

    expect(payload).toEqual({
      temp_file_id: 'temp-1',
      title: 'Desenho de conjunto da caverna 14',
      description: 'Conjunto soldado da caverna 14',
      project_id: 1,
      discipline_id: 1,
      document_type: 'DWG',
      confidentiality: 'CONFIDENTIAL',
      responsible_id: 12,
      areas: ['EST', 'QUA'],
    })
  })

  it('should copy the areas instead of sharing the form array', () => {
    const payload = toDocumentPayload(FORM, { tempFileId: 'temp-1', responsibleId: 12 })
    payload.areas.push('SIS')

    expect(FORM.areas).toEqual(['EST', 'QUA'])
  })

  it('should map multiple temporary files to one document payload', () => {
    const payload = toDocumentPayload(FORM, {
      tempFileIds: ['temp-1', 'temp-2'],
      responsibleId: 12,
    })

    expect(payload.temp_file_ids).toEqual(['temp-1', 'temp-2'])
    expect(payload).not.toHaveProperty('temp_file_id')
  })
})

describe('createDocument', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should post the payload as JSON to /api/documents and return the created document', async () => {
    const created = { id: 7, code: 'AK-2100-EST-DWG-0002', revision: { label: 'REV01' } }
    globalThis.fetch.mockResolvedValue(mockResponse(created, { status: 201 }))
    const payload = { temp_file_id: 'temp-1', title: 'Desenho' }

    const document = await createDocument(payload)

    expect(document).toEqual(created)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/documents',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    )
  })

  it('should expose the field errors of a 400 response', async () => {
    const errors = { title: 'Title is required.', areas: 'Areas must be a list of area acronyms.' }
    globalThis.fetch.mockResolvedValue(mockResponse({ errors }, { status: 400 }))

    const error = await createDocument({}).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.details.errors).toEqual(errors)
  })

  it('should expose the 404 when the temporary file is gone', async () => {
    globalThis.fetch.mockResolvedValue(
      mockResponse({ errors: { temp_file_id: 'Uploaded file not found.' } }, { status: 404 }),
    )

    const error = await createDocument({}).catch((e) => e)

    expect(error.status).toBe(404)
    expect(error.details.errors.temp_file_id).toBeDefined()
  })

  it('should expose the existing document of a 409 response', async () => {
    globalThis.fetch.mockResolvedValue(
      mockResponse(
        {
          error: 'This file is already registered.',
          document: { id: 3, code: 'AK-2100-EST-DWG-0001' },
        },
        { status: 409 },
      ),
    )

    const error = await createDocument({}).catch((e) => e)

    expect(error.status).toBe(409)
    expect(error.details.document.code).toBe('AK-2100-EST-DWG-0001')
  })

  it('should keep only the generic message for server errors', async () => {
    globalThis.fetch.mockResolvedValue(mockResponse({ error: 'DatabaseError' }, { status: 500 }))

    const error = await createDocument({}).catch((e) => e)

    expect(error.status).toBe(500)
    expect(error.message).toBe('Erro interno do servidor. Tente novamente mais tarde.')
    expect(error.message).not.toContain('DatabaseError')
  })
})

describe('createDocumentRevision', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should invalidate cached document rows after creating a revision', async () => {
    const query = { page: 1, page_size: 20 }
    globalThis.fetch
      .mockResolvedValueOnce(
        mockResponse({ count: 1, results: [{ id: 23, revision: { version: 1 } }] }),
      )
      .mockResolvedValueOnce(mockResponse({ id: 37, version: 2 }, { status: 201 }))
      .mockResolvedValueOnce(
        mockResponse({ count: 1, results: [{ id: 23, revision: { version: 2 } }] }),
      )

    const oldList = await fetchDocuments(query)
    const newRevision = await createDocumentRevision(23, ['temp-a', 'temp-b'])
    const refreshedList = await fetchDocuments(query)

    expect(oldList.results[0].revision.version).toBe(1)
    expect(newRevision.version).toBe(2)
    expect(refreshedList.results[0].revision.version).toBe(2)
    expect(globalThis.fetch).toHaveBeenCalledTimes(3)
  })
})
