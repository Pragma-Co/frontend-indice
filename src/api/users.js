import { api } from './client'

export function fetchCurrentUser() {
  return api.get('/users/me')
}

export function updateCurrentUser({ name, email }) {
  return api.put('/users/me', { name, email })
}

export function requestAccountDeletion() {
  return api.post('/users/me/request-deletion')
}

export function fetchLegalAcceptances() {
  return api.get('/users/me/legal-acceptances')
}

export function revokeLegalAcceptance(acceptanceId) {
  return api.post(`/users/me/legal-acceptances/${acceptanceId}/revoke`)
}

export function acceptLegalTerms({ versionId, consents }) {
  return api.post('/users/me/legal-acceptances', { version_id: versionId, consents })
}
