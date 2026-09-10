import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '../../src/api/client'
import { useDocumentFormStore } from '../../src/stores/documentFormStore'

vi.mock('../../src/api/projects', () => ({ listProjects: vi.fn() }))
vi.mock('../../src/api/disciplines', () => ({ listDisciplines: vi.fn() }))

import { listProjects } from '../../src/api/projects'
import { listDisciplines } from '../../src/api/disciplines'

const PROJECTS = [{ id: 1, code: 'AK-2100', name: 'Aeroestrutura de Fuselagem Central' }]
const DISCIPLINES = [{ id: 1, code: 'EST', name: 'Estruturas' }]

function fillValidForm(store) {
  store.form.title = 'Desenho da fuselagem central'
  store.form.projectId = 1
  store.form.disciplineId = 1
  store.form.documentType = 'DWG'
  store.form.author = 'João Silva'
  store.form.areas = ['EST']
}

describe('documentFormStore', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useDocumentFormStore()
    vi.clearAllMocks()
    listProjects.mockResolvedValue(PROJECTS)
    listDisciplines.mockResolvedValue(DISCIPLINES)
  })

  it('should start at version 1 shown as REV01, confidential by default, with an empty form', () => {
    // Then
    expect(store.form.version).toBe(1)
    expect(store.revision).toBe('REV01')
    expect(store.form.confidentiality).toBe('CONFIDENTIAL')
    expect(store.form.title).toBe('')
    expect(store.form.areas).toEqual([])
    expect(store.isValid).toBe(false)
  })

  it('should load projects and disciplines from the API', async () => {
    // When
    await store.loadCatalogs()
    // Then
    expect(listProjects).toHaveBeenCalled()
    expect(listDisciplines).toHaveBeenCalled()
    expect(store.projects).toEqual(PROJECTS)
    expect(store.disciplines).toEqual(DISCIPLINES)
    expect(store.catalogsError).toBeNull()
  })

  it('should record a friendly error when the catalogs cannot be loaded', async () => {
    // Given
    listProjects.mockRejectedValue(new ApiError('Erro interno do servidor. Tente novamente mais tarde.', { status: 500 }))
    // When
    await store.loadCatalogs()
    // Then
    expect(store.catalogsError).toBe('Erro interno do servidor. Tente novamente mais tarde.')
    expect(store.catalogsLoading).toBe(false)
  })

  it('should preview the code from the project, discipline and document type codes', async () => {
    // Given
    await store.loadCatalogs()
    // When
    fillValidForm(store)
    // Then
    expect(store.codePreview).toBe('AK-2100-EST-DWG-REV01')
  })

  it('should keep the code preview empty while project, discipline or type is missing', async () => {
    // Given
    await store.loadCatalogs()
    // When
    store.form.projectId = 1
    store.form.documentType = 'DWG'
    // Then
    expect(store.codePreview).toBeNull()
  })

  it('should pre-fill the author with the logged-in user without overriding manual edits', () => {
    // Given
    store.setDefaultAuthor('João Silva')
    expect(store.form.author).toBe('João Silva')
    // When
    store.form.author = 'Maria Souza'
    store.setDefaultAuthor('João Silva')
    // Then
    expect(store.form.author).toBe('Maria Souza')
  })

  it('should be valid only when every required field is filled', () => {
    // Given
    fillValidForm(store)
    expect(store.isValid).toBe(true)
    // When
    store.form.areas = []
    // Then
    expect(store.isValid).toBe(false)
    expect(store.errors).toEqual({ areas: 'Área(s) relacionada(s) é obrigatório.' })
  })

  it('should become invalid when the author is cleared', () => {
    // Given
    fillValidForm(store)
    // When
    store.form.author = ''
    // Then
    expect(store.isValid).toBe(false)
    expect(store.errors).toEqual({ author: 'Responsável/Autor é obrigatório.' })
  })

  it('should clear the form on reset while keeping the default author', () => {
    // Given
    fillValidForm(store)
    // When
    store.reset('João Silva')
    // Then
    expect(store.form.title).toBe('')
    expect(store.form.areas).toEqual([])
    expect(store.form.author).toBe('João Silva')
  })
})
