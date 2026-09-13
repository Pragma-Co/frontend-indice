import { api } from './client'

/** GET /disciplines → [{ id, acronym, name }] (active only, ordered by name) */
export function listDisciplines() {
  return api.get('/disciplines/')
}
