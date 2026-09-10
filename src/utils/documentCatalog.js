/**
 * Static option lists for the metadata form. Projects and disciplines come
 * from the API (GET /projects, GET /disciplines). Document types and areas are
 * tables in the database as well, but until they get endpoints the lists
 * below mirror the seed data, code by code, so the document can be saved
 * later. Labels are user-facing and stay in Portuguese.
 */
export const DOCUMENT_TYPES = [
  { code: 'DWG', name: 'Desenho Técnico' },
  { code: 'MEM', name: 'Memorial de Cálculo' },
  { code: 'ESP', name: 'Especificação Técnica' },
  { code: 'NOR', name: 'Norma Interna' },
  { code: 'REV', name: 'Relatório de Verificação' },
  { code: 'PRO', name: 'Procedimento de Fabricação' },
  { code: 'LDM', name: 'Lista de Materiais' },
]

export const AREAS = [
  { code: 'EST', name: 'Engenharia Estrutural' },
  { code: 'SIS', name: 'Engenharia de Sistemas' },
  { code: 'AER', name: 'Aerodinâmica e Desempenho' },
  { code: 'MFG', name: 'Manufatura e Montagem' },
  { code: 'QUA', name: 'Qualidade e Inspeção' },
  { code: 'CER', name: 'Certificação e Aeronavegabilidade' },
]

/** Values accepted by the database; the default is the one the backend applies. */
export const CONFIDENTIALITY_LEVELS = [
  { value: 'PUBLIC', label: 'Público' },
  { value: 'CONFIDENTIAL', label: 'Confidencial' },
  { value: 'SECRET', label: 'Sigiloso' },
]

export const DEFAULT_CONFIDENTIALITY = 'CONFIDENTIAL'

export function findDocumentType(code) {
  return DOCUMENT_TYPES.find((t) => t.code === code) ?? null
}

export function findArea(code) {
  return AREAS.find((a) => a.code === code) ?? null
}

export function findConfidentiality(value) {
  return CONFIDENTIALITY_LEVELS.find((c) => c.value === value) ?? null
}
