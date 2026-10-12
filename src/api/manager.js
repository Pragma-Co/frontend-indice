import { api } from './client'

function pageQuery({ page = 1, pageSize } = {}) {
  const params = new URLSearchParams({ page: String(page) })
  if (pageSize) params.set('page_size', String(pageSize))
  return params.toString()
}

export function fetchPendingRevisions(options) {
  return api.get(`/manager/pending-revisions?${pageQuery(options)}`)
}

export function fetchPendingAccessRequests(options) {
  return api.get(`/manager/pending-access-requests?${pageQuery(options)}`)
}

export const REVISION_DECISIONS = {
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
}

export function submitRevisionDecision(revisionId, { decision, justification = '' }) {
  return api.post(`/manager/revisions/${revisionId}/decision`, { decision, justification })
}
