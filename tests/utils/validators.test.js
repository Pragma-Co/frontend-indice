import { describe, expect, it } from 'vitest'
import { isBlank, validateDocumentForm } from '../../src/utils/validators'

const validForm = {
  titulo: 'Relatório de ensaio',
  projetoId: 1,
  disciplinaId: 2,
  tipoDocumento: 'REL',
  areas: ['Petroquímica'],
  responsavel: 'João Silva',
}

describe('validateDocumentForm', () => {
  it('não deve retornar erros quando todos os campos obrigatórios estiverem preenchidos', () => {
    // Given
    const form = { ...validForm }
    // When
    const errors = validateDocumentForm(form)
    // Then
    expect(errors).toEqual({})
  })

  it('deve apontar cada campo obrigatório vazio', () => {
    // Given
    const form = { titulo: '  ', projetoId: '', disciplinaId: '', tipoDocumento: '', areas: [] }
    // When
    const errors = validateDocumentForm(form)
    // Then
    expect(Object.keys(errors).sort()).toEqual(['areas', 'disciplinaId', 'projetoId', 'tipoDocumento', 'titulo'])
    expect(errors.titulo).toBe('Título é obrigatório.')
  })

  it('deve exigir pelo menos uma área relacionada', () => {
    // Given
    const form = { ...validForm, areas: [] }
    // When
    const errors = validateDocumentForm(form)
    // Then
    expect(errors).toEqual({ areas: 'Área(s) relacionada(s) é obrigatório.' })
  })

  it('não deve exigir descrição nem responsável', () => {
    // Given
    const form = { ...validForm, descricao: '', responsavel: '' }
    // When / Then
    expect(validateDocumentForm(form)).toEqual({})
  })
})

describe('isBlank', () => {
  it('deve tratar null, undefined e espaços como vazio', () => {
    expect(isBlank(null)).toBe(true)
    expect(isBlank(undefined)).toBe(true)
    expect(isBlank('   ')).toBe(true)
    expect(isBlank('a')).toBe(false)
    expect(isBlank(0)).toBe(false)
  })
})
