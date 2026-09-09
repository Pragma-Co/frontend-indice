import { describe, expect, it } from 'vitest'
import { buildDocumentCode, INITIAL_REVISION, toAcronym } from '../../src/utils/documentCode'

describe('toAcronym', () => {
  it('should use the first three letters of the name in uppercase', () => {
    // Given
    const name = 'Tubulação'
    // When
    const acronym = toAcronym(name)
    // Then
    expect(acronym).toBe('TUB')
  })

  it('should strip accents and spaces before building the acronym', () => {
    // Given / When / Then
    expect(toAcronym('Memória de Cálculo')).toBe('MEM')
    expect(toAcronym('Óleo e Gás')).toBe('OLE')
    expect(toAcronym('Revisão Técnica')).toBe('REV')
  })

  it('should return an empty string when the name is missing', () => {
    expect(toAcronym('')).toBe('')
    expect(toAcronym(null)).toBe('')
  })
})

describe('buildDocumentCode', () => {
  it('should build the code in the PROJETO-SUBGRUPO-TIPO-REV pattern', () => {
    // Given
    const parts = { project: 'PJT001', discipline: 'TUB', type: 'REV' }
    // When
    const code = buildDocumentCode(parts)
    // Then
    expect(code).toBe('PJT001-TUB-REV-REV01')
  })

  it('should start the revision at REV01 by default', () => {
    expect(INITIAL_REVISION).toBe('REV01')
    expect(buildDocumentCode({ project: 'PJT001', discipline: 'EST', type: 'NOR' })).toMatch(/-REV01$/)
  })

  it('should return null while any part of the code is missing', () => {
    // Given
    const incomplete = { project: 'PJT001', discipline: '', type: 'REV' }
    // When / Then
    expect(buildDocumentCode(incomplete)).toBeNull()
    expect(buildDocumentCode({})).toBeNull()
  })
})
