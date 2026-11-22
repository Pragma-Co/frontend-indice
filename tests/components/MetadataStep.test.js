import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MetadataStep from '../../src/components/document-upload/MetadataStep.vue'
import { useDocumentFormStore } from '../../src/stores/documentFormStore'
import { useUploadStore } from '../../src/stores/uploadStore.js'
import formFieldSource from '../../src/components/common/FormField.vue?raw'

vi.mock('../../src/api/projects', () => ({ listProjects: vi.fn() }))
vi.mock('../../src/api/disciplines', () => ({ listDisciplines: vi.fn() }))
vi.mock('../../src/api/areas', () => ({ listAreas: vi.fn() }))
vi.mock('../../src/api/users', () => ({ listUsers: vi.fn(), fetchCurrentUser: vi.fn() }))
vi.mock('../../src/api/accessGroups', () => ({ listAccessGroups: vi.fn() }))
vi.mock('../../src/api/documents', async (importOriginal) => ({
  ...(await importOriginal()),
  listDocumentTypes: vi.fn(),
  streamDocumentSuggestions: vi.fn(),
}))

import { listProjects } from '../../src/api/projects'
import { listDisciplines } from '../../src/api/disciplines'
import { listAreas } from '../../src/api/areas'
import { listUsers } from '../../src/api/users'
import { listAccessGroups } from '../../src/api/accessGroups'
import { listDocumentTypes, streamDocumentSuggestions } from '../../src/api/documents'

const PROJECTS = [{ id: 1, code: 'AK-2100', name: 'Aeroestrutura de Fuselagem Central' }]
const AREAS = [
  { id: 1, acronym: 'EST', name: 'Engenharia Estrutural' },
  { id: 2, acronym: 'QUA', name: 'Qualidade e Inspeção' },
]
const DISCIPLINES = [{ id: 1, code: 'EST', name: 'Estruturas' }]
const DOCUMENT_TYPES = [{ id: 'DWG', code: 'DWG', name: 'Desenho' }]

function installFormFieldStyles() {
  const styleContent = formFieldSource.match(/<style scoped>([\s\S]*?)<\/style>/)[1]
  const style = document.createElement('style')
  style.textContent = styleContent
    .replace(/:deep\(([^)]+)\)/g, '$1')
    .replaceAll('var(--color-danger)', '#dc2626')
    .replaceAll('var(--color-info-border)', '#cfe0ff')
  document.head.appendChild(style)
  return style
}

function withUploadedFile(uploadStore) {
  uploadStore.uploadedDocuments = [{ id: 'file-1', name: 'planta.pdf', size: 1024 }]
}

function streamAnswering(suggestion, textEvents = []) {
  streamDocumentSuggestions.mockImplementation(async (_documentId, { onEvent }) => {
    onEvent({
      type: 'classification',
      suggestion: { ...suggestion, title: null, description: null },
    })
    textEvents.forEach(onEvent)
    onEvent({ type: 'done', suggestion })
  })
}

function streamHeldOpen() {
  const stream = {}
  streamDocumentSuggestions.mockImplementation(
    (_documentId, { onEvent, signal }) =>
      new Promise((resolve, reject) => {
        Object.assign(stream, { emit: onEvent, signal, finish: resolve, fail: reject })
      }),
  )
  return stream
}

const AI_FILLED_FIELDS = ['project', 'discipline', 'document-type', 'areas', 'title', 'description']

function nextButton(wrapper) {
  return wrapper.findAll('button').find((b) => b.text() === 'Próximo Passo')
}

function skipButton(wrapper) {
  return wrapper.findAll('button').find((b) => b.text() === 'Preencher manualmente')
}

function busyFieldOf(wrapper, id) {
  return wrapper.find(`#${id}`).element.closest('.field--busy')
}

async function fillRequiredFields(wrapper) {
  await wrapper.find('#project').setValue(1)
  await wrapper.find('#discipline').setValue(1)
  await wrapper.find('#document-type').setValue('DWG')
  await wrapper.find('#title').setValue('Desenho da fuselagem central')
  await wrapper.find('#author').setValue('João Silva')
  await wrapper.find('#areas').setValue('EST')
}

describe('MetadataStep', () => {
  let store
  let uploadStore

  beforeEach(async () => {
    setActivePinia(createPinia())
    store = useDocumentFormStore()
    uploadStore = useUploadStore()
    withUploadedFile(uploadStore)
    vi.clearAllMocks()
    listProjects.mockResolvedValue(PROJECTS)
    listDisciplines.mockResolvedValue(DISCIPLINES)
    listAreas.mockResolvedValue(AREAS)
    listAccessGroups.mockResolvedValue([
      {
        id: 7,
        name: 'Qualidade — sigiloso',
        scope: 'AREA',
        area: 'QUA',
        secrecy_level: 'CONFIDENTIAL',
      },
      { id: 8, name: 'Qualidade — público', scope: 'AREA', area: 'QUA', secrecy_level: 'PUBLIC' },
    ])
    listDocumentTypes.mockResolvedValue(DOCUMENT_TYPES)
    streamDocumentSuggestions.mockResolvedValue(undefined)
    await store.loadCatalogs()
  })

  it('should populate the project and discipline selects with API data', () => {
    const wrapper = mount(MetadataStep)

    expect(wrapper.find('#project').text()).toContain(
      'AK-2100 - Aeroestrutura de Fuselagem Central',
    )
    expect(wrapper.find('#discipline').text()).toContain('EST - Estruturas')
  })

  it('should render code and revision as read-only', () => {
    const wrapper = mount(MetadataStep)

    expect(wrapper.find('#code').attributes('readonly')).toBeDefined()
    expect(wrapper.find('#revision').attributes('readonly')).toBeDefined()
    expect(wrapper.find('#revision').element.value).toBe('REV01')
  })

  it('should keep "Próximo Passo" disabled while required fields are empty', () => {
    const wrapper = mount(MetadataStep)

    expect(nextButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('should build the code and enable the next step once required fields are filled', async () => {
    const wrapper = mount(MetadataStep)

    await fillRequiredFields(wrapper)

    expect(wrapper.find('#code').element.value).toBe('AK-2100-EST-DWG-####')
    expect(wrapper.text()).toContain('ENGENHARIA ESTRUTURAL')
    expect(nextButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('should emit next when submitting a valid form', async () => {
    const wrapper = mount(MetadataStep)
    await fillRequiredFields(wrapper)

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('should not emit next when submitting an incomplete form', async () => {
    const wrapper = mount(MetadataStep)

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('next')).toBeUndefined()
  })

  describe('access select', () => {
    it('should be disabled for public documents', async () => {
      store.form.confidentiality = 'PUBLIC'
      const wrapper = mount(MetadataStep)

      expect(wrapper.find('#access-select').attributes('disabled')).toBeDefined()
    })

    it('should list the access groups above public for confidential documents', async () => {
      const wrapper = mount(MetadataStep)
      await flushPromises()

      const select = wrapper.find('#access-select')
      expect(select.attributes('disabled')).toBeUndefined()
      expect(select.text()).toContain('Qualidade — sigiloso')
      expect(select.text()).not.toContain('Qualidade — público')

      await select.setValue('7')

      expect(store.form.authorizedGroups).toEqual(['7'])
      expect(listAccessGroups).toHaveBeenCalledTimes(1)
    })

    it('should list the users for secret documents and load them once', async () => {
      listUsers.mockResolvedValue([
        { id: 1, name: 'Ana', email: 'ana@example.com' },
        { id: 2, name: 'Bruno', email: 'bruno@example.com' },
      ])
      const wrapper = mount(MetadataStep)

      await wrapper.find('input[type="radio"][value="SECRET"]').setValue()
      await flushPromises()

      expect(listUsers).toHaveBeenCalledTimes(1)
      expect(wrapper.find('#access-select').text()).toContain('Ana (ana@example.com)')
      await wrapper.find('#access-select').setValue('2')
      expect(store.form.authorizedUsers).toEqual(['2'])
    })

    it('should clear the selection when the confidentiality changes', async () => {
      store.form.authorizedGroups = ['7']
      const wrapper = mount(MetadataStep)

      await wrapper.find('input[type="radio"][value="PUBLIC"]').setValue()

      expect(store.form.authorizedGroups).toEqual([])
    })
  })

  it('should remove an area when clicking the × on its tag', async () => {
    store.form.areas = ['EST', 'QUA']
    const wrapper = mount(MetadataStep)

    await wrapper.find('button[aria-label="Remover Qualidade e Inspeção"]').trigger('click')

    expect(store.form.areas).toEqual(['EST'])
  })

  it('should pre-fill the author with the logged-in user and allow editing', async () => {
    store.setDefaultAuthor('João Silva')
    const wrapper = mount(MetadataStep)
    expect(wrapper.find('#author').element.value).toBe('João Silva')

    await wrapper.find('#author').setValue('Maria Souza')

    expect(store.form.author).toBe('Maria Souza')
  })

  it('should list every discipline without requiring a project', async () => {
    store.projects = [{ id: 1, code: 'AK-2100', name: 'Aeroestrutura' }]
    store.disciplines = [
      { id: 1, code: 'EST', name: 'Estruturas' },
      { id: 2, code: 'HID', name: 'Hidráulica' },
    ]
    const wrapper = mount(MetadataStep)

    const options = wrapper.findAll('#discipline option').map((o) => o.text().trim())

    expect(wrapper.find('#discipline').attributes('disabled')).toBeUndefined()
    expect(options).toEqual(['Selecione a disciplina', 'EST - Estruturas', 'HID - Hidráulica'])
  })

  it('should keep the chosen discipline when the project changes', async () => {
    store.projects = [
      { id: 1, code: 'AK-2100', name: 'Aeroestrutura' },
      { id: 2, code: 'BR-300', name: 'Trem de pouso' },
    ]
    store.disciplines = [{ id: 1, code: 'EST', name: 'Estruturas' }]
    const wrapper = mount(MetadataStep)
    await wrapper.find('#project').setValue(1)
    await wrapper.find('#discipline').setValue(1)

    await wrapper.find('#project').setValue(2)

    expect(store.form.disciplineId).toBe(1)
  })

  it('should show an inline error only after a required field is left empty', async () => {
    const wrapper = mount(MetadataStep)
    expect(wrapper.text()).not.toContain('Título é obrigatório.')

    await wrapper.find('#title').trigger('focusout')

    expect(wrapper.text()).toContain('Título é obrigatório.')
    expect(wrapper.find('#title').element.closest('.field').classList).toContain('field--invalid')
  })

  it('should show a backend field error right away and clear it when the field changes', async () => {
    store.serverErrors = { title: 'Title is required.' }
    const wrapper = mount(MetadataStep)
    expect(wrapper.text()).toContain('Title is required.')

    await wrapper.find('#title').setValue('Desenho da fuselagem central')

    expect(wrapper.text()).not.toContain('Title is required.')
    expect(store.serverErrors).toEqual({})
  })

  it('should clear the inline error once the field is filled', async () => {
    const wrapper = mount(MetadataStep)
    await wrapper.find('#title').trigger('focusout')

    await wrapper.find('#title').setValue('Desenho da fuselagem central')

    expect(wrapper.text()).not.toContain('Título é obrigatório.')
  })

  it('should show the author error under the author block when it is cleared', async () => {
    store.setDefaultAuthor('João Silva')
    const wrapper = mount(MetadataStep)

    await wrapper.find('#author').setValue('')
    await wrapper.find('#author').trigger('blur')

    expect(wrapper.find('.metadata__author-error').text()).toBe('Responsável/Autor é obrigatório.')
  })

  it('should block the next step when the pre-filled author is cleared', async () => {
    const wrapper = mount(MetadataStep)
    await fillRequiredFields(wrapper)
    expect(nextButton(wrapper).attributes('disabled')).toBeUndefined()

    await wrapper.find('#author').setValue('')

    expect(nextButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('should show an error message when the catalogs fail to load', () => {
    store.catalogsError = 'Não foi possível conectar ao servidor.'

    const wrapper = mount(MetadataStep)

    expect(wrapper.find('[role="alert"]').text()).toContain(
      'Não foi possível conectar ao servidor.',
    )
  })

  it('should show the AI badge on fields pre-filled by a suggestion', () => {
    store.applySuggestions({ title: 'Desenho da fuselagem central', documentType: 'DWG' })
    const wrapper = mount(MetadataStep)
    expect(wrapper.find('#title').element.value).toBe('Desenho da fuselagem central')
    const titleField = wrapper.find('#title').element.closest('.field')
    expect(titleField.classList).toContain('field--suggested')
    expect(titleField.textContent).toContain('Sugerido por IA')
    const descriptionField = wrapper.find('#description').element.closest('.field')
    expect(descriptionField.classList).not.toContain('field--suggested')
  })

  it('should drop the suggested flag for a field once the user edits it', async () => {
    store.applySuggestions({ title: 'Desenho da fuselagem central' })
    const wrapper = mount(MetadataStep)
    await wrapper.find('#title').setValue('Novo título editado')
    expect(store.isFieldSuggested('title')).toBe(false)
    expect(wrapper.find('#title').element.closest('.field').classList).not.toContain(
      'field--suggested',
    )
  })

  it('should drop the project suggested flag once the user changes it', async () => {
    store.applySuggestions({ projectId: 1 })
    const wrapper = mount(MetadataStep)

    await wrapper.find('#project').setValue('')

    expect(store.isFieldSuggested('projectId')).toBe(false)
    expect(wrapper.find('#project').element.closest('.field').classList).not.toContain(
      'field--suggested',
    )
  })

  it('should drop the suggested flag on the areas field when a tag is removed', async () => {
    store.applySuggestions({ areas: ['EST', 'QUA'] })
    const wrapper = mount(MetadataStep)
    await wrapper.find('button[aria-label="Remover Qualidade e Inspeção"]').trigger('click')
    expect(store.isFieldSuggested('areas')).toBe(false)
  })

  describe('AI suggestions', () => {
    it('should return the user to the upload screen when there are no uploaded files', () => {
      uploadStore.uploadedDocuments = []

      const wrapper = mount(MetadataStep)

      expect(wrapper.emitted('back')).toHaveLength(1)
      expect(streamDocumentSuggestions).not.toHaveBeenCalled()
    })

    it('should not request suggestions when the form is already filled', async () => {
      store.form.title = 'Título já preenchido'

      mount(MetadataStep)
      await flushPromises()

      expect(streamDocumentSuggestions).not.toHaveBeenCalled()
    })

    it('should request suggestions for the largest uploaded file when the form is empty', async () => {
      uploadStore.uploadedDocuments = [
        { id: 'file-1', name: 'a.pdf', size: 100 },
        { id: 'file-2', name: 'b.pdf', size: 500 },
      ]
      streamAnswering({
        project: { id: 1 },
        discipline: { id: 1 },
        document_type: { id: 'DWG' },
        title: 'Título sugerido',
        description: 'Descrição sugerida',
      })

      const wrapper = mount(MetadataStep)
      await flushPromises()

      expect(streamDocumentSuggestions).toHaveBeenCalledWith('file-2', expect.anything())
      expect(store.form.title).toBe('Título sugerido')
      expect(wrapper.text()).toContain('Sugestões prontas')
    })

    it('should flag only the fields the AI actually suggested and map the area by name', async () => {
      streamAnswering({
        project: { id: 1, name: 'Aeroestrutura de Fuselagem Central' },
        discipline: { id: null, name: 'Estruturas' },
        document_type: { id: 'DWG', name: 'Desenho Técnico' },
        title: 'Título sugerido',
        description: '',
        area: { id: 4, name: 'Qualidade e Inspeção' },
      })

      const wrapper = mount(MetadataStep)
      await flushPromises()

      const fieldOf = (selector) => wrapper.find(selector).element.closest('.field')
      expect(fieldOf('#project').classList).toContain('field--suggested')
      expect(fieldOf('#title').classList).toContain('field--suggested')
      expect(fieldOf('#document-type').classList).toContain('field--suggested')
      expect(fieldOf('#areas').classList).toContain('field--suggested')
      expect(store.form.areas).toEqual(['QUA'])
      expect(fieldOf('#description').classList).not.toContain('field--suggested')
      expect(fieldOf('#discipline').classList).not.toContain('field--suggested')
      expect(store.form.disciplineId).toBe('')
      expect(wrapper.findAll('.ai-badge')).toHaveLength(4)
    })

    it('should wait for catalogs before applying suggestions', async () => {
      let releaseCatalogs
      const catalogsReady = new Promise((resolve) => {
        releaseCatalogs = resolve
      })
      store.projects = []
      store.disciplines = []
      vi.spyOn(store, 'loadCatalogs').mockImplementation(async () => {
        await catalogsReady
        store.projects = PROJECTS
        store.disciplines = DISCIPLINES
      })
      streamAnswering({
        project: { id: 1 },
        discipline: { id: 1 },
        title: 'Título sugerido',
      })

      mount(MetadataStep)
      await flushPromises()

      expect(streamDocumentSuggestions).not.toHaveBeenCalled()
      expect(store.form.title).toBe('')

      releaseCatalogs()
      await flushPromises()

      expect(streamDocumentSuggestions).toHaveBeenCalledWith('file-1', expect.anything())
      expect(store.form.title).toBe('Título sugerido')
      expect(store.form.projectId).toBe(1)
      expect(store.form.disciplineId).toBe(1)
    })

    it('should ignore a suggested project that is not in the catalog', async () => {
      streamAnswering({
        project: { id: 999 },
        discipline: { id: 1 },
        title: 'Título sugerido',
      })

      mount(MetadataStep)
      await flushPromises()

      expect(store.form.projectId).toBe('')
      expect(store.isFieldSuggested('projectId')).toBe(false)
    })

    it('should ignore a suggested area that is not in the catalog', async () => {
      streamAnswering({
        project: { id: 1, name: 'Aeroestrutura' },
        discipline: { id: 1, name: 'Estruturas' },
        document_type: { id: 'DWG', name: 'Desenho Técnico' },
        title: 'Título sugerido',
        description: 'Descrição sugerida',
        area: { id: null, name: 'Setor inexistente' },
      })

      mount(MetadataStep)
      await flushPromises()

      expect(store.form.areas).toEqual([])
      expect(store.isFieldSuggested('areas')).toBe(false)
    })

    it('should keep the form untouched and show no indicator when the AI returns nothing usable', async () => {
      streamAnswering({
        project: { id: null, name: '' },
        discipline: { id: null, name: '' },
        document_type: { id: null, name: '' },
        title: '',
        description: '',
        area: { id: null, name: '' },
      })

      const wrapper = mount(MetadataStep)
      await flushPromises()

      expect(wrapper.findAll('.ai-badge')).toHaveLength(0)
      expect(wrapper.findAll('.field--suggested')).toHaveLength(0)
      expect(store.form.title).toBe('')
      expect(store.form.projectId).toBe('')
    })

    it('should still show a validation error on a suggested field', async () => {
      store.applySuggestions({ title: 'Título sugerido' })
      store.serverErrors = { title: 'Título deve ter no máximo 255 caracteres.' }

      const wrapper = mount(MetadataStep)

      const titleField = wrapper.find('#title').element.closest('.field')
      expect(titleField.classList).toContain('field--suggested')
      expect(titleField.classList).toContain('field--invalid')
      const style = installFormFieldStyles()
      expect(getComputedStyle(wrapper.find('#title').element).borderColor).toBe('rgb(220, 38, 38)')
      style.remove()
      expect(titleField.textContent).toContain('Título deve ter no máximo 255 caracteres.')
    })

    it('should show a loading message while suggestions are being fetched', async () => {
      let resolveRequest
      streamDocumentSuggestions.mockReturnValue(
        new Promise((resolve) => {
          resolveRequest = resolve
        }),
      )

      const wrapper = mount(MetadataStep)
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Analisando o documento…')

      resolveRequest(null)
      await flushPromises()

      expect(wrapper.text()).not.toContain('Analisando o documento…')
    })

    it('should not show the loading or success message when the request fails', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      streamDocumentSuggestions.mockRejectedValue(new Error('boom'))

      const wrapper = mount(MetadataStep)
      await flushPromises()

      expect(wrapper.text()).not.toContain('Analisando o documento…')
      expect(wrapper.text()).not.toContain('Sugestões prontas')
      errorSpy.mockRestore()
    })

    it('should fill the classified fields before the title and description are ready', async () => {
      const stream = streamHeldOpen()
      const wrapper = mount(MetadataStep)
      await flushPromises()

      stream.emit({
        type: 'classification',
        suggestion: {
          discipline: { id: 1 },
          document_type: { id: 'DWG' },
          area: { id: 2, name: 'Qualidade e Inspeção' },
          title: null,
          description: null,
        },
      })
      await flushPromises()

      expect(store.form.disciplineId).toBe(1)
      expect(store.form.documentType).toBe('DWG')
      expect(store.form.areas).toEqual(['QUA'])
      expect(store.form.title).toBe('')
      expect(wrapper.text()).toContain('Escrevendo título e descrição…')
    })

    it('should grow the title and the description as the text arrives', async () => {
      const stream = streamHeldOpen()
      const wrapper = mount(MetadataStep)
      await flushPromises()

      stream.emit({ type: 'text', field: 'title', value: 'Memorial de' })
      await flushPromises()
      const firstTitle = wrapper.find('#title').element.value
      stream.emit({ type: 'text', field: 'title', value: 'Memorial de Cálculo' })
      stream.emit({ type: 'text', field: 'description', value: 'Dimensiona a longarina' })
      await flushPromises()

      expect(firstTitle).toBe('Memorial de')
      expect(wrapper.find('#title').element.value).toBe('Memorial de Cálculo')
      expect(store.form.description).toBe('Dimensiona a longarina')
      expect(store.isFieldSuggested('title')).toBe(true)
    })

    it('should replace the text in progress with the complete text when the stream ends', async () => {
      streamAnswering({ title: 'Título final', description: 'Descrição final' }, [
        { type: 'text', field: 'title', value: 'Título' },
      ])

      const wrapper = mount(MetadataStep)
      await flushPromises()

      expect(store.form.title).toBe('Título final')
      expect(store.form.description).toBe('Descrição final')
      expect(wrapper.text()).toContain('Sugestões prontas')
    })

    it('should lock every field the AI fills while the document is being classified', async () => {
      streamHeldOpen()

      const wrapper = mount(MetadataStep)
      await flushPromises()

      for (const id of AI_FILLED_FIELDS) {
        expect(wrapper.find(`#${id}`).element.disabled).toBe(true)
      }
      expect(wrapper.find('#author').element.disabled).toBe(false)
    })

    it('should release the classified fields and keep the text locked while the AI writes', async () => {
      const stream = streamHeldOpen()
      const wrapper = mount(MetadataStep)
      await flushPromises()

      stream.emit({ type: 'classification', suggestion: { discipline: { id: 1 } } })
      await flushPromises()

      expect(wrapper.find('#discipline').element.disabled).toBe(false)
      expect(wrapper.find('#title').element.disabled).toBe(true)
      expect(wrapper.find('#description').element.disabled).toBe(true)
      expect(busyFieldOf(wrapper, 'discipline')).toBeNull()
      expect(busyFieldOf(wrapper, 'title')).not.toBeNull()
      expect(busyFieldOf(wrapper, 'description')).not.toBeNull()
    })

    it('should release every field once the AI finishes', async () => {
      streamAnswering({ title: 'Título final', description: 'Descrição final' })

      const wrapper = mount(MetadataStep)
      await flushPromises()

      for (const id of AI_FILLED_FIELDS) {
        expect(wrapper.find(`#${id}`).element.disabled).toBe(false)
      }
      expect(wrapper.find('.field--busy').exists()).toBe(false)
    })

    it('should release every field when the generation fails', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const stream = streamHeldOpen()
      const wrapper = mount(MetadataStep)
      await flushPromises()

      stream.fail(new Error('boom'))
      await flushPromises()

      for (const id of AI_FILLED_FIELDS) {
        expect(wrapper.find(`#${id}`).element.disabled).toBe(false)
      }
      errorSpy.mockRestore()
    })

    it('should block the next step until the AI finishes writing', async () => {
      const stream = streamHeldOpen()
      const wrapper = mount(MetadataStep)
      await flushPromises()
      await wrapper.find('#author').setValue('João Silva')
      stream.emit({
        type: 'classification',
        suggestion: {
          project: { id: 1 },
          discipline: { id: 1 },
          document_type: { id: 'DWG' },
          area: { id: 2, name: 'Qualidade e Inspeção' },
        },
      })
      stream.emit({ type: 'text', field: 'title', value: 'Memorial de' })
      await flushPromises()
      const blockedWhileWriting = nextButton(wrapper).element.disabled

      stream.emit({ type: 'done', suggestion: { title: 'Memorial de Cálculo' } })
      await flushPromises()

      expect(store.isValid).toBe(true)
      expect(blockedWhileWriting).toBe(true)
      expect(nextButton(wrapper).element.disabled).toBe(false)
    })

    it('should hand the fields back when the user chooses to fill them manually', async () => {
      const stream = streamHeldOpen()
      const wrapper = mount(MetadataStep)
      await flushPromises()
      stream.emit({ type: 'text', field: 'title', value: 'Memorial de' })
      await flushPromises()

      await skipButton(wrapper).trigger('click')
      stream.emit({ type: 'text', field: 'title', value: 'Memorial de Cálculo' })
      await flushPromises()

      expect(stream.signal.aborted).toBe(true)
      expect(store.form.title).toBe('')
      expect(wrapper.find('#title').element.disabled).toBe(false)
      expect(wrapper.find('[role="status"]').exists()).toBe(false)
    })

    it('should clear a half-written title when the generation gives up', async () => {
      const stream = streamHeldOpen()
      mount(MetadataStep)
      await flushPromises()
      stream.emit({ type: 'text', field: 'title', value: 'Memorial de' })

      stream.emit({ type: 'done', suggestion: { title: null, description: null } })
      await flushPromises()

      expect(store.form.title).toBe('')
      expect(store.isFieldSuggested('title')).toBe(false)
    })

    it('should clear a half-written title when the connection drops before the end', async () => {
      const stream = streamHeldOpen()
      const wrapper = mount(MetadataStep)
      await flushPromises()
      stream.emit({ type: 'text', field: 'title', value: 'Memorial de' })

      stream.finish()
      await flushPromises()

      expect(store.form.title).toBe('')
      expect(wrapper.text()).not.toContain('Sugestões prontas')
      expect(wrapper.text()).not.toContain('Escrevendo título e descrição…')
    })

    it('should clear a half-written title when the server reports an error', async () => {
      const stream = streamHeldOpen()
      const wrapper = mount(MetadataStep)
      await flushPromises()
      stream.emit({ type: 'text', field: 'title', value: 'Memorial de' })

      stream.emit({ type: 'error', error: 'RuntimeError' })
      await flushPromises()

      expect(store.form.title).toBe('')
      expect(wrapper.text()).not.toContain('Sugestões prontas')
    })

    it('should cancel the request when the step is left', async () => {
      const stream = streamHeldOpen()
      const wrapper = mount(MetadataStep)
      await flushPromises()

      wrapper.unmount()

      expect(stream.signal.aborted).toBe(true)
    })

    it('should stay quiet when the request is cancelled', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const stream = streamHeldOpen()
      const wrapper = mount(MetadataStep)
      await flushPromises()

      stream.fail(Object.assign(new Error('aborted'), { name: 'AbortError' }))
      await flushPromises()

      expect(errorSpy).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('Analisando o documento…')
      errorSpy.mockRestore()
    })
  })
})
