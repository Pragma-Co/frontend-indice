import { api } from './client'

/** GET /projects → [{ id, code, name }] (active only, ordered by name) */
export function listProjects() {
  return api.get('/projects/')
}
