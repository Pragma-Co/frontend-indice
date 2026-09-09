import { describe, expect, it } from 'vitest'
import { isBlank, validateDocumentForm } from '../../src/utils/validators'

const validForm = {
  title: 'Relatório de ensaio',
  projectId: 1,
  disciplineId: 2,
  documentType: 'REL',
  areas: ['Petroquímica'],
  author: 'João Silva',
}

describe('validateDocumentForm', () => {
  it('should return no errors when every required field is filled', () => {
    // Given
    const form = { ...validForm }
    // When
    const errors = validateDocumentForm(form)
    // Then
    expect(errors).toEqual({})
  })

  it('should flag every empty required field', () => {
    // Given
    const form = { title: '  ', projectId: '', disciplineId: '', documentType: '', areas: [] }
    // When
    const errors = validateDocumentForm(form)
    // Then
    expect(Object.keys(errors).sort()).toEqual(['areas', 'disciplineId', 'documentType', 'projectId', 'title'])
    expect(errors.title).toBe('Título é obrigatório.')
  })

  it('should require at least one related area', () => {
    // Given
    const form = { ...validForm, areas: [] }
    // When
    const errors = validateDocumentForm(form)
    // Then
    expect(errors).toEqual({ areas: 'Área(s) relacionada(s) é obrigatório.' })
  })

  it('should not require description or author', () => {
    // Given
    const form = { ...validForm, description: '', author: '' }
    // When / Then
    expect(validateDocumentForm(form)).toEqual({})
  })
})

describe('isBlank', () => {
  it('should treat null, undefined and whitespace as blank', () => {
    expect(isBlank(null)).toBe(true)
    expect(isBlank(undefined)).toBe(true)
    expect(isBlank('   ')).toBe(true)
    expect(isBlank('a')).toBe(false)
    expect(isBlank(0)).toBe(false)
  })
})
