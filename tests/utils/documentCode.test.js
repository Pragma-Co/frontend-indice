import { describe, expect, it } from 'vitest'
import { buildDocumentCode, INITIAL_REVISION, toSigla } from '../../src/utils/documentCode'

describe('toSigla', () => {
  it('deve usar as três primeiras letras do nome em maiúsculas', () => {
    // Given
    const nome = 'Tubulação'
    // When
    const sigla = toSigla(nome)
    // Then
    expect(sigla).toBe('TUB')
  })

  it('deve remover acentos e espaços antes de gerar a sigla', () => {
    // Given / When / Then
    expect(toSigla('Memória de Cálculo')).toBe('MEM')
    expect(toSigla('Óleo e Gás')).toBe('OLE')
    expect(toSigla('Revisão Técnica')).toBe('REV')
  })

  it('deve retornar vazio quando o nome não for informado', () => {
    expect(toSigla('')).toBe('')
    expect(toSigla(null)).toBe('')
  })
})

describe('buildDocumentCode', () => {
  it('deve montar o código no padrão PROJETO-SUBGRUPO-TIPO-REV', () => {
    // Given
    const partes = { projeto: 'PJT001', disciplina: 'TUB', tipo: 'REV' }
    // When
    const codigo = buildDocumentCode(partes)
    // Then
    expect(codigo).toBe('PJT001-TUB-REV-REV01')
  })

  it('deve iniciar a revisão em REV01 por padrão', () => {
    expect(INITIAL_REVISION).toBe('REV01')
    expect(buildDocumentCode({ projeto: 'PJT001', disciplina: 'EST', tipo: 'NOR' })).toMatch(/-REV01$/)
  })

  it('deve retornar null enquanto faltar alguma parte do código', () => {
    // Given
    const incompleto = { projeto: 'PJT001', disciplina: '', tipo: 'REV' }
    // When / Then
    expect(buildDocumentCode(incompleto)).toBeNull()
    expect(buildDocumentCode({})).toBeNull()
  })
})
