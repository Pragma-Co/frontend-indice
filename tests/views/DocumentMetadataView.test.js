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

const PROJECTS = [{ id: 1, code: 'AK-2100', name: 'Aeroestrutura de Fuselagem Central' }]
const DISCIPLINES = [{ id: 1, code: 'EST', name: 'Estruturas' }]

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
    expect(wrapper.find('#project').text()).toContain('AK-2100 - Aeroestrutura de Fuselagem Central')
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

  it('should go to the confirmation step when the valid form is submitted', async () => {
    // Given
    const wrapper = mount(DocumentMetadataView)
    await flushPromises()
    await wrapper.find('#project').setValue(1)
    await wrapper.find('#discipline').setValue(1)
    await wrapper.find('#document-type').setValue('DWG')
    await wrapper.find('#title').setValue('Desenho da fuselagem central')
    await wrapper.find('#areas').setValue('EST')
    // When
    await wrapper.find('form').trigger('submit')
    // Then
    expect(push).toHaveBeenCalledWith({ name: 'document-confirmation' })
    expect(store.form.title).toBe('Desenho da fuselagem central')
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
