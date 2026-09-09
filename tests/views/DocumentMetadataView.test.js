import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DocumentMetadataView from '../../src/views/DocumentMetadataView.vue'
import { useDocumentFormStore } from '../../src/stores/documentFormStore'
import { useUploadStore } from '../../src/stores/uploadStore'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('../../src/api/projects', () => ({ listProjects: vi.fn() }))
vi.mock('../../src/api/disciplines', () => ({ listDisciplines: vi.fn() }))

import { listProjects } from '../../src/api/projects'
import { listDisciplines } from '../../src/api/disciplines'

const PROJECTS = [{ id: 1, code: 'PJT001', name: 'Projeto Alfa' }]
const DISCIPLINES = [{ id: 5, acronym: 'TUB', name: 'Tubulação' }]

describe('DocumentMetadataView', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useDocumentFormStore()
    vi.clearAllMocks()
    listProjects.mockResolvedValue(PROJECTS)
    listDisciplines.mockResolvedValue(DISCIPLINES)
  })

  it('should load the catalogs from the API and pre-fill the author on mount', async () => {
    // When
    mount(DocumentMetadataView)
    await flushPromises()
    // Then
    expect(listProjects).toHaveBeenCalled()
    expect(listDisciplines).toHaveBeenCalled()
    expect(store.form.author).toBe('João Silva')
  })

  it('should show Metadados as the current step with the form populated from the API', async () => {
    // When
    const wrapper = mount(DocumentMetadataView)
    await flushPromises()
    // Then
    const active = wrapper.find('.step-circle.active')
    expect(active.text()).toBe('2')
    expect(wrapper.text()).toContain('Informações do Documento')
    expect(wrapper.find('#project').text()).toContain('PJT001 - Projeto Alfa')
  })

  it('should list the files received from the upload step', async () => {
    // Given
    useUploadStore().setUploadedDocuments([{ id: 'up-1', name: 'relatorio.pdf', size: 10, typeLabel: 'Memorial' }])
    // When
    const wrapper = mount(DocumentMetadataView)
    await flushPromises()
    // Then
    expect(wrapper.find('[data-testid="uploaded-files"]').text()).toContain('relatorio.pdf')
  })

  it('should go back to the upload step without losing the form', async () => {
    // Given
    const wrapper = mount(DocumentMetadataView)
    await flushPromises()
    await wrapper.find('#title').setValue('Relatório de ensaio')
    // When
    await wrapper.findAll('button').find((b) => b.text() === 'Anterior').trigger('click')
    // Then
    expect(push).toHaveBeenCalledWith({ name: 'document-upload' })
    expect(store.form.title).toBe('Relatório de ensaio')
  })

  it('should not reload the catalogs when they are already in memory', async () => {
    // Given
    store.projects = PROJECTS
    store.disciplines = DISCIPLINES
    // When
    mount(DocumentMetadataView)
    await flushPromises()
    // Then
    expect(listProjects).not.toHaveBeenCalled()
  })
})
