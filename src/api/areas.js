import { api } from './client'

export function listAreas() {
  return api.get('/areas/')
}
