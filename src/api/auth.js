import { api } from './client'

export function startDevelopmentSession(userId) {
  return api.post('/dev/login', { user_id: userId })
}
