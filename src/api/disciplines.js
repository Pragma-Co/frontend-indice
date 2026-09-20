import { api } from './client'

export function listDisciplines() {
  return api.get('/disciplines/')
}
