const BADGE_BY_REVISION_STATUS = {
  PENDING: 'em_revisao',
  APPROVED: 'vigente',
  REJECTED: 'rejeitado',
}

export function statusBadgeFor(revisionStatus) {
  return BADGE_BY_REVISION_STATUS[revisionStatus] ?? null
}

export function canCreateRevision(revisionStatus) {
  return revisionStatus !== 'PENDING'
}

export const REVISION_BLOCK_REASONS = {
  NO_ACCESS: 'no-access',
  OUTSIDE_AREA: 'outside-area',
  IN_PROGRESS: 'in-progress',
}

export const REVISION_BLOCK_MESSAGES = {
  [REVISION_BLOCK_REASONS.NO_ACCESS]:
    'Você não tem permissão para criar uma revisão deste documento.',
  [REVISION_BLOCK_REASONS.OUTSIDE_AREA]:
    'Somente colaboradores das áreas deste documento podem criar uma revisão.',
  [REVISION_BLOCK_REASONS.IN_PROGRESS]:
    'Este documento já possui uma revisão em andamento. Aguarde a conclusão para criar outra.',
}

export function hasDocumentAccess(document, userId) {
  if (!document) return false
  if (document.access_status === 'APPROVED') return true
  return userId != null && document.responsible?.id === userId
}

export function belongsToDocumentArea(document, areaAcronym) {
  if (!areaAcronym) return false
  return (document?.areas ?? []).some((area) => area.acronym === areaAcronym)
}

export function listedRevisionBlockReason(document, areaAcronym) {
  if (!belongsToDocumentArea(document, areaAcronym)) return REVISION_BLOCK_REASONS.OUTSIDE_AREA
  if (!canCreateRevision(document?.status)) return REVISION_BLOCK_REASONS.IN_PROGRESS
  return null
}

export function revisionBlockReason(document, userId, areaAcronym) {
  if (!hasDocumentAccess(document, userId)) return REVISION_BLOCK_REASONS.NO_ACCESS
  if (!belongsToDocumentArea(document, areaAcronym)) return REVISION_BLOCK_REASONS.OUTSIDE_AREA
  if (!canCreateRevision(document.revision?.status)) return REVISION_BLOCK_REASONS.IN_PROGRESS
  return null
}
