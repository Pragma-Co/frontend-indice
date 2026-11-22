import { api } from './client'

export function listAccessGroups() {
  return api.get('/access-groups')
}
