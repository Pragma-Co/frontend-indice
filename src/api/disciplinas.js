import { api } from './client'

/** GET /disciplinas → [{ id, sigla, nome }] */
export function listDisciplinas() {
  return api.get('/disciplinas/')
}
