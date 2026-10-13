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
