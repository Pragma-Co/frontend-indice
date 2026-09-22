export const MULTI_VALUE_FILTERS = ['tipo', 'area', 'discipline', 'status']

export function emptyFilters() {
  return {
    q: '',
    tipo: [],
    area: [],
    discipline: [],
    status: [],
    data: '',
    dateFrom: '',
    dateTo: '',
  }
}

function toText(value) {
  return String(Array.isArray(value) ? (value[0] ?? '') : (value ?? '')).trim()
}

function toList(value) {
  const values = Array.isArray(value) ? value : [value]
  return [
    ...new Set(
      values
        .flatMap((item) => String(item ?? '').split(','))
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ]
}

export function filtersFromQuery(query = {}) {
  const filters = emptyFilters()
  filters.q = toText(query.q)
  for (const name of MULTI_VALUE_FILTERS) filters[name] = toList(query[name])
  filters.data = toText(query.data)
  filters.dateFrom = toText(query.date_from)
  filters.dateTo = toText(query.date_to)
  return filters
}

export function filtersToQuery(filters = emptyFilters()) {
  const entries = [
    ['q', toText(filters.q)],
    ...MULTI_VALUE_FILTERS.map((name) => [name, toList(filters[name]).join(',')]),
    ['data', toText(filters.data)],
    ['date_from', toText(filters.dateFrom)],
    ['date_to', toText(filters.dateTo)],
  ]
  return Object.fromEntries(entries.filter(([, value]) => value))
}

export function countActiveFilters(filters = emptyFilters()) {
  return Object.keys(filtersToQuery(filters)).filter((name) => name !== 'q').length
}

export function keepPageSize(query = {}) {
  return query.page_size ? { page_size: query.page_size } : {}
}
