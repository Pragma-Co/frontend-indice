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

export const ACCESS_REQUEST_DECISIONS = {
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
}

export function submitAccessRequestDecision(accessRequestId, { decision, opinion }) {
  return api.post(`/manager/access-requests/${accessRequestId}/decision`, { decision, opinion })
}

export const REVISION_DECISIONS = {
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
}

export function submitRevisionDecision(revisionId, { decision, justification = '' }) {
  return api.post(`/manager/revisions/${revisionId}/decision`, { decision, justification })
}

export function fetchAccessGroups() {
  return api.get('/manager/access-groups')
}

export function fetchAccessGroupMembers(groupId) {
  return api.get(`/manager/access-groups/${groupId}/users`)
}

export function addAccessGroupMember(groupId, userId) {
  return api.post(`/manager/access-groups/${groupId}/users`, { user_id: userId })
}

export function removeAccessGroupMember(groupId, userId) {
  return api.delete(`/manager/access-groups/${groupId}/users/${userId}`)
}
