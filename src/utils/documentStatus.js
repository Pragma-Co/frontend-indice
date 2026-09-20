const BADGE_BY_REVISION_STATUS = {
  PENDING: 'em_revisao',
  APPROVED: 'vigente',
  REJECTED: 'rejeitado',
  OBSOLETE: 'obsoleto',
}

export function statusBadgeFor(revisionStatus) {
  return BADGE_BY_REVISION_STATUS[revisionStatus] ?? null
}

const BADGE_BY_ACCESS_STATUS = {
  APPROVED: 'vigente',
  IN_REVIEW: 'em_revisao',
  PENDING: 'rascunho',
  REJECTED: 'rejeitado',
}

export function accessStatusBadgeFor(accessStatus) {
  return BADGE_BY_ACCESS_STATUS[accessStatus] ?? null
}
