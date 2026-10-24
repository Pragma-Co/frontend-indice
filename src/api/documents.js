import { api, uploadWithProgress } from './client'
import { buildDocumentQueryKey, buildSummaryQueryKey } from '../utils/searchParams'

let simpleFiltersCache = null
let simpleFiltersRequest = null

export function uploadDocument(file, { onProgress, signal, userId } = {}) {
  const formData = new FormData()
  formData.append('file', file)
  if (userId != null) {
    formData.append('user_id', String(userId))
  }
  return uploadWithProgress('/documents/upload', formData, { onProgress, signal })
}

export async function createDocumentRevision(documentId, tempFileIds, { changeDescription } = {}) {
  const payload = { temp_file_ids: tempFileIds }
  if (changeDescription) payload.change_description = changeDescription
  return api.post(`/documents/${documentId}/revisions`, payload)
}

export async function fetchSimpleFilters() {
  if (simpleFiltersCache) return simpleFiltersCache
  if (!simpleFiltersRequest) {
    simpleFiltersRequest = api
      .get('/documents/simple-filters')
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

function fetchDocumentPage(path, query = {}) {
  const queryString = buildDocumentQueryKey(query)

  return fetch(`${path}${queryString ? `?${queryString}` : ''}`).then((response) => {
    if (!response.ok) {
      throw new Error(`Documents failed with status ${response.status}`)
    }
    return response.json()
  })
}

export function fetchDocuments(query = {}) {
  return fetchDocumentPage('/api/documents', query)
}

export function searchDocuments(query = {}) {
  return fetchDocumentPage('/api/documents/search', query)
}

export async function fetchResultsSummary(query = {}, { signal } = {}) {
  const queryString = buildSummaryQueryKey(query)
  return api.get(`/documents/summary${queryString ? `?${queryString}` : ''}`, { signal })
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

export function fetchDocumentDetail(documentId, userId) {
  const query = userId ? `?user_id=${userId}` : ''
  return api.get(`/documents/${documentId}${query}`)
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
