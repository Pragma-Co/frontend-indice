import { api, uploadWithProgress } from './client'
import { buildDocumentQueryKey } from '../utils/searchParams'

let simpleFiltersCache = null
let simpleFiltersRequest = null
const documentsCache = new Map()
const documentsRequests = new Map()

export function clearDocumentsCache() {
  documentsCache.clear()
  documentsRequests.clear()
}

export function uploadDocument(file, { onProgress, signal, userId } = {}) {
  const formData = new FormData()
  formData.append('file', file)
  if (userId != null) {
    formData.append('user_id', String(userId))
  }
  return uploadWithProgress('/documents/upload', formData, { onProgress, signal })
}

export function createDocumentRevision(documentId, tempFileId, sourceFileId) {
  return api.post(`/documents/${documentId}/revisions`, {
    temp_file_id: tempFileId,
    source_file_id: sourceFileId,
  })
}

export async function fetchSimpleFilters() {
  if (simpleFiltersCache) return simpleFiltersCache
  if (!simpleFiltersRequest) {
    simpleFiltersRequest = fetch('/api/documents/simple-filters')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Simple filters failed with status ${response.status}`)
        }
        return response.json()
      })
      .then((data) => {
        simpleFiltersCache = data
        return data
      })
      .finally(() => {
        simpleFiltersRequest = null
      })
  }
  return simpleFiltersRequest
}

export function fetchDocuments(query = {}) {
  const queryString = buildDocumentQueryKey(query)
  if (documentsCache.has(queryString)) return Promise.resolve(documentsCache.get(queryString))
  if (documentsRequests.has(queryString)) return documentsRequests.get(queryString)

  const request = fetch(`/api/documents${queryString ? `?${queryString}` : ''}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Documents failed with status ${response.status}`)
      }
      return response.json()
    })
    .then((data) => {
      documentsCache.set(queryString, data)
      return data
    })
    .finally(() => {
      documentsRequests.delete(queryString)
    })

  documentsRequests.set(queryString, request)
  return request
}

export function toDocumentPayload(form, { tempFileIds, tempFileId, responsibleId, userId }) {
  const payload = {
    title: form.title.trim(),
    description: form.description.trim(),
    project_id: Number(form.projectId),
    discipline_id: Number(form.disciplineId),
    document_type: form.documentType,
    confidentiality: form.confidentiality,
    responsible_id: responsibleId,
    areas: [...form.areas],
  }
  if (tempFileIds) payload.temp_file_ids = tempFileIds
  else payload.temp_file_id = tempFileId
  if (userId != null) payload.user_id = userId
  return payload
}

export function createDocument(payload) {
  return api.post('/documents', payload)
}

export function listDocumentTypes() {
  return api.get('/documents/types')
}

export function fetchDocumentDetail(documentId) {
  return api.get(`/documents/${documentId}`)
}

export function requestDocumentSuggestions(documentId) {
  return api.post(`/documents/${documentId}/suggestions`)
}

export function requestDocumentAccess(documentId, userId, justification) {
  return api.post(`/documents/${documentId}/request-access`, {
    user_id: userId,
    justification,
  })
}
