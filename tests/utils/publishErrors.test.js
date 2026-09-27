import { describe, expect, it } from 'vitest'
import { ApiError } from '../../src/api/client'
import {
  mapServerErrors,
  publishErrorMessage,
  translateFieldError,
} from '../../src/utils/publishErrors'

describe('translateFieldError', () => {
  it('should translate a known field and code', () => {
    const message = translateFieldError('disciplineId', {
      code: 'not_in_project',
      message: 'Discipline is not part of the selected project.',
    })

    expect(message).toBe('A disciplina não pertence ao projeto selecionado.')
  })

  it('should translate the length and format codes', () => {
    expect(translateFieldError('title', { code: 'too_long' })).toBe(
      'Título deve ter no máximo 255 caracteres.',
    )
    expect(translateFieldError('areas', { code: 'invalid' })).toBe(
      'Informe as áreas como uma lista de siglas.',
    )
    expect(translateFieldError('tempFileId', { code: 'not_found' })).toBe(
      'O arquivo enviado expirou. Faça o upload novamente.',
    )
  })

  it('should fall back to a generic message when the backend sends only a string', () => {
    expect(translateFieldError('title', 'Title is required.')).toBe(
      'Valor inválido para o campo Título.',
    )
  })

  it('should fall back to a generic message for an unknown code', () => {
    expect(translateFieldError('areas', { code: 'something_new' })).toBe(
      'Valor inválido para o campo Área(s) relacionada(s).',
    )
  })

  it('should never show the backend text to the user', () => {
    const message = translateFieldError('projectId', {
      code: 'unknown',
      message: 'IntegrityError at row 3',
    })

    expect(message).not.toContain('IntegrityError')
  })
})

describe('mapServerErrors', () => {
  it('should translate payload keys to form fields', () => {
    const errors = {
      project_id: { code: 'required' },
      responsible_id: { code: 'not_found' },
      temp_file_id: 'Temporary file id is required.',
    }

    const mapped = mapServerErrors(errors)

    expect(mapped).toEqual({
      projectId: 'Projeto é obrigatório.',
      author: 'Responsável não encontrado ou inativo.',
      tempFileId: 'Valor inválido para o campo Arquivo enviado.',
    })
  })

  it('should keep unknown keys and return an empty object without errors', () => {
    expect(mapServerErrors({ payload: 'A JSON object is required.' })).toEqual({
      payload: 'Valor inválido para o campo payload.',
    })
    expect(mapServerErrors(undefined)).toEqual({})
  })
})

describe('publishErrorMessage', () => {
  it('should describe each status without exposing backend details', () => {
    const conflict = new ApiError('Já existe.', {
      status: 409,
      details: { error: 'sha256 collision', document: { id: 3, code: 'AK-2100-EST-DWG-0001' } },
    })

    expect(publishErrorMessage(new ApiError('x', { status: 400 }))).toBe(
      'Alguns campos precisam de correção. Revise os metadados.',
    )
    expect(publishErrorMessage(new ApiError('x', { status: 404 }))).toBe(
      'O arquivo enviado expirou. Faça o upload novamente.',
    )
    expect(publishErrorMessage(conflict)).toBe(
      'Este arquivo já está cadastrado no documento AK-2100-EST-DWG-0001.',
    )
    expect(publishErrorMessage(conflict)).not.toContain('sha256')
    expect(publishErrorMessage(new ApiError('Erro interno.', { status: 500 }))).toBe(
      'Erro interno.',
    )
  })
})
