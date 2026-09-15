export const INITIAL_VERSION = 1

export function revisionLabel(version = INITIAL_VERSION) {
  return `REV${String(version).padStart(2, '0')}`
}

export function buildDocumentCode({ project, discipline, type, version = INITIAL_VERSION }) {
  const parts = [project, discipline, type].map((p) => (p ?? '').toString().trim())
  if (parts.some((p) => p === '')) return null
  return [...parts, revisionLabel(version)].join('-').toUpperCase()
}
