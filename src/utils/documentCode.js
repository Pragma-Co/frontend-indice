export const INITIAL_VERSION = 1
export const CODE_SEQUENCE_PLACEHOLDER = '####'

export function revisionLabel(version = INITIAL_VERSION) {
  return `REV${String(version).padStart(2, '0')}`
}

export function buildDocumentCode({ project, discipline, type }) {
  const parts = [project, discipline, type].map((p) => (p ?? '').toString().trim())
  if (parts.some((p) => p === '')) return null
  return [...parts, CODE_SEQUENCE_PLACEHOLDER].join('-').toUpperCase()
}
