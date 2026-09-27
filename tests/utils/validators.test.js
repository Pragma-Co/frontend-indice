import { describe, expect, it } from 'vitest'
import { isBlank, validateDocumentForm } from '../../src/utils/validators'

const validForm = {
  title: 'Relatório de ensaio',
  projectId: 1,
  disciplineId: 2,
  documentType: 'MEM',
  confidentiality: 'PUBLIC',
  areas: ['EST'],
  author: 'João Silva',
}

describe('validateDocumentForm', () => {
  it('should return no errors when every required field is filled', () => {
    const form = { ...validForm }
    const errors = validateDocumentForm(form)
    expect(errors).toEqual({})
  })

  it('should flag every empty required field', () => {
    const form = {
      title: '  ',
      projectId: '',
      disciplineId: '',
      documentType: '',
      confidentiality: '',
      author: '',
      areas: [],
    }
    const errors = validateDocumentForm(form)
    expect(Object.keys(errors).sort()).toEqual([
      'areas',
      'author',
      'confidentiality',
      'disciplineId',
      'documentType',
      'projectId',
      'title',
    ])
    expect(errors.title).toBe('Título é obrigatório.')
    expect(errors.author).toBe('Responsável/Autor é obrigatório.')
  })

  it('should require at least one related area', () => {
    const form = { ...validForm, areas: [] }
    const errors = validateDocumentForm(form)
    expect(errors).toEqual({ areas: 'Área(s) relacionada(s) é obrigatório.' })
  })

  it('should not require the description', () => {
    const form = { ...validForm, description: '' }
    expect(validateDocumentForm(form)).toEqual({})
  })

  it('should require author and confidentiality', () => {
    const form = { ...validForm, author: '   ', confidentiality: '' }
    const errors = validateDocumentForm(form)
    expect(errors).toEqual({
      confidentiality: 'Grau de confidencialidade é obrigatório.',
      author: 'Responsável/Autor é obrigatório.',
    })
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
