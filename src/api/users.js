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
