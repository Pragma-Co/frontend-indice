import { describe, expect, it } from 'vitest'
import { formatDate, formatFileSize, getInitials } from '../../src/utils/formatters'

describe('formatDate', () => {
  it('should format a date as dd/mm/yyyy', () => {
    // Given
    const date = new Date(2026, 8, 15) // 15 Sep 2026, local time
    // When
    const formatted = formatDate(date)
    // Then
    expect(formatted).toBe('15/09/2026')
  })

  it('should accept ISO strings', () => {
    // Given / When / Then
    expect(formatDate('2026-01-05T12:00:00')).toBe('05/01/2026')
  })

  it('should return a dash for empty or invalid input', () => {
    expect(formatDate('not a date')).toBe('—')
    expect(formatDate(null)).toBe('—')
    expect(formatDate('')).toBe('—')
  })
})

describe('formatFileSize', () => {
  it('should format bytes, kilobytes and megabytes', () => {
    expect(formatFileSize(500)).toBe('500 B')
    expect(formatFileSize(1536)).toBe('1.5 KB')
    expect(formatFileSize(14.2 * 1024 * 1024)).toBe('14.2 MB')
  })
})

describe('getInitials', () => {
  it('should use the first letter of the first two names', () => {
    // When
    const result = getInitials('ana beatriz costa')
    // Then
    expect(result).toBe('AB')
  })

  it('should use a single initial for single-word names', () => {
    // When
    const result = getInitials('  Carlos  ')
    // Then
    expect(result).toBe('C')
  })

  it('should return an empty string for empty names', () => {
    // When / Then
    expect(getInitials('')).toBe('')
    expect(getInitials()).toBe('')
  })
})
