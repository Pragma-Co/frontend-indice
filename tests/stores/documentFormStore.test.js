import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '../../src/api/client'
import { useDocumentFormStore } from '../../src/stores/documentFormStore'

vi.mock('../../src/api/projetos', () => ({ listProjetos: vi.fn() }))
vi.mock('../../src/api/disciplinas', () => ({ listDisciplinas: vi.fn() }))

import { listProjetos } from '../../src/api/projetos'
import { listDisciplinas } from '../../src/api/disciplinas'

const PROJETOS = [{ id: 1, codigo: 'PJT001', nome: 'Projeto Alfa' }]
const DISCIPLINAS = [{ id: 2, sigla: 'TUB', nome: 'Tubulação' }]

function fillValidForm(store) {
  store.form.titulo = 'Relatório de ensaio'
  store.form.projetoId = 1
  store.form.disciplinaId = 2
  store.form.tipoDocumento = 'REV'
  store.form.areas = ['Petroquímica']
}

describe('documentFormStore', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useDocumentFormStore()
    vi.clearAllMocks()
    listProjetos.mockResolvedValue(PROJETOS)
    listDisciplinas.mockResolvedValue(DISCIPLINAS)
  })

  it('deve iniciar com revisão REV01 e formulário vazio', () => {
    // Then
    expect(store.form.revisao).toBe('REV01')
    expect(store.form.titulo).toBe('')
    expect(store.form.areas).toEqual([])
    expect(store.isValid).toBe(false)
  })

  it('deve carregar projetos e disciplinas da API', async () => {
    // When
    await store.loadCatalogs()
    // Then
    expect(listProjetos).toHaveBeenCalled()
    expect(listDisciplinas).toHaveBeenCalled()
    expect(store.projetos).toEqual(PROJETOS)
    expect(store.disciplinas).toEqual(DISCIPLINAS)
    expect(store.catalogsError).toBeNull()
  })

  it('deve registrar erro amigável quando as listas não puderem ser carregadas', async () => {
    // Given
    listProjetos.mockRejectedValue(new ApiError('Erro interno do servidor. Tente novamente mais tarde.', { status: 500 }))
    // When
    await store.loadCatalogs()
    // Then
    expect(store.catalogsError).toBe('Erro interno do servidor. Tente novamente mais tarde.')
    expect(store.catalogsLoading).toBe(false)
  })

  it('deve gerar a prévia do código a partir de projeto, disciplina e tipo', async () => {
    // Given
    await store.loadCatalogs()
    // When
    fillValidForm(store)
    // Then
    expect(store.codigoPreview).toBe('PJT001-TUB-REV-REV01')
  })

  it('deve manter o código vazio enquanto faltar projeto, disciplina ou tipo', async () => {
    // Given
    await store.loadCatalogs()
    // When
    store.form.projetoId = 1
    store.form.tipoDocumento = 'REV'
    // Then
    expect(store.codigoPreview).toBeNull()
  })

  it('deve preencher o responsável com o usuário logado sem sobrescrever edição manual', () => {
    // Given
    store.setDefaultResponsavel('João Silva')
    expect(store.form.responsavel).toBe('João Silva')
    // When
    store.form.responsavel = 'Maria Souza'
    store.setDefaultResponsavel('João Silva')
    // Then
    expect(store.form.responsavel).toBe('Maria Souza')
  })

  it('deve considerar o formulário válido somente com todos os obrigatórios preenchidos', () => {
    // Given
    fillValidForm(store)
    expect(store.isValid).toBe(true)
    // When
    store.form.areas = []
    // Then
    expect(store.isValid).toBe(false)
    expect(store.errors).toEqual({ areas: 'Área(s) relacionada(s) é obrigatório.' })
  })

  it('deve limpar o formulário ao resetar mantendo o responsável padrão', () => {
    // Given
    fillValidForm(store)
    // When
    store.reset('João Silva')
    // Then
    expect(store.form.titulo).toBe('')
    expect(store.form.areas).toEqual([])
    expect(store.form.responsavel).toBe('João Silva')
  })
})
