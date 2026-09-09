import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DocumentUploadView from '../../src/views/DocumentUploadView.vue'
import { useDocumentFormStore } from '../../src/stores/documentFormStore'

vi.mock('../../src/api/projects', () => ({ listProjects: vi.fn() }))
vi.mock('../../src/api/disciplines', () => ({ listDisciplines: vi.fn() }))

import { listProjects } from '../../src/api/projects'
import { listDisciplines } from '../../src/api/disciplines'

const PROJECTS = [{ id: 1, code: 'PJT001', name: 'Projeto Alfa' }]
const DISCIPLINES = [{ id: 5, acronym: 'TUB', name: 'Tubulação' }]

describe('DocumentUploadView', () => {
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
    mount(DocumentUploadView)
    await flushPromises()
    // Then
    expect(listProjects).toHaveBeenCalled()
    expect(listDisciplines).toHaveBeenCalled()
    expect(store.form.author).toBe('João Silva')
  })

  it('should show Metadados as the current step', async () => {
    // When
    const wrapper = mount(DocumentUploadView)
    await flushPromises()
    // Then
    const current = wrapper.find('[aria-current="step"]')
    expect(current.text()).toContain('Metadados')
    expect(wrapper.text()).toContain('Informações do Documento')
    expect(wrapper.find('#project').text()).toContain('PJT001 - Projeto Alfa')
  })

  it('should not reload the catalogs when they are already in memory', async () => {
    // Given
    store.projects = PROJECTS
    store.disciplines = DISCIPLINES
    // When
    mount(DocumentUploadView)
    await flushPromises()
    // Then
    expect(listProjects).not.toHaveBeenCalled()
  })
})
