import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DocumentConfirmationView from '../../src/views/DocumentConfirmationView.vue'
import { useDocumentFormStore } from '../../src/stores/documentFormStore'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('../../src/api/projects', () => ({ listProjects: vi.fn() }))
vi.mock('../../src/api/disciplines', () => ({ listDisciplines: vi.fn() }))

describe('DocumentConfirmationView', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useDocumentFormStore()
    vi.clearAllMocks()
    store.projects = [{ id: 1, code: 'PJT001', name: 'Projeto Alfa' }]
    store.disciplines = [{ id: 5, acronym: 'TUB', name: 'Tubulação' }]
  })

  it('should show Confirmação as the current step with the previous steps done', () => {
    // When
    const wrapper = mount(DocumentConfirmationView)
    // Then
    expect(wrapper.find('.step-circle.active').text()).toBe('3')
    expect(wrapper.findAll('.step-circle.done')).toHaveLength(2)
    expect(wrapper.text()).toContain('Resumo do Documento')
  })

  it('should summarise the metadata kept in the store', () => {
    // Given
    store.form.title = 'Relatório de ensaio'
    store.form.projectId = 1
    store.form.disciplineId = 5
    store.form.documentType = 'REV'
    // When
    const wrapper = mount(DocumentConfirmationView)
    // Then
    expect(wrapper.find('[data-testid="document-code"]').text()).toBe('PJT001-TUB-REV-REV01')
  })

  it('should go back to the metadata step keeping the form', async () => {
    // Given
    store.form.title = 'Mantido'
    const wrapper = mount(DocumentConfirmationView)
    // When
    await wrapper.findAll('button').find((b) => b.text() === 'Anterior').trigger('click')
    // Then
    expect(push).toHaveBeenCalledWith({ name: 'document-metadata' })
    expect(store.form.title).toBe('Mantido')
  })
})
