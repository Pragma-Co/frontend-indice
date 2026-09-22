import { describe, expect, it } from 'vitest'
import {
  countActiveFilters,
  emptyFilters,
  filtersFromQuery,
  filtersToQuery,
  keepPageSize,
} from '@/utils/resultFilters.js'

describe('filtersFromQuery', () => {
  it('should read the criteria sent by the home screen', () => {
    const filters = filtersFromQuery({
      q: ' tubulação ',
      tipo: 'DWG',
      area: 'EST',
      data: 'last_month',
    })

    expect(filters).toEqual({
      ...emptyFilters(),
      q: 'tubulação',
      tipo: ['DWG'],
      area: ['EST'],
      data: 'last_month',
    })
  })

  it('should accept several values as a comma-separated text or as repeated params', () => {
    const filters = filtersFromQuery({
      tipo: 'DWG,MEM',
      status: ['PENDING', 'APPROVED'],
      discipline: 'EST, MAT ,EST',
    })

    expect(filters.tipo).toEqual(['DWG', 'MEM'])
    expect(filters.status).toEqual(['PENDING', 'APPROVED'])
    expect(filters.discipline).toEqual(['EST', 'MAT'])
  })

  it('should read the explicit date range', () => {
    const filters = filtersFromQuery({ date_from: '2026-01-01', date_to: '2026-06-30' })

    expect(filters.dateFrom).toBe('2026-01-01')
    expect(filters.dateTo).toBe('2026-06-30')
  })

  it('should ignore pagination and unknown params', () => {
    expect(filtersFromQuery({ page: '3', page_size: '5', foo: 'bar' })).toEqual(emptyFilters())
  })
})

describe('filtersToQuery', () => {
  it('should write only the filled filters, joining several values with commas', () => {
    const query = filtersToQuery({
      ...emptyFilters(),
      q: 'tubulação',
      tipo: ['DWG', 'MEM'],
      status: ['PENDING'],
      dateFrom: '2026-01-01',
    })

    expect(query).toEqual({
      q: 'tubulação',
      tipo: 'DWG,MEM',
      status: 'PENDING',
      date_from: '2026-01-01',
    })
  })

  it('should produce an empty query when nothing is filled', () => {
    expect(filtersToQuery(emptyFilters())).toEqual({})
  })

  it('should survive a round trip through the URL', () => {
    const filters = {
      ...emptyFilters(),
      q: 'caverna',
      area: ['EST', 'QUA'],
      discipline: ['MAT'],
      data: 'last_year',
    }

    expect(filtersFromQuery(filtersToQuery(filters))).toEqual(filters)
  })
})

describe('countActiveFilters', () => {
  it('should count the refinements and leave the search term out', () => {
    const filters = { ...emptyFilters(), q: 'caverna', tipo: ['DWG', 'MEM'], status: ['PENDING'] }

    expect(countActiveFilters(filters)).toBe(2)
    expect(countActiveFilters(emptyFilters())).toBe(0)
  })
})

describe('keepPageSize', () => {
  it('should carry the page size and drop the page when the filters change', () => {
    expect(keepPageSize({ q: 'x', page: '3', page_size: '5' })).toEqual({ page_size: '5' })
    expect(keepPageSize({ q: 'x', page: '3' })).toEqual({})
  })
})
