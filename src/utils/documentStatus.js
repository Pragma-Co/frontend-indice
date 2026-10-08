const BADGE_BY_REVISION_STATUS = {
  PENDING: 'em_revisao',
  APPROVED: 'vigente',
  REJECTED: 'rejeitado',
  OBSOLETE: 'obsoleto',
}

export function statusBadgeFor(revisionStatus) {
  return BADGE_BY_REVISION_STATUS[revisionStatus] ?? null
}

export function canCreateRevision(revisionStatus) {
  return revisionStatus !== 'PENDING'
}

export const REVISION_BLOCK_REASONS = {
  NO_ACCESS: 'no-access',
  IN_PROGRESS: 'in-progress',
}

export const REVISION_BLOCK_MESSAGES = {
  [REVISION_BLOCK_REASONS.NO_ACCESS]:
    'Você não tem permissão para criar uma revisão deste documento.',
  [REVISION_BLOCK_REASONS.IN_PROGRESS]:
    'Este documento já possui uma revisão em andamento. Aguarde a conclusão para criar outra.',
}

export function hasDocumentAccess(document, userId) {
  if (!document) return false
  if (document.access_status === 'APPROVED') return true
  return userId != null && document.responsible?.id === userId
}

export function revisionBlockReason(document, userId) {
  if (!hasDocumentAccess(document, userId)) return REVISION_BLOCK_REASONS.NO_ACCESS
  if (!canCreateRevision(document.revision?.status)) return REVISION_BLOCK_REASONS.IN_PROGRESS
  return null
}
