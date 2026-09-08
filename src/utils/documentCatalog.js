import { toSigla } from './documentCode'

/**
 * Static option lists for the metadata form. Projects and disciplines come
 * from the API (GET /projetos, GET /disciplinas); the lists below are the
 * defaults agreed for the form until dedicated endpoints exist.
 */
const TIPO_NOMES = [
  'Norma',
  'Desenho',
  'Relatório',
  'Memória de Cálculo',
  'Revisão Técnica',
  'Procedimento',
  'Especificação',
]

export const TIPOS_DOCUMENTO = TIPO_NOMES.map((nome) => ({ sigla: toSigla(nome), nome }))

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

export const CONFIDENCIALIDADES = [
  { value: 'publico', label: 'Público' },
  { value: 'interno', label: 'Interno' },
  { value: 'confidencial', label: 'Confidencial' },
  { value: 'sigiloso', label: 'Sigiloso' },
]

/** Disciplines may come without `sigla`; derive it from the name then. */
export function disciplinaSigla(disciplina) {
  if (!disciplina) return ''
  return disciplina.sigla || toSigla(disciplina.nome)
}

export function findTipo(sigla) {
  return TIPOS_DOCUMENTO.find((t) => t.sigla === sigla) ?? null
}

export function confidencialidadeLabel(value) {
  return CONFIDENCIALIDADES.find((c) => c.value === value)?.label ?? value
}
