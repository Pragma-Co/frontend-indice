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

  describe('disciplines by project', () => {
    const LINKED_PROJECTS = [
      { id: 1, code: 'AK-2100', name: 'Aeroestrutura', discipline_ids: [1] },
      { id: 2, code: 'BR-300', name: 'Trem de pouso', discipline_ids: [2] },
    ]
    const TWO_DISCIPLINES = [
      { id: 1, code: 'EST', name: 'Estruturas' },
      { id: 2, code: 'HID', name: 'Hidráulica' },
    ]

    it('should list only the disciplines linked to the selected project', async () => {
      listProjects.mockResolvedValue(LINKED_PROJECTS)
      listDisciplines.mockResolvedValue(TWO_DISCIPLINES)
      await store.loadCatalogs()

      store.selectProject(2)

      expect(store.availableDisciplines.map((d) => d.code)).toEqual(['HID'])
    })

    it('should clear the discipline when the new project does not include it', async () => {
      listProjects.mockResolvedValue(LINKED_PROJECTS)
      listDisciplines.mockResolvedValue(TWO_DISCIPLINES)
      await store.loadCatalogs()
      store.selectProject(1)
      store.form.disciplineId = 1

      store.selectProject('2')

      expect(store.form.projectId).toBe('2')
      expect(store.form.disciplineId).toBe('')
    })

    it('should keep the discipline when the new project also includes it', async () => {
      listProjects.mockResolvedValue([
        { id: 1, code: 'AK-2100', name: 'A', discipline_ids: [1, 2] },
        { id: 2, code: 'BR-300', name: 'B', discipline_ids: [2] },
      ])
      listDisciplines.mockResolvedValue(TWO_DISCIPLINES)
      await store.loadCatalogs()
      store.selectProject(1)
      store.form.disciplineId = 2

      store.selectProject(2)

      expect(store.form.disciplineId).toBe(2)
    })

    it('should list no discipline until a project is chosen when projects carry discipline_ids', async () => {
      listProjects.mockResolvedValue(LINKED_PROJECTS)
      listDisciplines.mockResolvedValue(TWO_DISCIPLINES)

      await store.loadCatalogs()

      expect(store.projectsCarryDisciplines).toBe(true)
      expect(store.availableDisciplines).toEqual([])
    })

    it('should list every discipline while projects do not carry discipline_ids', async () => {
      await store.loadCatalogs()

      store.selectProject(1)

      expect(store.availableDisciplines).toEqual(DISCIPLINES)
    })
  })

  describe('publish', () => {
    it('should post the mapped payload with the seeded responsible and keep the created document', async () => {
      fillValidForm(store)
      createDocument.mockResolvedValue(CREATED)

      const result = await store.publish('temp-1')

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
      fillValidForm(store)
      createDocument.mockResolvedValue(CREATED)

      await store.publish('temp-1')

      expect(store.form.title).toBe('')
      expect(store.form.areas).toEqual([])
      expect(store.form.author).toBe('João Silva')
    })

    it('should map the 400 field errors to the form fields and keep the form', async () => {
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

      const error = await store.publish('temp-1').catch((e) => e)

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
      fillValidForm(store)
      createDocument.mockRejectedValue(
        new ApiError('Recurso não encontrado.', {
          status: 404,
          details: { errors: { temp_file_id: 'Uploaded file not found or expired.' } },
        }),
      )

      await store.publish('temp-1').catch(() => {})

      expect(store.publishError).toBe('O arquivo enviado expirou. Faça o upload novamente.')
      expect(store.serverErrors).toEqual({})
    })

    it('should name the existing document on 409', async () => {
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

      await store.publish('temp-1').catch(() => {})

      expect(store.publishError).toBe(
        'Este arquivo já está cadastrado no documento AK-2100-EST-DWG-0001.',
      )
    })

    it('should keep the generic message for other errors', async () => {
      fillValidForm(store)
      createDocument.mockRejectedValue(
        new ApiError('Erro interno do servidor. Tente novamente mais tarde.', { status: 500 }),
      )

      await store.publish('temp-1').catch(() => {})

      expect(store.publishError).toBe('Erro interno do servidor. Tente novamente mais tarde.')
    })

    it('should drop a field error once that field is cleared', () => {
      store.serverErrors = { title: 'Title is required.', areas: 'Areas required.' }

      store.clearServerError('title')

      expect(store.serverErrors).toEqual({ areas: 'Areas required.' })
    })

    it('should clear the publish state on reset', () => {
      store.publishError = 'erro'
      store.serverErrors = { title: 'x' }

      store.reset()

      expect(store.publishError).toBeNull()
      expect(store.serverErrors).toEqual({})
    })
  })
})
