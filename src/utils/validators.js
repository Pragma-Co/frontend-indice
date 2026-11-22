export function getFileExtension(fileName) {
  const match = /\.([a-zA-Z0-9]+)$/.exec(fileName ?? '')
  return match ? match[1].toLowerCase() : ''
}

export function isFileTypeAccepted(file, acceptedExtensions) {
  return acceptedExtensions.includes(getFileExtension(file.name))
}

export function isFileSizeValid(file, maxSizeBytes) {
  return file.size <= maxSizeBytes
}

export function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === ''
}

export const REQUIRED_DOCUMENT_FIELDS = {
  title: 'Título',
  projectId: 'Projeto',
  disciplineId: 'Disciplina',
  documentType: 'Tipo de documento',
  confidentiality: 'Grau de confidencialidade',
  author: 'Responsável/Autor',
  areas: 'Área(s) relacionada(s)',
}

export function validateDocumentForm(form) {
  const errors = {}
  for (const [field, label] of Object.entries(REQUIRED_DOCUMENT_FIELDS)) {
    const value = form?.[field]
    const empty = Array.isArray(value) ? value.length === 0 : isBlank(value)
    if (empty) errors[field] = `${label} é obrigatório.`
  }
  if (form?.confidentiality === 'SECRET' && !form.authorizedUsers?.length) {
    errors.authorizedUsers = 'Selecione ao menos um usuário com acesso.'
  }
  return errors
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.[^\s@.]{2,}$/

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

export function isValidEmail(value) {
  return typeof value === 'string' && EMAIL_PATTERN.test(value)
}

function validateLoginEmail(email) {
  const normalized = String(email ?? '').trim()
  if (!normalized) return 'Informe o e-mail.'
  if (!isValidEmail(normalized)) return 'Informe um e-mail válido, como nome@empresa.com.'
  return null
}

function validateLoginPassword(password) {
  const value = String(password ?? '')
  if (!value) return 'Informe a senha.'
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`
  }
  return null
}

export function validateLoginForm({ email, password } = {}) {
  const errors = {}
  const emailError = validateLoginEmail(email)
  const passwordError = validateLoginPassword(password)
  if (emailError) errors.email = emailError
  if (passwordError) errors.password = passwordError
  return errors
}
