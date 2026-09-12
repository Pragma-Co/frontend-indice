export function buildDocumentSearchQuery({ query = '', date = '', dateFrom = '', dateTo = '', area = '', type = '' } = {}) {
  return Object.fromEntries(
    Object.entries({ q: query, data: date, date_from: dateFrom, date_to: dateTo, area, tipo: type })
      .map(([key, value]) => [key, String(value).trim()])
      .filter(([, value]) => value),
  )
}

export function buildDocumentQueryKey(query = {}) {
  const params = Object.entries(query)
    .map(([key, value]) => [key, String(value ?? '').trim()])
    .filter(([, value]) => value)
    .sort(([left], [right]) => left.localeCompare(right))

  return new URLSearchParams(params).toString()
}
