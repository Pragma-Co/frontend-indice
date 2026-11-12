import { describe, expect, it } from 'vitest'
import {
  isBlank,
  isValidEmail,
  validateDocumentForm,
  validateLoginForm,
} from '../../src/utils/validators'

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

  it('should require at least one authorized user for secret documents', () => {
    const form = { ...validForm, confidentiality: 'SECRET', authorizedUsers: [] }
    expect(validateDocumentForm(form)).toEqual({
      authorizedUsers: 'Selecione ao menos um usuário com acesso.',
    })
    expect(validateDocumentForm({ ...form, authorizedUsers: ['2'] })).toEqual({})
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

describe('isValidEmail', () => {
  it('should accept a regular corporate e-mail', () => {
    expect(isValidEmail('nome@empresa.com')).toBe(true)
    expect(isValidEmail('nome.sobrenome+tag@sub.empresa.com.br')).toBe(true)
  })

  it('should reject values that are not an e-mail', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('nome')).toBe(false)
    expect(isValidEmail('nome@empresa')).toBe(false)
    expect(isValidEmail('nome@empresa.c')).toBe(false)
    expect(isValidEmail('nome@@empresa.com')).toBe(false)
    expect(isValidEmail('nome@.com')).toBe(false)
    expect(isValidEmail('nome@empresa..com')).toBe(false)
    expect(isValidEmail('no me@empresa.com')).toBe(false)
    expect(isValidEmail(null)).toBe(false)
  })
})

describe('validateLoginForm', () => {
  it('should return no errors for a valid e-mail and password', () => {
    expect(validateLoginForm({ email: 'nome@empresa.com', password: 'senha-segura' })).toEqual({})
  })

  it('should ask for both fields when they are empty', () => {
    expect(validateLoginForm({ email: '   ', password: '' })).toEqual({
      email: 'Informe o e-mail.',
      password: 'Informe a senha.',
    })
  })

  it('should validate the e-mail without the surrounding spaces', () => {
    expect(validateLoginForm({ email: '  nome@empresa.com  ', password: '12345678' })).toEqual({})
  })

  it('should reject an invalid e-mail', () => {
    expect(validateLoginForm({ email: 'nome@empresa', password: '12345678' })).toEqual({
      email: 'Informe um e-mail válido, como nome@empresa.com.',
    })
  })

  it('should require at least 8 password characters', () => {
    expect(validateLoginForm({ email: 'nome@empresa.com', password: '1234567' })).toEqual({
      password: 'A senha deve ter pelo menos 8 caracteres.',
    })
    expect(validateLoginForm({ email: 'nome@empresa.com', password: '12345678' })).toEqual({})
  })

  it('should accept at most 128 password characters', () => {
    expect(validateLoginForm({ email: 'nome@empresa.com', password: 'a'.repeat(128) })).toEqual({})
    expect(validateLoginForm({ email: 'nome@empresa.com', password: 'a'.repeat(129) })).toEqual({
      password: 'A senha deve ter no máximo 128 caracteres.',
    })
  })

  it('should not trim the password', () => {
    expect(validateLoginForm({ email: 'nome@empresa.com', password: '  1234  ' })).toEqual({})
  })
})
