import { api } from './client'

const SEARCH_HISTORY_PATH = '/users/me/search-history'

export async function fetchSearchHistory() {
  const data = await api.get(SEARCH_HISTORY_PATH)
  return Array.isArray(data?.results) ? data.results : []
}

export function clearSearchHistory() {
  return api.delete(SEARCH_HISTORY_PATH)
}

export function removeSearchHistoryTerm(term) {
  return api.delete(`${SEARCH_HISTORY_PATH}?term=${encodeURIComponent(term)}`)
}
