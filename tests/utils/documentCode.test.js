import { describe, expect, it } from 'vitest'
import {
  buildDocumentCode,
  CODE_SEQUENCE_PLACEHOLDER,
  INITIAL_VERSION,
  revisionLabel,
} from '../../src/utils/documentCode'

describe('revisionLabel', () => {
  it('should format the version as a two-digit REV label', () => {
    // Given / When / Then
    expect(revisionLabel(1)).toBe('REV01')
    expect(revisionLabel(12)).toBe('REV12')
  })

  it('should start at version 1 by default', () => {
    expect(INITIAL_VERSION).toBe(1)
    expect(revisionLabel()).toBe('REV01')
  })
})

describe('buildDocumentCode', () => {
  it('should preview the code as PROJECT-DISCIPLINE-TYPE with the sequence placeholder', () => {
    // Given
    const parts = { project: 'AK-2100', discipline: 'EST', type: 'DWG' }
    // When
    const code = buildDocumentCode(parts)
    // Then
    expect(code).toBe('AK-2100-EST-DWG-####')
    expect(code.endsWith(CODE_SEQUENCE_PLACEHOLDER)).toBe(true)
  })

  it('should upper-case the catalog codes and never include the revision', () => {
    // When
    const code = buildDocumentCode({ project: 'ak-2100', discipline: 'hid', type: 'mem' })
    // Then
    expect(code).toBe('AK-2100-HID-MEM-####')
    expect(code).not.toContain('REV')
  })

  it('should return null while any part of the code is missing', () => {
    // Given
    const incomplete = { project: 'AK-2100', discipline: '', type: 'DWG' }
    // When / Then
    expect(buildDocumentCode(incomplete)).toBeNull()
    expect(buildDocumentCode({})).toBeNull()
  })
})
