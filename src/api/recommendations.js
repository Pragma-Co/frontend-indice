import { api } from './client'

export const RECOMMENDATIONS_LIMIT = 12

export function fetchDocumentRecommendations(documentId, { limit = RECOMMENDATIONS_LIMIT } = {}) {
  return api.get(`/documents/${documentId}/recommendations?limit=${limit}`)
}
