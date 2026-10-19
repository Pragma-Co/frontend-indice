import { api } from './client'

export function fetchLegalDocuments() {
  return api.get('/legal-documents')
}

export function fetchLegalVersion(versionId) {
  return api.get(`/legal-documents/versions/${versionId}`)
}
