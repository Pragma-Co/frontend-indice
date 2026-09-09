import { toAcronym } from './documentCode'

/**
 * Static option lists for the metadata form. Projects and disciplines come
 * from the API (GET /projects, GET /disciplines); the lists below are the
 * defaults agreed for the form until dedicated endpoints exist.
 * Labels are user-facing and stay in Portuguese.
 */
const DOCUMENT_TYPE_NAMES = [
  'Norma',
  'Desenho',
  'Relatório',
  'Memória de Cálculo',
  'Revisão Técnica',
  'Procedimento',
  'Especificação',
]

export const DOCUMENT_TYPES = DOCUMENT_TYPE_NAMES.map((name) => ({ acronym: toAcronym(name), name }))

export const AREAS = [
  'Petroquímica',
  'Aeroespacial',
  'Defesa',
  'Industrial',
  'Naval',
  'Óleo e Gás',
  'Energia',
  'Automotivo',
]

export const CONFIDENTIALITY_LEVELS = [
  { value: 'public', label: 'Público' },
  { value: 'internal', label: 'Interno' },
  { value: 'confidential', label: 'Confidencial' },
  { value: 'secret', label: 'Sigiloso' },
]

export function findDocumentType(acronym) {
  return DOCUMENT_TYPES.find((t) => t.acronym === acronym) ?? null
}
