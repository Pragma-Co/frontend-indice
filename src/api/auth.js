import { api } from './client'

export function fetchCsrfCookie() {
  return api.get('/auth/csrf')
}

export function startSession(credentials) {
  return api.post('/auth/login', credentials)
}

export function endSession() {
  return api.post('/auth/logout')
}
