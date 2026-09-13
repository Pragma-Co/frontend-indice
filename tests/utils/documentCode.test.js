import { describe, expect, it } from 'vitest'
import { buildDocumentCode, INITIAL_VERSION, revisionLabel } from '../../src/utils/documentCode'

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
  it('should build the code in the PROJECT-DISCIPLINE-TYPE-REV pattern from the catalog codes', () => {
    // Given
    const parts = { project: 'AK-2100', discipline: 'EST', type: 'DWG' }
    // When
    const code = buildDocumentCode(parts)
    // Then
    expect(code).toBe('AK-2100-EST-DWG-REV01')
  })

  it('should use the given version in the revision part', () => {
    expect(buildDocumentCode({ project: 'AK-2100', discipline: 'HID', type: 'MEM', version: 3 })).toBe('AK-2100-HID-MEM-REV03')
  })

  it('should return null while any part of the code is missing', () => {
    // Given
    const incomplete = { project: 'AK-2100', discipline: '', type: 'DWG' }
    // When / Then
    expect(buildDocumentCode(incomplete)).toBeNull()
    expect(buildDocumentCode({})).toBeNull()
  })
})
