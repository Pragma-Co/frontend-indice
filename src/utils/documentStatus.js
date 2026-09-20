const BADGE_BY_REVISION_STATUS = {
  PENDING: 'em_revisao',
  APPROVED: 'vigente',
  REJECTED: 'rejeitado',
  OBSOLETE: 'obsoleto',
}

export function statusBadgeFor(revisionStatus) {
  return BADGE_BY_REVISION_STATUS[revisionStatus] ?? null
}
