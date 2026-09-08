import { api } from './client'

/** GET /projetos → [{ id, codigo, nome }] */
export function listProjetos() {
  return api.get('/projetos/')
}
