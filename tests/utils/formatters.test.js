import { describe, expect, it } from 'vitest'
import { getInitials } from '../../src/utils/formatters'

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
