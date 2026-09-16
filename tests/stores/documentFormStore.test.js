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
    listProjects.mockRejectedValue(
      new ApiError('Erro interno do servidor. Tente novamente mais tarde.', { status: 500 }),
    )
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
    expect(store.codePreview).toBe('AK-2100-EST-DWG-####')
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

  it('should clear the form and the publishing flag on reset while keeping the default author', () => {
    // Given
    fillValidForm(store)
    store.publishing = true
    // When
    store.reset('João Silva')
    // Then
    expect(store.form.title).toBe('')
    expect(store.form.areas).toEqual([])
    expect(store.form.author).toBe('João Silva')
    expect(store.publishing).toBe(false)
  })

  describe('publish', () => {
    it('should post the mapped payload with the seeded responsible and keep the created document', async () => {
      // Given
      fillValidForm(store)
      createDocument.mockResolvedValue(CREATED)
      // When
      const result = await store.publish('temp-1')
      // Then
      expect(createDocument).toHaveBeenCalledWith({
        temp_file_id: 'temp-1',
        title: 'Desenho da fuselagem central',
        description: '',
        project_id: 1,
        discipline_id: 1,
        document_type: 'DWG',
        confidentiality: 'CONFIDENTIAL',
        responsible_id: 12,
        areas: ['EST'],
      })
      expect(result).toEqual(CREATED)
      expect(store.publishedDocument).toEqual({
        id: 7,
        code: 'AK-2100-EST-DWG-0002',
        title: 'Desenho da fuselagem central',
        revision: 'REV01',
      })
      expect(store.publishing).toBe(false)
      expect(store.publishError).toBeNull()
    })

    it('should clear the form on success while keeping the author', async () => {
      // Given
      fillValidForm(store)
      createDocument.mockResolvedValue(CREATED)
      // When
      await store.publish('temp-1')
      // Then
      expect(store.form.title).toBe('')
      expect(store.form.areas).toEqual([])
      expect(store.form.author).toBe('João Silva')
    })

    it('should map the 400 field errors to the form fields and keep the form', async () => {
      // Given
      fillValidForm(store)
      createDocument.mockRejectedValue(
        new ApiError('Dados inválidos.', {
          status: 400,
          details: {
            errors: {
              project_id: 'Project is required.',
              responsible_id: 'Responsible not found.',
            },
          },
        }),
      )
      // When
      const error = await store.publish('temp-1').catch((e) => e)
      // Then
      expect(error.status).toBe(400)
      expect(store.serverErrors).toEqual({
        projectId: 'Valor inválido para o campo Projeto.',
        author: 'Valor inválido para o campo Responsável/Autor.',
      })
      expect(store.publishError).toBe('Alguns campos precisam de correção. Revise os metadados.')
      expect(store.form.title).toBe('Desenho da fuselagem central')
      expect(store.publishing).toBe(false)
    })

    it('should ask for a new upload on 404', async () => {
      // Given
      fillValidForm(store)
      createDocument.mockRejectedValue(
        new ApiError('Recurso não encontrado.', {
          status: 404,
          details: { errors: { temp_file_id: 'Uploaded file not found or expired.' } },
        }),
      )
      // When
      await store.publish('temp-1').catch(() => {})
      // Then
      expect(store.publishError).toBe('O arquivo enviado expirou. Faça o upload novamente.')
      expect(store.serverErrors).toEqual({})
    })

    it('should name the existing document on 409', async () => {
      // Given
      fillValidForm(store)
      createDocument.mockRejectedValue(
        new ApiError('Já existe.', {
          status: 409,
          details: {
            error: 'already registered',
            document: { id: 3, code: 'AK-2100-EST-DWG-0001' },
          },
        }),
      )
      // When
      await store.publish('temp-1').catch(() => {})
      // Then
      expect(store.publishError).toBe(
        'Este arquivo já está cadastrado no documento AK-2100-EST-DWG-0001.',
      )
    })

    it('should keep the generic message for other errors', async () => {
      // Given
      fillValidForm(store)
      createDocument.mockRejectedValue(
        new ApiError('Erro interno do servidor. Tente novamente mais tarde.', { status: 500 }),
      )
      // When
      await store.publish('temp-1').catch(() => {})
      // Then
      expect(store.publishError).toBe('Erro interno do servidor. Tente novamente mais tarde.')
    })

    it('should drop a field error once that field is cleared', () => {
      // Given
      store.serverErrors = { title: 'Title is required.', areas: 'Areas required.' }
      // When
      store.clearServerError('title')
      // Then
      expect(store.serverErrors).toEqual({ areas: 'Areas required.' })
    })

    it('should clear the publish state on reset', () => {
      // Given
      store.publishError = 'erro'
      store.serverErrors = { title: 'x' }
      // When
      store.reset()
      // Then
      expect(store.publishError).toBeNull()
      expect(store.serverErrors).toEqual({})
    })
  })
})
