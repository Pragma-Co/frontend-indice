export function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === ''
}

/** Required form fields → user-facing label (Portuguese). Aligned with the backend validation. */
export const REQUIRED_DOCUMENT_FIELDS = {
  title: 'Título',
  projectId: 'Projeto',
  disciplineId: 'Disciplina',
  documentType: 'Tipo de documento',
  confidentiality: 'Grau de confidencialidade',
  author: 'Responsável/Autor',
  areas: 'Área(s) relacionada(s)',
}

/**
 * Returns an object { field: message } with one entry per invalid field.
 * An empty object means the form is valid.
 */
export function validateDocumentForm(form) {
  const errors = {}
  for (const [field, label] of Object.entries(REQUIRED_DOCUMENT_FIELDS)) {
    const value = form?.[field]
    const empty = Array.isArray(value) ? value.length === 0 : isBlank(value)
    if (empty) errors[field] = `${label} é obrigatório.`
  }
  return errors
}
