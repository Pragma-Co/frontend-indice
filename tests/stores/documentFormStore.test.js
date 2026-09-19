import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '../../src/api/client'
import { useDocumentFormStore } from '../../src/stores/documentFormStore'

vi.mock('../../src/api/projects', () => ({ listProjects: vi.fn() }))
vi.mock('../../src/api/disciplines', () => ({ listDisciplines: vi.fn() }))
vi.mock('../../src/api/documents', async (importOriginal) => ({
  ...(await importOriginal()),
  createDocument: vi.fn(),
}))

import { listProjects } from '../../src/api/projects'
import { listDisciplines } from '../../src/api/disciplines'
import { createDocument } from '../../src/api/documents'

const CREATED = {
  id: 7,
  code: 'AK-2100-EST-DWG-0002',
  title: 'Desenho da fuselagem central',
  revision: { version: 1, label: 'REV01', status: 'PENDING' },
}

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
    expect(store.form.version).toBe(1)
    expect(store.revision).toBe('REV01')
    expect(store.form.confidentiality).toBe('CONFIDENTIAL')
    expect(store.form.title).toBe('')
    expect(store.form.areas).toEqual([])
    expect(store.isValid).toBe(false)
  })

  it('should load projects and disciplines from the API', async () => {
    await store.loadCatalogs()

    expect(listProjects).toHaveBeenCalled()
    expect(listDisciplines).toHaveBeenCalled()
    expect(store.projects).toEqual(PROJECTS)
    expect(store.disciplines).toEqual(DISCIPLINES)
    expect(store.catalogsError).toBeNull()
  })

  it('should record a friendly error when the catalogs cannot be loaded', async () => {
    listProjects.mockRejectedValue(
      new ApiError('Erro interno do servidor. Tente novamente mais tarde.', { status: 500 }),
    )

    await store.loadCatalogs()

    expect(store.catalogsError).toBe('Erro interno do servidor. Tente novamente mais tarde.')
    expect(store.catalogsLoading).toBe(false)
  })

  it('should preview the code from the project, discipline and document type codes', async () => {
    await store.loadCatalogs()

    fillValidForm(store)

    expect(store.codePreview).toBe('AK-2100-EST-DWG-####')
  })

  it('should keep the code preview empty while project, discipline or type is missing', async () => {
    await store.loadCatalogs()

    store.form.projectId = 1
    store.form.documentType = 'DWG'

    expect(store.codePreview).toBeNull()
  })

  it('should pre-fill the author with the logged-in user without overriding manual edits', () => {
    store.setDefaultAuthor('João Silva')
    expect(store.form.author).toBe('João Silva')

    store.form.author = 'Maria Souza'
    store.setDefaultAuthor('João Silva')

    expect(store.form.author).toBe('Maria Souza')
  })

  it('should be valid only when every required field is filled', () => {
    fillValidForm(store)
    expect(store.isValid).toBe(true)

    store.form.areas = []

    expect(store.isValid).toBe(false)
    expect(store.errors).toEqual({ areas: 'Área(s) relacionada(s) é obrigatório.' })
  })

  it('should become invalid when the author is cleared', () => {
    fillValidForm(store)

    store.form.author = ''

    expect(store.isValid).toBe(false)
    expect(store.errors).toEqual({ author: 'Responsável/Autor é obrigatório.' })
  })

  it('should clear the form and the publishing flag on reset while keeping the default author', () => {
    fillValidForm(store)
    store.publishing = true

    store.reset('João Silva')

    expect(store.form.title).toBe('')
    expect(store.form.areas).toEqual([])
    expect(store.form.author).toBe('João Silva')
    expect(store.publishing).toBe(false)
  })

  it('should pre-fill suggestible fields and flag them as suggested', () => {
    // When
    store.applySuggestions({
      title: 'Desenho da fuselagem central',
      disciplineId: 1,
      documentType: 'DWG',
      description: 'Gerado pela IA',
      areas: ['EST'],
    })
    // Then
    expect(store.form.title).toBe('Desenho da fuselagem central')
    expect(store.form.disciplineId).toBe(1)
    expect(store.form.documentType).toBe('DWG')
    expect(store.form.description).toBe('Gerado pela IA')
    expect(store.form.areas).toEqual(['EST'])
    expect(store.isFieldSuggested('title')).toBe(true)
    expect(store.isFieldSuggested('disciplineId')).toBe(true)
    expect(store.isFieldSuggested('documentType')).toBe(true)
    expect(store.isFieldSuggested('description')).toBe(true)
    expect(store.isFieldSuggested('areas')).toBe(true)
  })

  it('should ignore suggestions for fields outside the suggestible list', () => {
    // When
    store.applySuggestions({ author: 'Robô', confidentiality: 'PUBLIC' })
    // Then
    expect(store.form.author).toBe('')
    expect(store.form.confidentiality).not.toBe('PUBLIC')
    expect(store.isFieldSuggested('author')).toBe(false)
  })

  it('should drop the suggested flag for a field once cleared', () => {
    // Given
    store.applySuggestions({ title: 'Desenho da fuselagem central' })
    // When
    store.clearSuggestion('title')
    // Then
    expect(store.isFieldSuggested('title')).toBe(false)
    expect(store.form.title).toBe('Desenho da fuselagem central')
  })

  it('should clear all suggestion flags on reset', () => {
    // Given
    store.applySuggestions({ title: 'Desenho da fuselagem central' })
    // When
    store.reset()
    // Then
    expect(store.isFieldSuggested('title')).toBe(false)
  })
})
